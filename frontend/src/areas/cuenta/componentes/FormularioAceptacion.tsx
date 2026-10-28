"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Versiones } from "@/areas/cuenta/casoDeAceptacion";
import { CASILLAS_OBLIGATORIAS, type NombreCasilla } from "@/areas/cuenta/textosDeConsentimiento";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { Casilla } from "@/componentes/ui/Casilla";
import { apiNavegador } from "@/lib/api/navegador";
import type { components } from "@/lib/api/esquema";
import { mensajeDeCampo, mensajeDeError } from "@/lib/api/mensajes";
import { BotonCerrarSesion } from "./BotonCerrarSesion";
import { AvisoSimplificado, CASILLAS_SIN_MARCAR, CasillasDeConsentimiento, type ValoresCasillas } from "./Consentimiento";

type Documento = components["schemas"]["Documento"];
type Aviso = { titulo: string; mensaje: string; clave: number };

const claseEnlace =
  "inline-flex min-h-6 items-center self-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2";

const NOMBRE_DOCUMENTO = {
  avisoPrivacidad: { con: "el Aviso de privacidad", ruta: "/aviso-de-privacidad", casilla: "aceptaAviso" },
  terminos: { con: "los Términos y condiciones", ruta: "/terminos-y-condiciones", casilla: "aceptaTerminos" },
} as const;

/** El recuadro de la respuesta recibe el foco cada vez que cambia (como en Iniciar sesión). */
function useRecuadro(aviso: Aviso | null) {
  const recuadro = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (aviso) recuadro.current?.focus();
  }, [aviso]);
  return recuadro;
}

function avisoNuevo(anterior: Aviso | null, titulo: string, mensaje: string): Aviso {
  return { titulo, mensaje, clave: (anterior?.clave ?? 0) + 1 };
}

/** «Pasaron más de 10 minutos» (152:5266): la cookie temporal venció y hay que volver a pasar por Google. */
export function GoogleVencido({ botonGoogle }: { botonGoogle: ReactNode }) {
  return (
    <>
      <h1 className="font-titulo text-[28px] leading-[1.1] font-extrabold text-balance lg:text-[40px] lg:tracking-[-0.015em]">
        Termina de crear tu cuenta
      </h1>
      <Alerta tono="espera" role="status" titulo="Pasaron más de 10 minutos">
        Por seguridad, vuelve a continuar con Google para crear tu cuenta.
      </Alerta>
      {botonGoogle}
      <Link href="/" className={claseEnlace}>
        Volver al inicio
      </Link>
    </>
  );
}

/**
 * SCR-19, primera entrada con Google (152:5085, 152:5146): el aviso simplificado y las cinco casillas, como en Crear
 * cuenta. «Crear mi cuenta» llama a OP-13, que crea la cuenta con sus aceptaciones y abre la sesión.
 */
export function AceptacionGoogle({ correo, versiones, botonGoogle }: { correo: string; versiones: Versiones; botonGoogle: ReactNode }) {
  const router = useRouter();
  const [casillas, setCasillas] = useState<ValoresCasillas>(CASILLAS_SIN_MARCAR);
  const [errores, setErrores] = useState<Partial<Record<NombreCasilla, string>>>({});
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [vencido, setVencido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const recuadro = useRecuadro(aviso);

  function marcar(nombre: NombreCasilla, marcada: boolean) {
    setCasillas((antes) => ({ ...antes, [nombre]: marcada }));
    if (marcada && errores[nombre]) setErrores((antes) => ({ ...antes, [nombre]: undefined }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const faltan: Partial<Record<NombreCasilla, string>> = {};
    for (const nombre of CASILLAS_OBLIGATORIAS) if (!casillas[nombre]) faltan[nombre] = mensajeDeCampo(nombre, "CASILLA_OBLIGATORIA");
    setErrores(faltan);
    if (Object.keys(faltan).length) {
      setAviso((anterior) => avisoNuevo(anterior, "Faltan casillas obligatorias", "Marca las casillas obligatorias para crear tu cuenta."));
      return;
    }
    setEnviando(true);
    const resultado = await apiNavegador.aceptarDocumentos({ cuerpo: { ...versiones, ...casillas } });
    if (resultado.ok) {
      router.replace("/modulos");
      router.refresh();
      return;
    }
    setEnviando(false);
    if (resultado.error.codigo === "REGISTRO_GOOGLE_VENCIDO") {
      setVencido(true);
      return;
    }
    if (resultado.error.codigo === "VERSION_NO_VIGENTE") {
      setCasillas((antes) => ({ ...antes, aceptaAviso: false, aceptaTerminos: false }));
      router.refresh();
    }
    setAviso((anterior) => avisoNuevo(anterior, "No pudimos crear tu cuenta", mensajeDeError(resultado.error)));
  }

  if (vencido) return <GoogleVencido botonGoogle={botonGoogle} />;

  return (
    <>
      <h1 className="font-titulo text-[28px] leading-[1.1] font-extrabold text-balance lg:text-[40px] lg:tracking-[-0.015em]">
        Termina de crear tu cuenta
      </h1>
      <p className="text-menor text-texto-secundario lg:text-cuerpo">
        Entraste con Google como <strong className="font-semibold break-all text-marca-cafe">{correo}</strong>. Tu cuenta se
        crea cuando aceptes.
      </p>
      {aviso ? (
        <Alerta key={aviso.clave} ref={recuadro} id="respuesta" tono="error" role="alert" titulo={aviso.titulo}>
          {aviso.mensaje}
        </Alerta>
      ) : null}
      <form noValidate onSubmit={enviar} aria-label="Crear mi cuenta con Google" className="flex flex-col gap-5">
        <AvisoSimplificado />
        <CasillasDeConsentimiento prefijo="aceptar" valores={casillas} errores={errores} alCambiar={marcar} />
        <Boton
          variante="cafe"
          type="submit"
          aria-disabled={enviando || undefined}
          className="w-full aria-disabled:cursor-wait aria-disabled:bg-texto-secundario"
        >
          {enviando ? "Creando tu cuenta…" : "Crear mi cuenta"}
        </Boton>
      </form>
      <Link href="/" className={claseEnlace}>
        Cancelar y volver al inicio
      </Link>
    </>
  );
}

/**
 * SCR-19, versión nueva (152:5226): por cada documento que cambió, su resumen (OP-40), el enlace y su casilla.
 * Mientras falte aceptar, la única pantalla con sesión es el Perfil (INV-30); también se puede cerrar sesión.
 */
export function AceptacionVersionNueva({ pendientes, versiones }: { pendientes: Documento[]; versiones: Versiones }) {
  const router = useRouter();
  const [aceptados, setAceptados] = useState<Partial<Record<Documento["tipo"], boolean>>>({});
  const [errores, setErrores] = useState<Partial<Record<Documento["tipo"], string>>>({});
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [enviando, setEnviando] = useState(false);
  const recuadro = useRecuadro(aviso);

  const ambos = pendientes.length > 1;
  const titulo = `Actualizamos ${pendientes.map((d) => NOMBRE_DOCUMENTO[d.tipo].con).join(" y ")}`;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const faltan: Partial<Record<Documento["tipo"], string>> = {};
    for (const documento of pendientes) {
      if (!aceptados[documento.tipo]) faltan[documento.tipo] = mensajeDeCampo(NOMBRE_DOCUMENTO[documento.tipo].casilla, "CASILLA_OBLIGATORIA");
    }
    setErrores(faltan);
    if (Object.keys(faltan).length) {
      setAviso((anterior) =>
        avisoNuevo(anterior, ambos ? "Faltan casillas obligatorias" : "Falta una casilla obligatoria", "Marca la casilla de cada documento para seguir usando Echo."),
      );
      return;
    }
    setEnviando(true);
    const cuerpo: components["schemas"]["AceptacionEntrada"] = {};
    for (const documento of pendientes) {
      if (documento.tipo === "avisoPrivacidad") Object.assign(cuerpo, { versionAviso: versiones.versionAviso, aceptaAviso: true });
      else Object.assign(cuerpo, { versionTerminos: versiones.versionTerminos, aceptaTerminos: true });
    }
    const resultado = await apiNavegador.aceptarDocumentos({ cuerpo });
    if (resultado.ok) {
      router.replace("/modulos");
      router.refresh();
      return;
    }
    setEnviando(false);
    if (resultado.error.codigo === "VERSION_NO_VIGENTE") {
      setAceptados({});
      router.refresh();
    }
    setAviso((anterior) => avisoNuevo(anterior, "No pudimos guardar tu aceptación", mensajeDeError(resultado.error)));
  }

  return (
    <>
      <h1 className="font-titulo text-[28px] leading-[1.1] font-extrabold text-balance lg:text-[40px] lg:tracking-[-0.015em]">
        {titulo}
      </h1>
      <p className="text-menor text-texto-secundario lg:text-cuerpo">
        Para seguir usando Echo, revisa los cambios y acepta{" "}
        {ambos ? "las versiones nuevas" : `la versión ${pendientes[0]?.version}`}. Mientras tanto solo puedes entrar a tu
        Perfil.
      </p>
      {aviso ? (
        <Alerta key={aviso.clave} ref={recuadro} id="respuesta" tono="error" role="alert" titulo={aviso.titulo}>
          {aviso.mensaje}
        </Alerta>
      ) : null}
      <form noValidate onSubmit={enviar} aria-label="Aceptar los documentos nuevos" className="flex flex-col gap-5">
        {pendientes.map((documento) => {
          const nombre = NOMBRE_DOCUMENTO[documento.tipo];
          const nombreConMayuscula = nombre.con.replace(/^(el|los) /, "");
          return (
            <div key={documento.tipo} className="flex flex-col gap-5">
              <section
                aria-labelledby={`cambios-${documento.tipo}`}
                className="flex flex-col gap-2.5 rounded-aviso bg-superficie-hundida p-4 text-detalle leading-normal text-texto-secundario"
              >
                <h2 id={`cambios-${documento.tipo}`} className="font-titulo text-menor font-bold text-marca-cafe">
                  Qué cambió en {nombreConMayuscula} {documento.version}
                </h2>
                <p>{documento.resumenCambios}</p>
                <Link
                  href={nombre.ruta}
                  className="inline-flex min-h-6 items-center self-start font-titulo font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2"
                >
                  Leer {nombreConMayuscula} {documento.version}
                </Link>
              </section>
              <Casilla
                id={`aceptar-${documento.tipo}`}
                name={nombre.casilla}
                checked={aceptados[documento.tipo] ?? false}
                error={errores[documento.tipo]}
                onChange={(evento) => {
                  const marcada = evento.target.checked;
                  setAceptados((antes) => ({ ...antes, [documento.tipo]: marcada }));
                  if (marcada) setErrores((antes) => ({ ...antes, [documento.tipo]: undefined }));
                }}
              >
                He leído y acepto {nombre.con} (versión {documento.version}).
              </Casilla>
            </div>
          );
        })}
        <Boton
          variante="cafe"
          type="submit"
          aria-disabled={enviando || undefined}
          className="w-full aria-disabled:cursor-wait aria-disabled:bg-texto-secundario"
        >
          {enviando ? "Guardando…" : "Aceptar y continuar"}
        </Boton>
      </form>
      <Boton variante="contornoClaro" href="/perfil" className="w-full">
        Ir a mi Perfil
      </Boton>
      <BotonCerrarSesion como="enlace" />
    </>
  );
}
