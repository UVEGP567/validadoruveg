// scripts/generar-qr.js
// Genera un PNG de código QR por cada documento de prueba.
// Cada QR apunta a: https://TU-DOMINIO/index.php?folio=...&validador=...
// (index.php es un rewrite hacia validar.html configurado en vercel.json,
// para que la URL se vea igual que la del sistema real de la UVEG)
//
// Uso:
//   1) npm install qrcode
//   2) node scripts/generar-qr.js https://tu-proyecto.vercel.app
//
// Los PNG se guardan en scripts/qr-generados/

const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const documentos = require("../data/documentos.json");

const dominio = process.argv[2];

if (!dominio) {
  console.error("Falta el dominio. Ejemplo:");
  console.error("  node scripts/generar-qr.js https://tu-proyecto.vercel.app");
  process.exit(1);
}

const salida = path.join(__dirname, "qr-generados");
if (!fs.existsSync(salida)) fs.mkdirSync(salida);

async function generarTodos() {
  for (const doc of documentos) {
    const url =
      dominio.replace(/\/$/, "") +
      "/index.php?" +
      new URLSearchParams({ folio: doc.folio, validador: doc.codigoValidador }).toString();

    const archivo = path.join(salida, `${doc.folio}.png`);
    await QRCode.toFile(archivo, url, { width: 400, margin: 2 });
    console.log("Generado:", archivo, "->", url);
  }
  console.log(`\nListo. ${documentos.length} códigos QR generados en scripts/qr-generados/`);
}

generarTodos();
