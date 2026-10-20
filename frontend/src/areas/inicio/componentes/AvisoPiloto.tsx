import Link from "next/link";
import { IconoInfo } from "@/componentes/ui/iconos/iconos";

type PropsAvisoPiloto = {
  /**
   * `franja`: banda crema bajo el hero en escritorio (84:699).
   * `tarjeta`: vidrio dentro del hero en móvil (84:729).
   */
  variante: "franja" | "tarjeta";
  className?: string;
};

/** Aviso de piloto académico (DEC-78). El texto es el de `DEC-78 › detalles.texto_piloto` y el cierre de Figma. */
export function AvisoPiloto({ variante, className }: PropsAvisoPiloto) {
  const franja = variante === "franja";

  return (
    <aside
      aria-label="Aviso del piloto académico"
      data-fondo={franja ? "claro" : "oscuro"}
      className={[
        franja
          ? "items-center justify-center gap-3 bg-marca-crema px-6 py-[18px] text-marca-cafe lg:px-10"
          : "items-start gap-2 rounded-aviso border border-marca-crema/20 bg-marca-crema/8 px-3.5 py-3 text-marca-crema",
        "flex",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <IconoInfo
        className={franja ? "size-5 text-marca-bosque" : "mt-0.5 size-[18px] text-marca-menta"}
      />
      <p className={`font-titulo font-semibold ${franja ? "text-base" : "text-nota"}`}>
        Echo es un piloto académico de la UP Chiapas vigente hasta diciembre de 2026. Después, la
        plataforma se cierra y sus datos se anonimizan o eliminan.{" "}
        <Link
          href="/ayuda#cierre-del-piloto"
          className="font-bold whitespace-nowrap underline underline-offset-2 hover:decoration-2"
        >
          Saber más<span className="sr-only"> sobre el cierre del piloto</span>
        </Link>
      </p>
    </aside>
  );
}
