import type { ReactNode, Ref } from "react";
import { IconoAlerta, IconoInfo, IconoSobre } from "@/componentes/ui/iconos/iconos";

/**
 * Tonos de Figma:
 * - `error`: Alerta/Error (66:44), borde y título riesgosa. `role="alert"`; al fallar el envío recibe el foco.
 * - `correo`: Alerta/Info (66:59) con el sobre, borde y título bosque. `role="status"`.
 * - `aviso`: la misma Alerta/Info con el ícono de información, para avisos que no son de correo.
 * No existe la Alerta/Aviso «Tu cuenta está en pausa» con hora: la prohíben DEC-77 e INV-28.
 */
export type TonoAlerta = "error" | "correo" | "aviso";

const estilos: Record<TonoAlerta, { borde: string; titulo: string; icono: ReactNode }> = {
  error: {
    borde: "border-estado-riesgosa",
    titulo: "text-estado-riesgosa",
    icono: <IconoAlerta className="size-[22px] text-estado-riesgosa" />,
  },
  correo: {
    borde: "border-marca-bosque",
    titulo: "text-marca-bosque",
    icono: <IconoSobre className="size-[22px] text-marca-bosque" />,
  },
  aviso: {
    borde: "border-marca-bosque",
    titulo: "text-marca-bosque",
    icono: <IconoInfo className="size-[22px] text-marca-bosque" />,
  },
};

type PropsAlerta = {
  tono: TonoAlerta;
  titulo?: string;
  children?: ReactNode;
  /** `alert` para errores; `status` para avisos (Figma 69:930). */
  role: "alert" | "status";
  id?: string;
  /** Para darle el foco al fallar el envío. */
  ref?: Ref<HTMLDivElement>;
  className?: string;
};

/**
 * Recuadro de error o aviso sobre crema: ícono y texto, nunca solo color. Sin nombre propio (`aria-labelledby`): al
 * recibir el foco, el lector de pantalla lee el título y el mensaje completos.
 */
export function Alerta({ tono, titulo, children, role, id, ref, className }: PropsAlerta) {
  const estilo = estilos[tono];
  return (
    <div
      ref={ref}
      id={id}
      role={role}
      tabIndex={-1}
      className={[
        "flex w-full animate-alerta items-start gap-3 rounded-fila border-[1.5px] bg-superficie-elevada py-3.5 pr-[18px] pl-4 text-marca-cafe",
        estilo.borde,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {estilo.icono}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {titulo ? (
          <p className={`font-titulo text-menor font-bold ${estilo.titulo}`}>
            {titulo}
          </p>
        ) : null}
        <div className="text-detalle leading-[1.45]">{children}</div>
      </div>
    </div>
  );
}
