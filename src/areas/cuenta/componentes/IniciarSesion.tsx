import { BotonGoogle } from "./BotonGoogle";
import { FormularioInicioSesion } from "./FormularioInicioSesion";
import { PantallaDeAcceso } from "./PantallaDeAcceso";

/** SCR-01 · Iniciar sesión (Figma 67:41 escritorio, 67:124 con error, 68:204 móvil). */
export function IniciarSesion() {
  return (
    <PantallaDeAcceso
      saludo={["Qué bueno", "verte de nuevo."]}
      entrada="Continúa tu ruta donde la dejaste: tu avance se guarda solo."
    >
      <h1 className="font-titulo text-[32px] leading-[1.08] font-extrabold tracking-[-0.015em] lg:text-[40px]">
        Iniciar sesión
      </h1>
      <p className="hidden text-cuerpo leading-normal text-texto-secundario lg:block">
        Entra con tu correo o con tu cuenta de Google.
      </p>
      <FormularioInicioSesion botonGoogle={<BotonGoogle />} />
    </PantallaDeAcceso>
  );
}
