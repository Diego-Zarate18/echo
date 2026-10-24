import { SaltarAlContenido } from "@/componentes/estructura/SaltarAlContenido";

/** Pantallas de acceso (SCR-01 a SCR-04): solo para quien no tiene sesión. Cada pantalla arma su panel y su pie. */
export default function LayoutAcceso({ children }: LayoutProps<"/">) {
  return (
    <>
      <SaltarAlContenido />
      {children}
    </>
  );
}
