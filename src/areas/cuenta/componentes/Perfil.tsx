import Link from "next/link";
import type { ReactNode } from "react";
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

export function PerfilCargando() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="h-12 w-48 rounded-fila bg-superficie-hundida" />
      <div className="h-[280px] rounded-tarjeta bg-superficie-hundida" />
      <div className="h-[280px] rounded-tarjeta bg-superficie-hundida" />
    </div>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6 rounded-tarjeta bg-superficie-elevada p-6 shadow-relieve md:p-8">
      <h2 id={id} className="font-titulo text-tarjeta font-extrabold text-marca-cafe">
        {titulo}
      </h2>
      {children}
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
      <div className="flex flex-col gap-2">
        <h1 className="font-titulo text-entrada font-extrabold text-marca-cafe">Perfil</h1>
        <p className="text-cuerpo text-texto-secundario">Con Echo desde el {formatearFecha(perfil.registradoEn)}.</p>
      </div>

      <Seccion id="titulo-datos" titulo="Tus datos">
        <EditarNombre nombre={perfil.nombre} apellidos={perfil.apellidos ?? ""} />
        <dl className="grid gap-4 border-t border-marca-cafe/10 pt-6 text-menor text-marca-cafe sm:grid-cols-2">
          <div>
            <dt className="text-detalle text-texto-secundario">Correo</dt>
            <dd className="font-bold break-all">{perfil.correo}</dd>
          </div>
          <div>
            <dt className="text-detalle text-texto-secundario">Cómo entras</dt>
            <dd className="font-bold">{METODOS[perfil.metodoAcceso]}</dd>
          </div>
        </dl>
      </Seccion>

      <Seccion id="titulo-seguridad" titulo="Seguridad">
        {perfil.metodoAcceso === "correo" ? (
          <CambiarCorreo />
        ) : (
          <p className="text-menor text-marca-cafe">Como entras con Google, tu correo se cambia en tu cuenta de Google.</p>
        )}
        {conContrasena ? <CambiarContrasena /> : <p className="text-menor text-marca-cafe">Entras con Google, así que no tienes contraseña en Echo.</p>}
        <CerrarTodasLasSesiones />
      </Seccion>

      <Seccion id="titulo-privacidad" titulo="Privacidad">
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

      <Seccion id="titulo-eliminar" titulo="Eliminar mi cuenta">
        <EliminarCuenta conContrasena={conContrasena} reingresoGoogle={reingresoGoogle} />
      </Seccion>
    </div>
  );
}
