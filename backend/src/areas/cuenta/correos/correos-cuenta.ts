import type { ContenidoCorreo } from '../../../infraestructura/correo/plantilla';

/**
 * Textos de los correos de la cuenta (DEC-79). La plantilla pone el logo, el formato y la versión de texto plano.
 * REQUIERE REVISIÓN HUMANA: redacción propuesta, sin revisar con el equipo.
 */
export function correoVerificacion(
  nombre: string,
  url: string,
): ContenidoCorreo {
  return {
    asunto: 'Confirma tu correo para entrar a Echo',
    titulo: 'Confirma tu correo',
    parrafos: [
      `Hola, ${nombre}. Para activar tu cuenta de Echo, confirma que este correo es tuyo.`,
      'Si no creaste una cuenta en Echo, ignora este mensaje: la cuenta sin confirmar se borra sola.',
    ],
    accion: {
      texto: 'Confirmar mi correo',
      url,
      vigencia: 'Este enlace vence en 24 horas y solo funciona una vez.',
    },
  };
}

export function correoRecuperacion(
  nombre: string,
  url: string,
): ContenidoCorreo {
  return {
    asunto: 'Restablece tu contraseña de Echo',
    titulo: 'Restablece tu contraseña',
    parrafos: [
      `Hola, ${nombre}. Recibimos una solicitud para restablecer la contraseña de tu cuenta de Echo.`,
      'Si no la pediste, ignora este mensaje: tu contraseña no cambia.',
    ],
    accion: {
      texto: 'Elegir una contraseña nueva',
      url,
      vigencia: 'Este enlace vence en 30 minutos y solo funciona una vez.',
    },
  };
}

/**
 * Se manda cuando alguien intenta registrarse con un correo que ya tiene cuenta (DEC-77). Si la cuenta tiene
 * contraseña, lleva a Recuperar contraseña; si entra con Google, indica entrar con Google.
 */
export function correoYaTienesCuenta(
  nombre: string,
  conContrasena: boolean,
  origenFrontend: string,
): ContenidoCorreo {
  const parrafos = [
    `Hola, ${nombre}. Alguien intentó crear una cuenta en Echo con este correo, pero ya tienes una.`,
  ];
  if (conContrasena) {
    parrafos.push('Si olvidaste tu contraseña, puedes elegir una nueva.');
  } else {
    parrafos.push(
      'Tu cuenta entra con Google: en la página de inicio de sesión, elige «Entrar con Google».',
    );
  }
  parrafos.push('Si no fuiste tú, no tienes que hacer nada.');
  return {
    asunto: 'Ya tienes una cuenta en Echo',
    titulo: 'Ya tienes una cuenta',
    parrafos,
    accion: conContrasena
      ? {
          texto: 'Restablecer mi contraseña',
          url: `${origenFrontend}/recuperar-contrasena`,
        }
      : {
          texto: 'Ir a iniciar sesión',
          url: `${origenFrontend}/iniciar-sesion`,
        },
  };
}

/** Al correo nuevo: enlace para confirmar el cambio (OP-11). */
export function correoCambioCorreo(
  nombre: string,
  url: string,
): ContenidoCorreo {
  return {
    asunto: 'Confirma tu correo nuevo en Echo',
    titulo: 'Confirma tu correo nuevo',
    parrafos: [
      `Hola, ${nombre}. Pediste usar esta dirección para tu cuenta de Echo. Confírmala para terminar el cambio.`,
      'Si no lo pediste, ignora este mensaje: tu cuenta sigue con el correo de antes.',
    ],
    accion: {
      texto: 'Confirmar mi correo nuevo',
      url,
      vigencia: 'Este enlace vence en 30 minutos y solo funciona una vez.',
    },
  };
}

/**
 * Al correo nuevo cuando ya tiene cuenta: la respuesta al alumno es la misma (DEC-77) y aquí no se nombra la
 * cuenta que pidió el cambio.
 */
export function correoAvisoCambioCorreo(
  origenFrontend: string,
): ContenidoCorreo {
  return {
    asunto: 'Intento de usar este correo en Echo',
    titulo: 'Este correo ya tiene una cuenta',
    parrafos: [
      'Alguien intentó cambiar el correo de una cuenta de Echo a esta dirección. Como ya tiene una cuenta, no se hizo ningún cambio.',
      'Si no fuiste tú, no tienes que hacer nada.',
    ],
    accion: {
      texto: 'Ir a iniciar sesión',
      url: `${origenFrontend}/iniciar-sesion`,
    },
  };
}
