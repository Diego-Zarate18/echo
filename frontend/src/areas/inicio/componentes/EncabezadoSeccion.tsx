type PropsEncabezadoSeccion = {
  /** Id del `h2`, al que apunta `aria-labelledby` de la sección. */
  id: string;
  titulo: string;
  entrada: string;
  tono: "claro" | "oscuro";
  /** Proporción de Figma: título de 780 px con entrada de 440, o título de 640 con entrada de 560. */
  proporcion: "titulo-amplio" | "entrada-amplia";
};

/** Título de sección con su entrada alineada abajo a la derecha (84:561, 84:611, 84:649). */
export function EncabezadoSeccion({ id, titulo, entrada, tono, proporcion }: PropsEncabezadoSeccion) {
  const oscuro = tono === "oscuro";
  const tituloAmplio = proporcion === "titulo-amplio";
  return (
    <div className="revelar flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-12 xl:gap-24">
      <h2
        id={id}
        className={[
          "font-titulo text-seccion font-extrabold text-balance lg:min-w-0 lg:flex-1",
          tituloAmplio ? "xl:max-w-[780px]" : "xl:max-w-[640px]",
          oscuro ? "text-marca-crema" : "text-marca-cafe",
        ].join(" ")}
      >
        {titulo}
      </h2>
      <p
        className={[
          "max-w-[60ch] text-amplio lg:shrink-0",
          tituloAmplio ? "lg:w-[40%] xl:w-[440px]" : "lg:w-[48%] xl:w-[560px]",
          oscuro ? "text-marca-crema" : "text-texto-secundario",
        ].join(" ")}
      >
        {entrada}
      </p>
    </div>
  );
}
