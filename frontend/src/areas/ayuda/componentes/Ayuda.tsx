import Link from "next/link";
import type { ReactNode } from "react";
import { IndicePagina } from "@/componentes/estructura/IndicePagina";
import { Moris } from "@/componentes/marca/Moris";
import {
  CALIFICACION_MINIMA,
  CARACTERES_MINIMOS_CONTRASENA,
  CORREO_PRIVACIDAD,
  CORREO_SOPORTE,
  HORAS_VERIFICACION,
  INTENTOS_ANTES_DE_PAUSA,
  MINUTOS_ENLACE,
  MINUTOS_PAUSA,
  MINUTOS_AVISO_SESION,
  MINUTOS_ESPERA_EXAMEN,
  MINUTOS_SESION,
  PREGUNTAS_ABIERTAS_AL_INICIO,
  TEXTO_PILOTO,
  preguntasAyuda,
  type PreguntaAyuda,
} from "@/areas/ayuda/contenido";
import { PreguntasAyuda } from "./PreguntasAyuda";

/** Párrafo de respuesta: 17 px, interlineado 1.7 y la misma medida de lectura que el aviso (65–75 caracteres). */
function Parrafo({ children }: { children: ReactNode }) {
  return <p className="max-w-[58ch] text-cuerpo leading-[1.7]">{children}</p>;
}

/** Enlace de correo dentro de una respuesta. */
function Correo({ direccion }: { direccion: string }) {
  return (
    <a href={`mailto:${direccion}`} className="font-semibold underline underline-offset-4 hover:decoration-2">
      {direccion}
    </a>
  );
}

/** Respuestas redactadas con las decisiones del grafo (tabla de la Tarea 04). Tuteo y frases cortas. */
const respuestas: Record<PreguntaAyuda["id"], ReactNode> = {
  // DEC-02, DEC-03
  "como-avanzo": (
    <Parrafo>
      Echo sigue una ruta: los módulos agrupan cursos, los cursos agrupan lecciones y cada lección se lee por
      secciones. Cada paso se abre al completar el anterior. La siguiente lección, cuando terminas la anterior con su
      actividad y sus casos prácticos; el examen, cuando terminas todas las lecciones del curso; el siguiente curso,
      cuando apruebas el examen, y el siguiente módulo, cuando completas todos sus cursos. Si algo está bloqueado,
      verás qué te falta para abrirlo.
    </Parrafo>
  ),
  // DEC-04, DEC-10
  lecciones: (
    <Parrafo>
      Cada lección se lee por secciones, a tu ritmo. En la última sección se activa el botón «Terminé la lección»: al
      usarlo, la lección cuenta como leída. Si sales antes, al volver retomas en la sección donde te quedaste. Las
      lecciones que se agreguen después aparecen como «nuevas» y no te bloquean nada.
    </Parrafo>
  ),
  // DEC-02, DEC-05, DEC-06, DEC-17, DEC-16, DEC-21, DEC-71
  "actividades-y-casos": (
    <Parrafo>
      Cada lección cierra con una actividad y puede traer casos prácticos. Cuentan como completados al enviarlos, sin
      calificación mínima, y los necesitas para abrir la siguiente lección. Puedes repetirlos cuantas veces quieras y
      sin esperar; en las actividades se guarda tu mejor resultado y verás la respuesta correcta. En los casos, cada
      decisión es óptima, aceptable o riesgosa, y te muestra su consecuencia y su fundamento. En la relación de
      columnas eliges con listas o con clics: nunca hay que arrastrar.
    </Parrafo>
  ),
  // DEC-18, DEC-19, DEC-20, DEC-21, DEC-09, DEC-11
  examenes: (
    <Parrafo>
      Cada curso termina con un examen sin cronómetro, y en cada intento las preguntas y las opciones cambian de orden.
      Tus respuestas se guardan en cuanto las eliges: si sales o pierdes la conexión, retomas el mismo intento. Apruebas
      con {CALIFICACION_MINIMA} % o más, salvo que el examen indique otra calificación; al aprobar completas el curso,
      ves la retroalimentación completa y ese examen ya no se repite. Si repruebas, verás qué preguntas fallaste y qué
      lección repasar, sin las respuestas correctas, y podrás intentarlo de nuevo en {MINUTOS_ESPERA_EXAMEN} minutos.
    </Parrafo>
  ),
  // DEC-14, DEC-02, DEC-10, RN-07, DEC-53
  "progreso-e-insignias": (
    <Parrafo>
      Tu avance se muestra en porcentaje. Un curso con el examen aprobado está al 100 %; mientras no lo apruebes, el
      porcentaje combina las lecciones leídas, las actividades y los casos enviados, y el examen cuenta como 0 %. El
      avance de un módulo es el promedio de sus cursos, y al completarlo obtienes su insignia: es un reconocimiento y no
      cambia tu calificación ni tu avance. Lo que ya lograste no se pierde aunque se agreguen lecciones, y en Echo no
      hay rachas, puntos ni vidas.
    </Parrafo>
  ),
  // DEC-13, DEC-25, DEC-26, DEC-77, DEC-12, DEC-71, DEC-24, SCR-16, DEC-29, DEC-27
  "cuenta-y-sesion": (
    <>
      <Parrafo>
        Creas tu cuenta con tu correo y una contraseña de {CARACTERES_MINIMOS_CONTRASENA} caracteres o más, con al menos
        una letra y un número, o entras con Google. Si usas contraseña, confirma tu correo con el enlace que te enviamos:
        vale {HORAS_VERIFICACION} horas, y las cuentas sin confirmar se eliminan pasado ese tiempo. Tras{" "}
        {INTENTOS_ANTES_DE_PAUSA} intentos fallidos al iniciar sesión, el acceso se pausa {MINUTOS_PAUSA} minutos. Tu
        sesión se cierra tras {MINUTOS_SESION} minutos sin actividad; {MINUTOS_AVISO_SESION} minutos antes te avisamos
        para que sigas conectado.
      </Parrafo>
      <Parrafo>
        Si olvidas tu contraseña, pide un enlace para crear una nueva: vence en {MINUTOS_ENLACE} minutos, igual que el
        que confirma un cambio de correo. En tu Perfil ves tus datos, corriges tu nombre, cambias tu contraseña o tu
        correo (si no entras con Google) y puedes eliminar tu cuenta: se borran tus datos personales y tu historial
        queda sin forma de saber que era tuyo.
      </Parrafo>
    </>
  ),
  // DEC-71, DEC-68
  accesibilidad: (
    <Parrafo>
      Echo sigue las pautas WCAG 2.2 en su nivel AA. Puedes usarlo completo con el teclado, con el foco siempre
      visible, y con lector de pantalla. Los estados como bloqueado, disponible o completado se indican con ícono y
      texto, no solo con color, y en la relación de columnas nunca hay que arrastrar. Si tu dispositivo pide reducir
      el movimiento, Echo lo respeta. Si algo no te funciona, escríbenos a <Correo direccion={CORREO_SOPORTE} />.
    </Parrafo>
  ),
  // SCR-17 › texto_piloto, DEC-74, OP-38, DEC-27, DEC-68
  "cierre-del-piloto": (
    <Parrafo>
      {TEXTO_PILOTO} Después de entregar las calificaciones, anonimizamos o eliminamos la base de datos, apagamos la
      plataforma y borramos sus respaldos. Si lo prefieres, puedes eliminar tu cuenta antes desde tu Perfil. Los
      detalles están en el{" "}
      <Link
        href="/aviso-de-privacidad"
        className="font-semibold underline underline-offset-4 hover:decoration-2"
      >
        Aviso de privacidad
      </Link>
      , y para cualquier duda sobre tus datos personales puedes escribir a <Correo direccion={CORREO_PRIVACIDAD} />.
    </Parrafo>
  ),
};

const preguntas = preguntasAyuda.map((pregunta) => ({ ...pregunta, respuesta: respuestas[pregunta.id] }));

/** SCR-17 · Ayuda (Figma 84:874): título, índice «En esta página» y acordeón de preguntas. */
export function Ayuda() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-[120px]">
      <header className="flex items-end justify-between gap-8 pt-10 pb-8 lg:pt-16 lg:pb-12">
        <div className="flex max-w-[720px] flex-col gap-3.5">
          <h1 className="font-titulo text-seccion font-black">Ayuda</h1>
          <p className="text-amplio text-texto-secundario">
            Respuestas breves para usar Echo. Si algo no queda claro, empieza por aquí.
          </p>
        </div>
        <Moris expresion="curioso" alt="" sizes="104px" className="hidden w-[104px] shrink-0 md:block" />
      </header>

      <div className="grid gap-10 pb-24 lg:grid-cols-[300px_minmax(0,776px)] lg:gap-16">
        <IndicePagina apartados={preguntasAyuda} />
        <PreguntasAyuda preguntas={preguntas} abiertasAlInicio={PREGUNTAS_ABIERTAS_AL_INICIO} />
      </div>
    </div>
  );
}
