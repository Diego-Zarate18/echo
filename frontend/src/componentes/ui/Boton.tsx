import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { IconoFlechaDiagonal } from "@/componentes/ui/iconos/iconos";

/**
 * Variantes de Figma:
 * - `crema`: Botón/Crema (60:346), principal sobre fondo oscuro. Café sobre crema 13.3:1.
 * - `contorno`: Botón/Contorno sobre oscuro (45:125), secundario sobre fondo oscuro.
 * - `cafe`: Botón/Café (66:35), principal sobre fondo claro. Crema sobre café 13.3:1.
 */
export type VarianteBoton = "crema" | "contorno" | "cafe";
export type TamanoBoton = "mediano" | "grande";

type PropsComunes = {
  variante: VarianteBoton;
  /** `mediano` mide 48 px de alto (encabezado); `grande`, 56 px. */
  tamano?: TamanoBoton;
  /** Círculo café con la flecha diagonal; solo en la variante `crema`. */
  conFlecha?: boolean;
  className?: string;
  children: ReactNode;
};

type PropsEnlace = PropsComunes & {
  /** Ruta interna (`/registro`) o ancla de la misma página (`#que-encontraras`). */
  href: string;
  onClick?: () => void;
};

type PropsBoton = PropsComunes &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

const base =
  "group inline-flex shrink-0 items-center rounded-full font-titulo text-base font-bold whitespace-nowrap transition-colors duration-150 motion-safe:active:scale-[0.98]";

const variantes: Record<VarianteBoton, string> = {
  crema: "bg-marca-crema text-marca-cafe hover:bg-superficie-elevada",
  contorno:
    "justify-center border-[1.5px] border-marca-crema px-7 text-marca-crema hover:bg-marca-crema/8",
  cafe: "justify-center bg-marca-cafe px-7 text-marca-crema hover:bg-texto-secundario",
};

const tamanos: Record<TamanoBoton, string> = {
  mediano: "h-12",
  grande: "h-14",
};

function clases({ variante, tamano = "grande", conFlecha = false, className }: PropsComunes) {
  const relleno =
    variante === "crema" ? (conFlecha ? "justify-between gap-4 pl-7 pr-2" : "justify-center px-5") : "";
  return [base, variantes[variante], tamanos[tamano], relleno, className].filter(Boolean).join(" ");
}

function Contenido({ variante, conFlecha, children }: PropsComunes) {
  return (
    <>
      <span>{children}</span>
      {variante === "crema" && conFlecha ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-marca-cafe text-marca-crema">
          <IconoFlechaDiagonal className="size-5 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" />
        </span>
      ) : null}
    </>
  );
}

/** Botón de Echo. Con `href` renderiza un enlace; sin él, un `<button>`. */
export function Boton(props: PropsEnlace | PropsBoton) {
  if (props.href !== undefined) {
    const { href, onClick, ...comunes } = props;
    const contenido = <Contenido {...comunes} />;
    // Las anclas de la misma página usan <a> nativo: el navegador mueve el foco a la sección.
    if (href.startsWith("#")) {
      return (
        <a href={href} onClick={onClick} className={clases(comunes)}>
          {contenido}
        </a>
      );
    }
    return (
      <Link href={href} onClick={onClick} className={clases(comunes)}>
        {contenido}
      </Link>
    );
  }

  const { variante, tamano, conFlecha, className, children, type = "button", ...resto } = props;
  return (
    <button type={type} className={clases({ variante, tamano, conFlecha, className, children })} {...resto}>
      <Contenido variante={variante} conFlecha={conFlecha}>
        {children}
      </Contenido>
    </button>
  );
}
