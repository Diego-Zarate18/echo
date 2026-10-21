// Genera los íconos de la app (favicon e ícono de Apple) a partir de public/marca/moris-principal.png.
//
// Recorta la cabeza completa de Moris con sus hojas (sin brazos ni pies), la centra en un cuadrado con 12 % de
// margen y la dibuja en un `canvas` de Chromium (Playwright, ya instalado): sin dependencias nuevas.
//
// Uso, desde frontend/:
//   node scripts/generar-iconos.mjs                      genera los íconos en src/app/
//   node scripts/generar-iconos.mjs --captura <ruta>     además, compara los íconos a 16, 32 y 180 px
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const ORIGEN = `${raiz}public/marca/moris-principal.png`;
const MARGEN = 0.12;
const CREMA = "#fbf3e9";

/**
 * Íconos que se generan. Next toma `icon.png`, `icon1.png`… y `apple-icon.png` de src/app y escribe sus
 * etiquetas <link> con el tamaño de cada archivo.
 * - Favicon: fondo transparente. Sobre la tarjeta terracota de Figma el cuerpo de Moris (también terracota)
 *   se pierde y a 16 px solo se ve un cuadro; sin fondo se lee la silueta en pestañas claras y oscuras.
 * - Apple: iOS rellena de negro lo transparente, así que va sobre una tarjeta crema (el fondo de la marca).
 *   iOS redondea las esquinas por su cuenta.
 */
const ICONOS = [
  { archivo: "src/app/icon.png", lado: 32, fondo: null },
  { archivo: "src/app/icon1.png", lado: 48, fondo: null },
  { archivo: "src/app/apple-icon.png", lado: 180, fondo: CREMA },
];

/** Corre en el navegador: recorta la cabeza, la centra con margen y devuelve cada ícono como PNG en base64. */
async function dibujarEnNavegador({ origen, iconos, margen }) {
  const imagen = new Image();
  imagen.src = origen;
  await imagen.decode();
  const { naturalWidth: ancho, naturalHeight: alto } = imagen;

  const lienzo = new OffscreenCanvas(ancho, alto);
  const contexto = lienzo.getContext("2d");
  contexto.drawImage(imagen, 0, 0);
  const pixeles = contexto.getImageData(0, 0, ancho, alto);
  const { data } = pixeles;

  // Brazos y pies son de un café más oscuro que la cabeza (≈ 157,85,41 y 142,74,35 contra 179,100,52).
  // Los ojos, la boca y las hojas no entran en ese rango.
  function esExtremidad(i) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    return r > 130 && r < 172 && g > 65 && g < 95 && b < 48;
  }

  // La cabeza es lo que se alcanza desde el centro del cuerpo sin cruzar lo transparente ni las
  // extremidades: el cuerpo con su rostro y las hojas, que nacen de él.
  const cabeza = new Uint8Array(ancho * alto);
  const pendientes = [Math.round(alto * 0.6) * ancho + Math.round(ancho / 2)];
  while (pendientes.length > 0) {
    const p = pendientes.pop();
    if (cabeza[p] || data[p * 4 + 3] <= 24 || esExtremidad(p * 4)) continue;
    cabeza[p] = 1;
    const x = p % ancho;
    if (x > 0) pendientes.push(p - 1);
    if (x < ancho - 1) pendientes.push(p + 1);
    if (p >= ancho) pendientes.push(p - ancho);
    if (p < ancho * (alto - 1)) pendientes.push(p + ancho);
  }

  // Se borra lo demás y se mide la caja de la cabeza.
  const caja = { x: ancho, y: alto, derecha: 0, abajo: 0 };
  for (let p = 0; p < ancho * alto; p++) {
    if (!cabeza[p]) {
      data[p * 4 + 3] = 0;
      continue;
    }
    const x = p % ancho;
    const y = (p - x) / ancho;
    caja.x = Math.min(caja.x, x);
    caja.y = Math.min(caja.y, y);
    caja.derecha = Math.max(caja.derecha, x + 1);
    caja.abajo = Math.max(caja.abajo, y + 1);
  }
  contexto.putImageData(pixeles, 0, 0);
  caja.ancho = caja.derecha - caja.x;
  caja.alto = caja.abajo - caja.y;

  // Cabeza en un cuadrado del lado mayor, centrada y sin deformar.
  const lado = Math.max(caja.ancho, caja.alto);
  const cuadro = new OffscreenCanvas(lado, lado);
  cuadro
    .getContext("2d")
    .drawImage(lienzo, caja.x, caja.y, caja.ancho, caja.alto, (lado - caja.ancho) / 2, (lado - caja.alto) / 2, caja.ancho, caja.alto);

  // Reducción por mitades: un solo paso de 1300 a 32 px pierde los bordes de las hojas.
  function reducir(fuente, destino) {
    let actual = fuente;
    while (actual.width / 2 > destino) {
      const mitad = new OffscreenCanvas(Math.round(actual.width / 2), Math.round(actual.height / 2));
      const c = mitad.getContext("2d");
      c.imageSmoothingQuality = "high";
      c.drawImage(actual, 0, 0, mitad.width, mitad.height);
      actual = mitad;
    }
    return actual;
  }

  const resultados = [];
  for (const { lado: n, fondo } of iconos) {
    const icono = new OffscreenCanvas(n, n);
    const c = icono.getContext("2d");
    if (fondo) {
      c.fillStyle = fondo;
      c.fillRect(0, 0, n, n);
    }
    const interior = n * (1 - 2 * margen);
    const fuente = reducir(cuadro, interior);
    c.imageSmoothingQuality = "high";
    c.drawImage(fuente, n * margen, n * margen, interior, interior);
    const blob = await icono.convertToBlob({ type: "image/png" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binario = "";
    for (const byte of bytes) binario += String.fromCharCode(byte);
    resultados.push(btoa(binario));
  }
  return { caja, resultados };
}

const comoDataUrl = (bytes) => `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;

const indiceCaptura = process.argv.indexOf("--captura");
const rutaCaptura = indiceCaptura > 0 ? process.argv[indiceCaptura + 1] : null;

const navegador = await chromium.launch();
try {
  const pagina = await navegador.newPage();
  // Los íconos anteriores, para la comparación (se leen antes de sobrescribirlos).
  const anteriores = rutaCaptura
    ? { favicon: await readFile(`${raiz}src/app/icon.png`), apple: await readFile(`${raiz}src/app/apple-icon.png`) }
    : null;

  const { caja, resultados } = await pagina.evaluate(dibujarEnNavegador, {
    origen: comoDataUrl(await readFile(ORIGEN)),
    iconos: ICONOS.map(({ lado, fondo }) => ({ lado, fondo })),
    margen: MARGEN,
  });
  console.log(`Cabeza recortada: ${caja.ancho} × ${caja.alto} px desde (${caja.x}, ${caja.y})`);
  for (const [i, { archivo, lado }] of ICONOS.entries()) {
    await writeFile(`${raiz}${archivo}`, Buffer.from(resultados[i], "base64"));
    console.log(`${archivo}: ${lado} × ${lado}`);
  }

  if (rutaCaptura && anteriores) {
    const [favicon, favicon48, apple] = resultados.map((b) => `data:image/png;base64,${b}`);
    const fila = (titulo, f16, f32, a180) => `
      <div class="fila"><h2>${titulo}</h2>
        ${[CREMA, "#202124"]
          .map(
            (fondo) => `<div class="muestra" style="background:${fondo}">
              <img src="${f16}" width="16" height="16"><img src="${f32}" width="32" height="32">
              <img src="${a180}" width="180" height="180" style="border-radius:40px"></div>`,
          )
          .join("")}
      </div>`;
    await pagina.setViewportSize({ width: 1040, height: 560 });
    await pagina.setContent(`<!doctype html><style>
      body{margin:0;padding:24px;font:600 15px system-ui;background:#fff;color:${"#3d2213"}}
      .fila{display:flex;align-items:center;gap:24px;margin-bottom:24px}
      h2{width:150px;font-size:15px;margin:0}
      .muestra{display:flex;align-items:center;gap:20px;padding:20px 24px;border-radius:16px}
      img{image-rendering:auto}
      p{margin:0 0 16px;color:#6b4a36;font-weight:400}
    </style>
    <p>16, 32 y 180 px, sobre crema y sobre una pestaña oscura. El de 48 px (${ICONOS[1].archivo}) va entre ambos.</p>
    ${fila("Antes (Figma 24:53 / 24:47)", comoDataUrl(anteriores.favicon), comoDataUrl(anteriores.favicon), comoDataUrl(anteriores.apple))}
    ${fila("Ahora", favicon, favicon, apple)}
    <div class="fila"><h2>Ahora, 48 px</h2><div class="muestra" style="background:${CREMA}"><img src="${favicon48}" width="48" height="48"></div>
      <div class="muestra" style="background:#202124"><img src="${favicon48}" width="48" height="48"></div></div>`);
    await pagina.screenshot({ path: rutaCaptura, fullPage: true });
    console.log(`Comparación: ${rutaCaptura}`);
  }
} finally {
  await navegador.close();
}
