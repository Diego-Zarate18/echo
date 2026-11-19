/** Primer elemento enfocable de cada página: lleva el foco al `<main id="contenido">`. */
export function SaltarAlContenido() {
  return (
    <a
      href="#contenido"
      className="sr-only rounded-full bg-marca-crema px-5 py-3 font-titulo text-base font-bold text-marca-cafe shadow-vidrio focus:not-sr-only focus:fixed focus:top-6 focus:left-6 focus:z-50 focus-visible:outline-marca-menta"
    >
      Saltar al contenido
    </a>
  );
}
