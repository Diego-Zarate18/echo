/**
 * Plantilla única de correo (DEC-79): HTML con versión de texto plano, en español, logo con texto alternativo,
 * la vigencia del enlace escrita y sin píxeles de rastreo. Cada tipo de correo solo cambia el texto.
 */
export interface ContenidoCorreo {
  asunto: string;
  titulo: string;
  parrafos: string[];
  /** Botón con el enlace. La vigencia se escribe debajo (por ejemplo, «Este enlace vence en 24 horas.»). */
  accion?: { texto: string; url: string; vigencia?: string };
}

export interface CorreoArmado {
  asunto: string;
  html: string;
  texto: string;
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function armarCorreo(
  contenido: ContenidoCorreo,
  origenFrontend: string,
): CorreoArmado {
  const { asunto, titulo, parrafos, accion } = contenido;
  const logo = `${origenFrontend}/marca/logo-echo-claro.png`;

  const parrafosHtml = parrafos
    .map(
      (parrafo) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#1f2933;">${escapar(parrafo)}</p>`,
    )
    .join('\n');

  const accionHtml = accion
    ? `<p style="margin:24px 0 16px;">
  <a href="${escapar(accion.url)}" style="display:inline-block;padding:12px 24px;background:#1f2933;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:6px;">${escapar(accion.texto)}</a>
</p>
${accion.vigencia ? `<p style="margin:0 0 16px;font-size:14px;line-height:20px;color:#52606d;">${escapar(accion.vigencia)}</p>` : ''}
<p style="margin:0 0 16px;font-size:14px;line-height:20px;color:#52606d;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>${escapar(accion.url)}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(asunto)}</title>
</head>
<body style="margin:0;padding:24px;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border-radius:8px;">
<img src="${escapar(logo)}" alt="Echo" height="40" style="display:block;margin:0 0 24px;height:40px;width:auto;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:28px;color:#1f2933;">${escapar(titulo)}</h1>
${parrafosHtml}
${accionHtml}
</div>
</body>
</html>`;

  const lineas = [titulo, '', ...parrafos.flatMap((parrafo) => [parrafo, ''])];
  if (accion) {
    lineas.push(`${accion.texto}: ${accion.url}`);
    if (accion.vigencia) lineas.push(accion.vigencia);
    lineas.push('');
  }
  lineas.push('Echo');

  return { asunto, html, texto: lineas.join('\n') };
}
