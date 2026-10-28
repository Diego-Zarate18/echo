import { BotonGoogle } from "./BotonGoogle";
import { FormularioCrearCuenta } from "./FormularioCrearCuenta";
import { PantallaDeAcceso } from "./PantallaDeAcceso";

/**
 * SCR-02 · Crear cuenta (Figma 67:244 escritorio, 67:380 con error, 68:303 móvil). El aviso simplificado y las casillas
 * van entre la contraseña y el botón, como en el móvil actualizado el 28/10; el escritorio de Figma aún no los tiene.
 */
export function CrearCuenta() {
  return (
    <PantallaDeAcceso
      saludo={["Empieza tu ruta", "en Echo."]}
      entrada="Lecciones breves, casos reales y una ruta clara de principio a fin."
      saludoCompacto
    >
      <h1 className="font-titulo text-[32px] leading-[1.08] font-extrabold tracking-[-0.015em] lg:text-[40px]">
        Crear cuenta
      </h1>
      <p className="text-base leading-normal text-texto-secundario lg:text-cuerpo">Solo te pedimos tu nombre y tu correo.</p>
      <FormularioCrearCuenta botonGoogle={<BotonGoogle />} />
    </PantallaDeAcceso>
  );
}
