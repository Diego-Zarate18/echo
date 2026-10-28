"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { guardarCorreoPendiente } from "@/areas/cuenta/correoPendiente";
import { CASILLAS_OBLIGATORIAS, type NombreCasilla } from "@/areas/cuenta/textosDeConsentimiento";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { Campo, CampoContrasena } from "@/componentes/ui/Campo";
import { ResumenDeErrores, type ErrorDeCampo } from "@/componentes/ui/ResumenDeErrores";
import { apiNavegador } from "@/lib/api/navegador";
import type { components } from "@/lib/api/esquema";
import { mensajeDeCampo, mensajeDeError } from "@/lib/api/mensajes";
import { AvisoSimplificado, CASILLAS_SIN_MARCAR, CasillasDeConsentimiento, type ValoresCasillas } from "./Consentimiento";
import { RequisitosContrasena, requisitoQueFalta } from "./RequisitosContrasena";

type NombreCampo = "nombre" | "apellidos" | "correo" | "contrasena";
type Nombre = NombreCampo | NombreCasilla;
type Errores = Partial<Record<Nombre, string>>;
type Versiones = { versionAviso: string; versionTerminos: string };
type Respuesta = ({ tipo: "campos" } | { tipo: "error"; mensaje: string }) & { clave: number };

const CAMPOS: readonly NombreCampo[] = ["nombre", "apellidos", "correo", "contrasena"];
const ETIQUETAS: Record<Nombre, string> = {
  nombre: "Nombre(s)",
  apellidos: "Apellido(s)",
  correo: "Correo electrónico",
  contrasena: "Contraseña",
  negativaEncuesta: "Encuesta de satisfacción",
  negativaEstadisticas: "Estadísticas anónimas",
  mayorDeEdad: "Mayoría de edad",
  aceptaAviso: "Aviso de privacidad",
  aceptaTerminos: "Términos y condiciones",
};
const ORDEN: readonly Nombre[] = [...CAMPOS, ...CASILLAS_OBLIGATORIAS];
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const id = (nombre: Nombre) => `registro-${nombre}`;

function validarCampo(campo: NombreCampo, valor: string): string | undefined {
  if (campo === "contrasena") return valor ? requisitoQueFalta(valor) : mensajeDeCampo(campo, "OBLIGATORIO");
  if (!valor.trim()) return mensajeDeCampo(campo, "OBLIGATORIO");
  if (campo === "correo" && !FORMATO_CORREO.test(valor.trim())) return mensajeDeCampo(campo, "FORMATO_INVALIDO");
  return undefined;
}

/** Versiones vigentes del aviso y de los términos (OP-40): las que el formulario envía como aceptadas. */
function versionesDe(documentos: components["schemas"]["Documento"][]): Versiones | null {
  const aviso = documentos.find((d) => d.tipo === "avisoPrivacidad");
  const terminos = documentos.find((d) => d.tipo === "terminos");
  return aviso && terminos ? { versionAviso: aviso.version, versionTerminos: terminos.version } : null;
}

/**
 * Formulario de Crear cuenta (SCR-02, OP-01). Casillas sin marcar, aviso simplificado del Anexo A y las versiones
 * vigentes que se muestran. Al enviar, siempre «Revisa tu correo» (DEC-77): exista o no la cuenta, la API responde 202.
 */
export function FormularioCrearCuenta({ botonGoogle }: { botonGoogle: ReactNode }) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<NombreCampo, string>>({ nombre: "", apellidos: "", correo: "", contrasena: "" });
  const [casillas, setCasillas] = useState<ValoresCasillas>(CASILLAS_SIN_MARCAR);
  const [errores, setErrores] = useState<Errores>({});
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [versiones, setVersiones] = useState<Versiones | null>(null);
  const recuadro = useRef<HTMLDivElement>(null);

  // Las versiones vigentes se piden en el navegador: así la página sigue estática y siempre trae las de hoy.
  useEffect(() => {
    let vigente = true;
    void apiNavegador.obtenerDocumentosVigentes().then((resultado) => {
      if (vigente && resultado.ok) setVersiones(versionesDe(resultado.datos.documentos));
    });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (respuesta) recuadro.current?.focus();
  }, [respuesta]);

  function responder(contestacion: { tipo: "campos" } | { tipo: "error"; mensaje: string }) {
    setRespuesta((anterior) => ({ ...contestacion, clave: (anterior?.clave ?? 0) + 1 }));
  }

  function cambiar(campo: NombreCampo, valor: string) {
    setValores((antes) => ({ ...antes, [campo]: valor }));
    if (errores[campo]) setErrores((antes) => ({ ...antes, [campo]: validarCampo(campo, valor) }));
  }

  function salir(campo: NombreCampo) {
    if (valores[campo]) setErrores((antes) => ({ ...antes, [campo]: validarCampo(campo, valores[campo]) }));
  }

  function marcar(nombre: NombreCasilla, marcada: boolean) {
    setCasillas((antes) => ({ ...antes, [nombre]: marcada }));
    if (marcada && errores[nombre]) setErrores((antes) => ({ ...antes, [nombre]: undefined }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const nuevos: Errores = {};
    for (const campo of CAMPOS) nuevos[campo] = validarCampo(campo, valores[campo]);
    for (const nombre of CASILLAS_OBLIGATORIAS) if (!casillas[nombre]) nuevos[nombre] = mensajeDeCampo(nombre, "CASILLA_OBLIGATORIA");
    setErrores(nuevos);
    // Con errores no se llama a la API: el resumen recibe el foco y cada error queda junto a su campo o casilla.
    if (ORDEN.some((nombre) => nuevos[nombre])) {
      responder({ tipo: "campos" });
      return;
    }

    setEnviando(true);
    let vigentes = versiones;
    if (!vigentes) {
      const documentos = await apiNavegador.obtenerDocumentosVigentes();
      vigentes = documentos.ok ? versionesDe(documentos.datos.documentos) : null;
      setVersiones(vigentes);
    }
    if (!vigentes) {
      setEnviando(false);
      responder({ tipo: "error", mensaje: mensajeDeError({ estado: 0, codigo: "SIN_CONEXION" }) });
      return;
    }

    const correo = valores.correo.trim().toLowerCase();
    const resultado = await apiNavegador.registrarCuenta({
      cuerpo: {
        nombre: valores.nombre.trim(),
        apellidos: valores.apellidos.trim(),
        correo,
        contrasena: valores.contrasena,
        ...vigentes,
        aceptaAviso: casillas.aceptaAviso,
        aceptaTerminos: casillas.aceptaTerminos,
        mayorDeEdad: casillas.mayorDeEdad,
        negativaEncuesta: casillas.negativaEncuesta,
        negativaEstadisticas: casillas.negativaEstadisticas,
      },
    });

    if (resultado.ok) {
      // El correo va a «Revisa tu correo» en la memoria de la página, nunca en la URL.
      guardarCorreoPendiente(correo);
      router.push("/verificar-correo");
      return;
    }

    setEnviando(false);
    const { error } = resultado;
    if (error.codigo === "VERSION_NO_VIGENTE") {
      // Cambió un documento mientras se llenaba el formulario: se cargan las versiones nuevas y se vuelven a aceptar.
      setCasillas((antes) => ({ ...antes, aceptaAviso: false, aceptaTerminos: false }));
      const documentos = await apiNavegador.obtenerDocumentosVigentes();
      if (documentos.ok) setVersiones(versionesDe(documentos.datos.documentos));
      responder({ tipo: "error", mensaje: mensajeDeError(error) });
    } else if (error.codigo === "DATOS_INVALIDOS" && error.campos) {
      const delServidor: Errores = {};
      for (const nombre of ORDEN) {
        const codigo = error.campos[nombre];
        if (codigo) delServidor[nombre] = mensajeDeCampo(nombre, codigo);
      }
      setErrores(delServidor);
      responder(Object.keys(delServidor).length ? { tipo: "campos" } : { tipo: "error", mensaje: mensajeDeError(error) });
    } else {
      responder({ tipo: "error", mensaje: mensajeDeError(error) });
    }
  }

  const conError: ErrorDeCampo[] = ORDEN.flatMap((nombre) =>
    errores[nombre] ? [{ id: id(nombre), etiqueta: ETIQUETAS[nombre], mensaje: errores[nombre] }] : [],
  );

  return (
    <>
      {respuesta?.tipo === "campos" && conError.length > 0 ? (
        <ResumenDeErrores key={respuesta.clave} ref={recuadro} errores={conError} />
      ) : null}
      {respuesta?.tipo === "error" ? (
        <Alerta key={respuesta.clave} ref={recuadro} id="respuesta" tono="error" role="alert" titulo="No pudimos crear tu cuenta">
          {respuesta.mensaje}
        </Alerta>
      ) : null}

      {botonGoogle}

      <p className="flex items-center gap-3.5 text-detalle text-texto-secundario before:h-px before:flex-1 before:bg-marca-cafe/20 after:h-px after:flex-1 after:bg-marca-cafe/20">
        o regístrate con tu correo
      </p>

      <form noValidate onSubmit={enviar} aria-label="Crear cuenta con correo" className="flex flex-col gap-4 lg:gap-5">
        <Campo
          id={id("nombre")}
          name="nombre"
          etiqueta={ETIQUETAS.nombre}
          autoComplete="given-name"
          maxLength={100}
          value={valores.nombre}
          error={errores.nombre}
          onChange={(evento) => cambiar("nombre", evento.target.value)}
          onBlur={() => salir("nombre")}
        />
        <Campo
          id={id("apellidos")}
          name="apellidos"
          etiqueta={ETIQUETAS.apellidos}
          ayuda="Al menos el primero; el segundo es opcional."
          autoComplete="family-name"
          maxLength={100}
          value={valores.apellidos}
          error={errores.apellidos}
          onChange={(evento) => cambiar("apellidos", evento.target.value)}
          onBlur={() => salir("apellidos")}
        />
        <Campo
          id={id("correo")}
          name="correo"
          etiqueta={ETIQUETAS.correo}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          value={valores.correo}
          error={errores.correo}
          onChange={(evento) => cambiar("correo", evento.target.value)}
          onBlur={() => salir("correo")}
        />
        <div className="flex flex-col gap-3">
          <CampoContrasena
            id={id("contrasena")}
            name="contrasena"
            etiqueta={ETIQUETAS.contrasena}
            autoComplete="new-password"
            maxLength={200}
            describe="registro-requisitos"
            value={valores.contrasena}
            error={errores.contrasena}
            onChange={(evento) => cambiar("contrasena", evento.target.value)}
            onBlur={() => salir("contrasena")}
          />
          <RequisitosContrasena id="registro-requisitos" contrasena={valores.contrasena} />
        </div>

        <AvisoSimplificado />
        <CasillasDeConsentimiento prefijo="registro" valores={casillas} errores={errores} alCambiar={marcar} />

        <Boton
          variante="cafe"
          type="submit"
          aria-disabled={enviando || undefined}
          className="w-full aria-disabled:cursor-wait aria-disabled:bg-texto-secundario"
        >
          {enviando ? "Creando tu cuenta…" : "Crear cuenta"}
        </Boton>
      </form>

      <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-menor text-texto-secundario">
        ¿Ya tienes cuenta?
        <Link
          href="/iniciar-sesion"
          className="inline-flex min-h-6 items-center font-titulo font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2"
        >
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
