import Link from "next/link";
import type { ReactNode } from "react";
import { iniciales } from "@/componentes/estructura/EncabezadoApp";
import { ErrorDePantalla } from "@/componentes/estructura/ErrorDePantalla";
import { apiServidor } from "@/lib/api/servidor";
import { formatearFecha } from "@/lib/fechas";
import {
  CambiarContrasena,
  CambiarCorreo,
  CerrarTodasLasSesiones,
  EditarNombre,
  EliminarCuenta,
  PreferenciasDePrivacidad,
} from "./FormulariosDePerfil";

const DOCUMENTOS = { avisoPrivacidad: "Aviso de privacidad", terminos: "Términos y condiciones" } as const;
const METODOS = { correo: "Correo y contraseña", google: "Google", ambos: "Correo y contraseña, y Google" } as const;
const METODOS_EN_FRASE = { correo: "correo y contraseña", google: "Google", ambos: "correo y contraseña, y con Google" } as const;

export function PerfilCargando() {
  return (
    <div aria-hidden="true" className="esqueleto flex flex-col gap-6">
      <div className="h-12 w-48 rounded-fila bg-superficie-hundida" />
      <div className="h-[280px] rounded-tarjeta bg-superficie-hundida" />
      <div className="h-[280px] rounded-tarjeta bg-superficie-hundida" />
    </div>
  );
}

/** Tarjeta del Perfil (Figma 94:2882): título y descripción a la izquierda, el formulario a la derecha. */
function Seccion({ id, titulo, descripcion, children }: { id: string; titulo: string; descripcion?: ReactNode; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-6 rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] md:gap-10 md:p-8"
    >
      <div className="flex flex-col gap-2">
        <h2 id={id} className="font-titulo text-tarjeta font-extrabold text-marca-cafe">
          {titulo}
        </h2>
        {descripcion ? <p className="text-detalle text-texto-secundario">{descripcion}</p> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}

/**
 * Contenido de SCR-16. Lo que se puede cambiar depende de cómo entra el alumno: con Google no hay contraseña que
 * cambiar ni correo que cambiar aquí (se cambian en Google), y para eliminar la cuenta se pide volver a entrar con Google.
 */
export async function Perfil({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [resultado, consulta] = await Promise.all([apiServidor.obtenerPerfil(), searchParams]);
  if (!resultado.ok && resultado.error.estado === 401) return null;
  if (!resultado.ok) {
    return <ErrorDePantalla titulo="No pudimos cargar tu perfil" error={resultado.error} salida={{ texto: "Ir a Módulos", href: "/modulos" }} />;
  }
  const perfil = resultado.datos;
  const conContrasena = perfil.metodoAcceso !== "google";
  const reingresoGoogle = consulta.reingreso === "google";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-marca-bosque font-titulo text-tarjeta font-extrabold text-marca-crema">
          {iniciales(perfil.nombre, perfil.apellidos)}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-titulo text-entrada font-extrabold text-marca-cafe">Mi perfil</h1>
          <p className="text-menor break-all text-texto-secundario">
            Entras con {METODOS_EN_FRASE[perfil.metodoAcceso]} · {perfil.correo}
          </p>
        </div>
      </div>

      <Seccion id="titulo-datos" titulo="Datos personales" descripcion="Así aparece tu nombre en Echo. Solo pedimos lo necesario para identificarte en el curso.">
        <EditarNombre nombre={perfil.nombre} apellidos={perfil.apellidos ?? ""} />
        <dl className="flex flex-col text-menor text-marca-cafe">
          {[
            ["Correo", perfil.correo],
            ["Método de acceso", METODOS[perfil.metodoAcceso]],
            ["Fecha de registro", formatearFecha(perfil.registradoEn)],
          ].map(([termino, valor]) => (
            <div key={termino} className="grid gap-1 border-b border-marca-cafe/10 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
              <dt className="text-detalle font-bold text-texto-secundario">{termino}</dt>
              <dd className="break-all">{valor}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      {perfil.metodoAcceso === "correo" ? (
        <Seccion id="titulo-correo" titulo="Cambiar correo" descripcion="Te enviaremos un enlace al correo nuevo para confirmarlo. Vence en 30 minutos y solo funciona una vez.">
          <CambiarCorreo />
        </Seccion>
      ) : null}

      {conContrasena ? (
        <Seccion id="titulo-contrasena" titulo="Cambiar contraseña" descripcion="Al cambiarla se cerrarán tus sesiones en otros dispositivos.">
          <CambiarContrasena />
        </Seccion>
      ) : null}

      {perfil.metodoAcceso !== "correo" ? (
        <Seccion id="titulo-google" titulo="Correo y contraseña" descripcion="Tu cuenta usa Google para entrar.">
          <p className="text-menor text-marca-cafe">
            {conContrasena
              ? "Tu correo lo administra Google, por eso no se puede cambiar aquí."
              : "Tu correo lo administra Google, por eso no se puede cambiar aquí. Tampoco necesitas contraseña: entras con el botón «Continuar con Google»."}
          </p>
        </Seccion>
      ) : null}

      <Seccion id="titulo-sesiones" titulo="Sesiones" descripcion="Si usaste Echo en una computadora prestada o perdiste tu teléfono, cierra todas tus sesiones.">
        <CerrarTodasLasSesiones />
      </Seccion>

      {/* No está en el marco de Figma, pero SCR-16 lo pide (OP-39, aceptaciones y OP-41): el grafo manda (DEC-84). */}
      <Seccion id="titulo-privacidad" titulo="Privacidad" descripcion="Puedes cambiarlas cuando quieras. Tu negativa no afecta el servicio.">
        <PreferenciasDePrivacidad preferencias={perfil.preferencias} />
        <div className="flex flex-col gap-3 border-t border-marca-cafe/10 pt-6">
          <h3 className="font-titulo text-cuerpo font-extrabold text-marca-cafe">Documentos que aceptaste</h3>
          {perfil.aceptaciones.length ? (
            <ul className="flex flex-col gap-2 text-menor text-marca-cafe">
              {perfil.aceptaciones.map((a) => (
                <li key={`${a.documento}-${a.version}`}>
                  <Link href={a.documento === "terminos" ? "/terminos-y-condiciones" : "/aviso-de-privacidad"} className="font-bold underline underline-offset-4">
                    {DOCUMENTOS[a.documento]}
                  </Link>{" "}
                  versión {a.version}, aceptado el {formatearFecha(a.aceptadoEn)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-menor text-texto-secundario">No hay aceptaciones registradas.</p>
          )}
        </div>
        <div className="flex flex-col items-start gap-3 border-t border-marca-cafe/10 pt-6">
          <h3 className="font-titulo text-cuerpo font-extrabold text-marca-cafe">Tus datos personales</h3>
          <p className="text-menor text-marca-cafe">
            Descarga en un archivo JSON todo lo que Echo guarda de ti: tu cuenta, tus preferencias, tus aceptaciones, tus sesiones y tus intentos.
          </p>
          {/* El backend responde con Content-Disposition: attachment; un enlace basta y funciona sin JavaScript. */}
          <a
            href="/api/perfil/exportacion"
            download
            className="inline-flex h-12 items-center rounded-full border-2 border-marca-cafe px-6 font-titulo text-menor font-bold text-marca-cafe focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marca-bosque"
          >
            Descargar mis datos
          </a>
        </div>
      </Seccion>

      <Seccion id="titulo-eliminar" titulo="Eliminar cuenta" descripcion="Esta acción no se puede deshacer.">
        <EliminarCuenta conContrasena={conContrasena} reingresoGoogle={reingresoGoogle} />
      </Seccion>
    </div>
  );
}
