import { PiePublico } from "@/componentes/estructura/PiePublico";
import { SaltarAlContenido } from "@/componentes/estructura/SaltarAlContenido";

/** Sitio público (DEC-83): inicio, aviso de privacidad y ayuda comparten el pie. */
export default function LayoutPublico({ children }: LayoutProps<"/">) {
  return (
    <>
      <SaltarAlContenido />
      {children}
      <PiePublico />
    </>
  );
}
