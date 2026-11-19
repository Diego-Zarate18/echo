type PropsBarraProgreso = {
  /** Porcentaje de 0 a 100. */
  valor: number;
  /** Nombre para lectores de pantalla («Avance del módulo 1»). El porcentaje visible va aparte, junto a la barra. */
  etiqueta: string;
  /** `claro`: pista café tenue y relleno bosque sobre tarjetas. `oscuro`: pista crema tenue y relleno menta sobre café. */
  tono?: "claro" | "oscuro";
  className?: string;
};

const tonos = {
  claro: { pista: "bg-marca-cafe/12", relleno: "bg-marca-bosque" },
  oscuro: { pista: "bg-marca-crema/22", relleno: "bg-marca-menta" },
} as const;

/** Barra de avance de 10 px. El valor se trunca para no marcar 100 % antes de terminar. */
export function BarraProgreso({ valor, etiqueta, tono = "claro", className }: PropsBarraProgreso) {
  const acotado = Math.min(100, Math.max(0, valor));
  const estilo = tonos[tono];
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(acotado)}
      className={["h-2.5 w-full overflow-hidden rounded-full", estilo.pista, className].filter(Boolean).join(" ")}
    >
      <div
        className={`h-full rounded-full ${estilo.relleno} transition-[width] duration-500 ease-(--ease-llegada) motion-reduce:transition-none`}
        style={{ width: `${acotado}%` }}
      />
    </div>
  );
}
