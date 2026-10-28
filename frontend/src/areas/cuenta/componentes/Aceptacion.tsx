import { casoDeAceptacion } from "@/areas/cuenta/casoDeAceptacion";
import { Alerta } from "@/componentes/ui/Alerta";
import { BotonGoogle } from "./BotonGoogle";
import { AceptacionGoogle, AceptacionVersionNueva, GoogleVencido } from "./FormularioAceptacion";
import { PantallaDeAcceso } from "./PantallaDeAcceso";

const GOOGLE = { saludo: ["Ya casi", "estás dentro."], entrada: "Tu cuenta se crea en cuanto aceptes el aviso y los términos." } as const;
const VERSION = { saludo: ["Algo cambió", "en Echo."], entrada: "Revisa qué cambió y acepta la versión nueva para seguir aprendiendo." } as const;

/**
 * SCR-19 · Aceptar aviso y términos (Figma móvil 152:5085, 152:5146, 152:5226 y 152:5266; en escritorio, la estructura
 * de SCR-01 con el contenido del móvil). Lee el caso en el servidor: versión nueva con sesión o registro con Google.
 */
export async function Aceptacion() {
  const caso = await casoDeAceptacion();
  // El layout ya está redirigiendo.
  if (caso.tipo === "redirigir") return null;

  if (caso.tipo === "version") {
    return (
      <PantallaDeAcceso saludo={VERSION.saludo} entrada={VERSION.entrada}>
        <AceptacionVersionNueva pendientes={caso.pendientes} versiones={caso.versiones} />
      </PantallaDeAcceso>
    );
  }

  return (
    <PantallaDeAcceso saludo={GOOGLE.saludo} entrada={GOOGLE.entrada}>
      {caso.tipo === "google" ? (
        <AceptacionGoogle correo={caso.correo} versiones={caso.versiones} botonGoogle={<BotonGoogle />} />
      ) : caso.tipo === "googleVencido" ? (
        <GoogleVencido botonGoogle={<BotonGoogle />} />
      ) : (
        <>
          <h1 className="font-titulo text-[28px] leading-[1.1] font-extrabold lg:text-[40px]">No pudimos cargar esta página</h1>
          <Alerta tono="error" role="alert" titulo="Algo salió mal">
            {caso.mensaje}
          </Alerta>
        </>
      )}
    </PantallaDeAcceso>
  );
}
