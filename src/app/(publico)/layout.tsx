import { SaltarAlContenido } from "@/componentes/estructura/SaltarAlContenido";

/**
 * Sitio público (DEC-83): inicio, aviso de privacidad y ayuda.
 * Cada página pone su pie (`PiePublico`, oscuro en el inicio y claro en las internas).
 */
export default function LayoutPublico({ children }: LayoutProps<"/">) {
  return (
    <>
      <SaltarAlContenido />
      {children}
    </>
  );
}
