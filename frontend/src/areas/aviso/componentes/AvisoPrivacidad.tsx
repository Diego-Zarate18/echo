import type { ReactNode } from "react";
import { IndicePagina } from "@/componentes/estructura/IndicePagina";
import { IconoArchivo } from "@/componentes/ui/iconos/iconos";
import {
  CORREO_ARCO,
  TEXTO_CORREO_ARCO_PENDIENTE,
  TEXTO_PILOTO,
  ULTIMA_ACTUALIZACION,
  apartadosAviso,
  type ApartadoAviso,
} from "@/areas/aviso/contenido";

/** Párrafo de lectura: 18 px, interlineado 1.7 y medida de 65–75 caracteres reales (58ch de Nunito Sans). */
function Parrafo({ children }: { children: ReactNode }) {
  return <p className="max-w-[58ch] text-amplio leading-[1.7]">{children}</p>;
}

/** Correo ARCO o, mientras PEND-12 siga pendiente, el espacio reservado visible de Figma (84:751). */
function ContactoArco() {
  if (CORREO_ARCO) {
    return (
      <a
        href={`mailto:${CORREO_ARCO}`}
        className="font-titulo text-base font-bold underline underline-offset-4 hover:decoration-2"
      >
        {CORREO_ARCO}
      </a>
    );
  }
  return (
    <p className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-dashed border-marca-terracota bg-superficie-hundida px-4 py-2.5 font-titulo text-base font-bold">
      <IconoArchivo className="size-[18px] text-marca-terracota" />
      {TEXTO_CORREO_ARCO_PENDIENTE}
    </p>
  );
}

const contenido: Record<ApartadoAviso["id"], ReactNode> = {
  responsable: (
    <Parrafo>
      El equipo de desarrollo de Echo —Ángel Eduardo Moreno Moreno, Brian Luis Ruiz Pérez y Diego Alberto
      Zárate Vázquez, estudiantes de la Universidad Politécnica de Chiapas— es responsable del tratamiento de tus
      datos personales, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
      Particulares (LFPDPPP).
    </Parrafo>
  ),
  datos: (
    <>
      <Parrafo>
        Tu nombre o nombres, tus apellidos y tu correo electrónico. Si entras con Google, también el identificador
        que Google asigna a tu cuenta; nunca recibimos tu contraseña de Google. Guardamos además tu avance, tus
        intentos y tus calificaciones.
      </Parrafo>
      <Parrafo>
        No recabamos datos sensibles (como salud o discapacidad), fecha de nacimiento, teléfono, matrícula ni
        dirección IP.
      </Parrafo>
    </>
  ),
  finalidades: (
    <Parrafo>
      Para crear y administrar tu cuenta, mostrarte tu avance, tus resultados y tus insignias, y enviarte los
      enlaces de verificación, recuperación de contraseña y cambio de correo. No los usamos con fines
      publicitarios ni los vendemos.
    </Parrafo>
  ),
  encargados: (
    <Parrafo>
      No transferimos tus datos a terceros. Los servicios que los alojan o envían correos por encargo nuestro
      (Railway para el alojamiento y Resend para los correos) solo los tratan para prestar ese servicio.
    </Parrafo>
  ),
  "derechos-arco": (
    <>
      <Parrafo>
        Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su uso. Desde tu Perfil puedes ver
        tus datos, corregir tu nombre, cambiar tu correo y eliminar tu cuenta. Para cualquier otra solicitud
        escríbenos a:
      </Parrafo>
      <ContactoArco />
    </>
  ),
  conservacion: (
    <Parrafo>
      {TEXTO_PILOTO} Las cuentas sin verificar se eliminan a las 24 horas. Si eliminas tu cuenta, borramos tus
      datos personales y tu historial académico queda sin forma de identificarte. Al cerrar el proyecto
      anonimizamos o eliminamos la base de datos, borramos sus respaldos y apagamos la plataforma.
    </Parrafo>
  ),
  consentimiento: (
    <Parrafo>
      Al crear tu cuenta aceptas este aviso. Si cambia, publicaremos la nueva versión en esta misma página con su
      fecha de actualización.
    </Parrafo>
  ),
};

/** SCR-05 · Aviso de privacidad (Figma 84:783): título, índice «En esta página» y apartados. */
export function AvisoPrivacidad() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-[120px]">
      <header className="flex max-w-[720px] flex-col gap-3.5 pt-10 pb-8 lg:pt-16 lg:pb-12">
        <h1 className="font-titulo text-seccion font-black">Aviso de privacidad</h1>
        <p className="text-amplio text-texto-secundario">
          Cómo cuidamos tus datos personales en Echo. Última actualización:{" "}
          <time dateTime={ULTIMA_ACTUALIZACION.iso}>{ULTIMA_ACTUALIZACION.texto}</time>.
        </p>
      </header>

      <div className="grid gap-10 pb-24 lg:grid-cols-[300px_minmax(0,776px)] lg:gap-16">
        <IndicePagina apartados={apartadosAviso} />
        <div className="flex flex-col gap-10">
          {apartadosAviso.map((apartado) => (
            <section key={apartado.id} id={apartado.id} aria-labelledby={`titulo-${apartado.id}`}>
              <h2 id={`titulo-${apartado.id}`} className="font-titulo text-elemento font-extrabold text-balance">
                {apartado.titulo}
              </h2>
              <div className="mt-3 flex flex-col items-start gap-3">{contenido[apartado.id]}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
