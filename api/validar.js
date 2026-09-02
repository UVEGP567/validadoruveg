// api/validar.js
// Esta función corre EN EL SERVIDOR de Vercel, no en el navegador.
// El archivo data/documentos.json nunca se envía completo al cliente:
// solo se devuelve el registro que coincide exactamente con la consulta.

const documentos = require("../data/documentos.json");

// --- Rate limiting muy simple en memoria (por IP) ---
// Nota: en Vercel (serverless) cada instancia tiene su propia memoria,
// así que esto es una capa básica anti-abuso para el prototipo, no una
// solución de producción. Para producción real usar Vercel KV / Upstash.
const intentos = new Map();
const LIMITE = 15; // consultas
const VENTANA_MS = 60 * 1000; // por minuto

function limitado(ip) {
  const ahora = Date.now();
  const registro = intentos.get(ip) || { count: 0, inicio: ahora };
  if (ahora - registro.inicio > VENTANA_MS) {
    registro.count = 0;
    registro.inicio = ahora;
  }
  registro.count += 1;
  intentos.set(ip, registro);
  return registro.count > LIMITE;
}

function normaliza(str) {
  return String(str || "").trim().toLowerCase();
}

module.exports = (req, res) => {
  // Solo permitir GET
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "desconocida";

  if (limitado(ip)) {
    res.status(429).json({ error: "Demasiadas solicitudes, intenta más tarde." });
    return;
  }

  const folio = normaliza(req.query.folio);
  const matricula = normaliza(req.query.matricula);

  // Se exige AMBOS datos (folio + matrícula) para dificultar
  // la enumeración/scraping de documentos por fuerza bruta.
  if (!folio || !matricula) {
    res.status(400).json({ error: "Folio y matrícula son requeridos." });
    return;
  }

  const encontrado = documentos.find(
    (d) => normaliza(d.folio) === folio && normaliza(d.matricula) === matricula
  );

  // Headers para que esta respuesta no quede cacheada ni indexada
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (!encontrado) {
    res.status(404).json({ error: "No se encontró ningún documento con esos datos." });
    return;
  }

  // Solo se devuelven los campos necesarios para mostrar (whitelist),
  // nunca el objeto completo "por si acaso" tuviera campos internos.
  // Campos base, presentes en todos los tipos de documento:
  const respuesta = {
    matricula: encontrado.matricula,
    nombreCompleto: encontrado.nombreCompleto,
    folio: encontrado.folio,
    tipoDocumento: encontrado.tipoDocumento,
    fechaExpedicion: encontrado.fechaExpedicion,
    unidadEmisora: encontrado.unidadEmisora,
    programaEstudio: encontrado.programaEstudio,
    estatus: encontrado.estatus,
  };

  // Campos opcionales, propios de ciertos tipos de documento
  // (ej. Constancia de Terminación de Estudios trae CCT y periodo escolar).
  // Solo se agregan si existen en el registro, así los demás documentos
  // no muestran campos vacíos.
  const OPCIONALES = ["cct", "periodoEscolar", "observaciones"];
  for (const campo of OPCIONALES) {
    if (encontrado[campo]) respuesta[campo] = encontrado[campo];
  }

  res.status(200).json(respuesta);
};
