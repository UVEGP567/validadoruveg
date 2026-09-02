# Validador de Documentos — UVEG (prototipo)

Prototipo funcional de un validador de documentos con código QR, con 10
documentos de prueba, pensado para desplegarse gratis en **GitHub + Vercel**
sin base de datos.

## ¿Por qué no necesitas Supabase para este prototipo?

La parte insegura de un validador "solo frontend" no es la interfaz — es que
si guardas los 10 documentos en un archivo JSON dentro de `public/`, ese
archivo es descargable por cualquiera (`tudominio.com/documentos.json`) y
expone los 10 registros completos, aunque tu formulario "solo busque uno".

Este proyecto lo resuelve sin necesidad de una base de datos real:

- `data/documentos.json` vive **fuera** de `public/`, así que nunca se sirve
  como archivo estático.
- La única forma de leerlo es a través de `api/validar.js`, una función
  serverless de Vercel que corre en el servidor, recibe folio + matrícula,
  y devuelve **solo** el documento que hace match (o un 404 si no existe).
- Nadie puede pedir "la lista completa"; la función no expone ese endpoint.

Si más adelante quieres que el equipo de la universidad pueda **editar**
documentos desde un panel (agregar, dar de baja, etc.) sin tocar código,
ahí sí conviene mover `documentos.json` a una tabla de Supabase (o
Postgres/Airtable) y que `api/validar.js` haga una consulta en vez de leer
el archivo. La estructura del endpoint no cambia, solo la fuente de datos.

## Seguridad incluida en el prototipo

- **Doble factor de búsqueda**: se exige folio *y* matrícula juntos, no solo
  uno, para dificultar que alguien "adivine" documentos por fuerza bruta.
- **Rate limiting básico** por IP en la función serverless (15 consultas por
  minuto). Es una primera capa; para producción real se recomienda
  Vercel KV / Upstash para que el límite persista entre invocaciones.
- **`robots.txt` + cabeceras `X-Robots-Tag: noindex`** para que Google no
  indexe ni cachee páginas con datos personales de egresados.
- **Respuesta con whitelist de campos**: la API solo devuelve los campos que
  se muestran en pantalla, nunca el objeto completo del JSON.
- **Cabeceras de seguridad** (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`) configuradas en `vercel.json`.
- **HTTPS automático** al desplegar en Vercel.
- Los datos de prueba están inventados; ningún documento es real.

### Siguientes pasos de seguridad si esto deja de ser un prototipo

- Agregar reCAPTCHA/hCaptcha al formulario para bloquear bots.
- Mover el límite de intentos a Vercel KV para que sea persistente.
- Firmar los folios (HMAC) para que no sean simples cadenas secuenciales.
- Registrar auditoría de consultas (qué IP consultó qué folio y cuándo).

## Estructura del proyecto

```
uveg-validador/
├── api/
│   └── validar.js          # Función serverless (Vercel)
├── data/
│   └── documentos.json     # 10 documentos de prueba (NO público)
├── public/
│   ├── index.html           # Formulario de búsqueda
│   ├── validar.html         # Página de resultado
│   ├── style.css            # Estilos con identidad UVEG
│   ├── logo-uveg.png         # Logo institucional
│   └── robots.txt
├── scripts/
│   └── generar-qr.js        # Genera un PNG de QR por documento
├── package.json
├── vercel.json
└── README.md
```

## Cómo probarlo en tu computadora

Necesitas tener [Vercel CLI](https://vercel.com/docs/cli) instalado
(`npm i -g vercel`), porque `api/validar.js` es una función serverless y no
funciona si solo abres el `index.html` con doble clic.

```bash
npm install
vercel dev
```

Esto levanta el sitio en `http://localhost:3000`. Prueba con, por ejemplo:

- Folio: `PRSO202504827`
- Matrícula: `ec19028054`

(Los 11 folios y matrículas de prueba están en `data/documentos.json`.)

Documento con campos extra (CCT, periodo escolar, observaciones), basado en
una Constancia de Terminación de Estudios real:

- Folio: `DCE-OFICEN-607-000673-26`
- Matrícula: `22016299`

## Subir a GitHub

```bash
cd uveg-validador
git init
git add .
git commit -m "Prototipo validador de documentos UVEG"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/uveg-validador.git
git push -u origin main
```

## Desplegar en Vercel

**Opción A — desde el dashboard (más fácil):**
1. Entra a https://vercel.com/new
2. Importa el repositorio de GitHub que acabas de subir.
3. Vercel detecta automáticamente `api/` y `public/`; no necesitas configurar
   nada más ("Framework Preset: Other" está bien).
4. Deploy. En un par de minutos tendrás una URL tipo
   `https://uveg-validador.vercel.app`.

**Opción B — desde la terminal:**
```bash
npm i -g vercel
vercel login
vercel        # despliegue de prueba
vercel --prod # despliegue final
```

## Generar los códigos QR (uno por documento)

Una vez que tengas tu dominio de Vercel:

```bash
npm install
node scripts/generar-qr.js https://uveg-validador.vercel.app
```

Esto crea 10 imágenes PNG en `scripts/qr-generados/`, cada una apuntando a
la URL exacta de validación de ese documento
(`/validar.html?folio=...&matricula=...`). Puedes imprimir ese QR en el PDF
real del documento (constancia, título, etc.) para que, al escanearlo,
la persona caiga directo en el resultado ya prellenado.

## Personalizar

- Colores institucionales: variables CSS al inicio de `public/style.css`
  (`--azul-uveg`, `--azul-uveg-oscuro`, etc.).
- Reemplaza `public/logo-uveg.png` por el logo oficial en alta resolución
  si el que se usó aquí es de baja calidad.
- Agrega/edita documentos de prueba en `data/documentos.json`.
