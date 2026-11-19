type PropsEncabezadoSeccion = {
  /** Id del `h2`, al que apunta `aria-labelledby` de la sección. */
  id: string;
  titulo: string;
  entrada: string;
  tono: "claro" | "oscuro";
  /**
   * Proporción de Figma: título de 780 px con entrada de 440, o título de 640 con entrada de 560.
   * `apilada`: la entrada va debajo del título. El título queda arriba, así que nada de la sección
   * asoma por encima de él bajo el encabezado fijo (se usa en la sección compacta «Qué encontrarás»).
   */
  proporcion: "titulo-amplio" | "entrada-amplia" | "apilada";
};

/** Título de sección con su entrada alineada abajo a la derecha (84:561, 84:611, 84:649) o debajo. */
export function EncabezadoSeccion({ id, titulo, entrada, tono, proporcion }: PropsEncabezadoSeccion) {
  const oscuro = tono === "oscuro";
  const tituloAmplio = proporcion === "titulo-amplio";
  const apilada = proporcion === "apilada";
  return (
    <div
      className={
        apilada
          ? "flex flex-col gap-3"
          : "flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-12 xl:gap-24"
      }
    >
      <h2
        id={id}
        className={[
          "font-titulo text-seccion font-extrabold text-balance",
          apilada ? "" : "lg:min-w-0 lg:flex-1",
          apilada || tituloAmplio ? "xl:max-w-[780px]" : "xl:max-w-[640px]",
          oscuro ? "text-marca-crema" : "text-marca-cafe",
        ].join(" ")}
      >
        {titulo}
      </h2>
      <p
        className={[
          "text-amplio",
          apilada
            ? "max-w-[80ch]"
            : tituloAmplio
              ? "max-w-[60ch] lg:w-[40%] lg:shrink-0 xl:w-[440px]"
              : "max-w-[60ch] lg:w-[48%] lg:shrink-0 xl:w-[560px]",
          oscuro ? "text-marca-crema" : "text-texto-secundario",
        ].join(" ")}
      >
        {entrada}
      </p>
    </div>
  );
}
