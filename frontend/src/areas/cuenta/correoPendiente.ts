/**
 * Correo recién registrado, para que «Revisa tu correo» (SCR-03) lo muestre y pueda reenviar el enlace sin volver a
 * pedirlo. Vive solo en la memoria de la página: nunca en la URL ni en el almacenamiento del navegador (el aviso de
 * privacidad dice que no guardamos datos personales ahí). Si se recarga la página, se pierde y SCR-03 pide el correo.
 */
let correoPendiente: string | null = null;

export function guardarCorreoPendiente(correo: string) {
  correoPendiente = correo;
}

export function leerCorreoPendiente() {
  return correoPendiente;
}
