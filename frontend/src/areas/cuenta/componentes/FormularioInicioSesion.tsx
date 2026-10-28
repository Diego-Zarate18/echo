"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { Campo, CampoContrasena } from "@/componentes/ui/Campo";
import { apiNavegador } from "@/lib/api/navegador";
import type { CodigoCampo } from "@/lib/api/errores";
import { avisosDeAcceso, mensajeDeCampo, mensajeDeError, mensajesDeError } from "@/lib/api/mensajes";
import { RUTA_INICIO_APP, rutaInternaSegura } from "@/lib/rutas";
import { useConsultaDeLaUrl } from "@/lib/useConsultaDeLaUrl";

type NombreCampo = "correo" | "contrasena";
type ErroresDeCampo = Partial<Record<NombreCampo, string>>;

/** Lo que contestó el último envío. */
type Contestacion = { tipo: "error"; mensaje: string } | { tipo: "campos" } | { tipo: "sinVerificar" };
/** `clave` cambia en cada envío: el recuadro se vuelve a montar (se anima y se anuncia) y recibe el foco otra vez. */
type Respuesta = Contestacion & { clave: number };

const ETIQUETAS: Record<NombreCampo, string> = { correo: "Correo electrónico", contrasena: "Contraseña" };
const ORDEN: readonly NombreCampo[] = ["correo", "contrasena"];
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ayuda del cliente: correo con formato válido y contraseña no vacía. La validación que manda es la del backend. */
function validar(campo: NombreCampo, valor: string): string | undefined {
  const codigo: CodigoCampo | null =
    campo === "correo"
      ? !valor.trim()
        ? "OBLIGATORIO"
        : FORMATO_CORREO.test(valor.trim())
          ? null
          : "FORMATO_INVALIDO"
      : valor
        ? null
        : "OBLIGATORIO";
  return codigo ? mensajeDeCampo(campo, codigo) : undefined;
}

/** «Aún no verificas tu correo. Te podemos enviar…» (DEC-77): la primera oración es el título del recuadro. */
const [tituloSinVerificar, ...restoSinVerificar] = mensajesDeError.CORREO_SIN_VERIFICAR.split(". ");

const claseEnlace = "font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2";

/**
 * Formulario de SCR-01 (OP-04). Los estados siguen al grafo sobre Figma (DEC-77, INV-28):
 * - un solo error para correo inexistente, contraseña equivocada y cuenta en pausa, sin hora de desbloqueo;
 * - «correo sin verificar» solo si el backend responde CORREO_SIN_VERIFICAR, con «Reenviar enlace»;
 * - el recuadro de la respuesta queda arriba del formulario, lo anuncia el lector y recibe el foco.
 */
export function FormularioInicioSesion({ botonGoogle }: { botonGoogle: ReactNode }) {
  const router = useRouter();
  const consulta = useConsultaDeLaUrl();
  const [valores, setValores] = useState<Record<NombreCampo, string>>({ correo: "", contrasena: "" });
  const [errores, setErrores] = useState<ErroresDeCampo>({});
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [avisoDeLaUrl, setAvisoDeLaUrl] = useState(true);
  const recuadro = useRef<HTMLDivElement>(null);
  const campoCorreo = useRef<HTMLInputElement>(null);
  const campoContrasena = useRef<HTMLInputElement>(null);

  // El recuadro de la respuesta recibe el foco (Figma 66:44: «al fallar el envío recibe el foco»).
  useEffect(() => {
    if (respuesta) recuadro.current?.focus();
  }, [respuesta]);

  const sesionExpirada = avisoDeLaUrl && consulta.get("motivo") === "expirada";
  const errorDeGoogle = avisoDeLaUrl && consulta.get("error") === "google";

  function responder(contestacion: Contestacion) {
    setAvisoDeLaUrl(false);
    setRespuesta((anterior) => ({ ...contestacion, clave: (anterior?.clave ?? 0) + 1 }));
  }

  function cambiar(campo: NombreCampo, valor: string) {
    setValores((antes) => ({ ...antes, [campo]: valor }));
    // Si el campo ya mostraba un error, se revisa mientras se corrige para quitarlo en cuanto quede bien.
    if (errores[campo]) setErrores((antes) => ({ ...antes, [campo]: validar(campo, valor) }));
  }

  function salir(campo: NombreCampo) {
    // Al salir del campo se revisa solo si ya se escribió algo: pasar con el tabulador no muestra errores.
    if (valores[campo]) setErrores((antes) => ({ ...antes, [campo]: validar(campo, valores[campo]) }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const nuevos: ErroresDeCampo = {};
    for (const campo of ORDEN) {
      const error = validar(campo, valores[campo]);
      if (error) nuevos[campo] = error;
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      responder({ tipo: "campos" });
      return;
    }

    setEnviando(true);
    const resultado = await apiNavegador.iniciarSesion({
      // Correo normalizado (INV-12); el backend lo normaliza de nuevo.
      cuerpo: { correo: valores.correo.trim().toLowerCase(), contrasena: valores.contrasena },
    });

    if (resultado.ok) {
      const { aviso, terminos } = resultado.datos.aceptacionPendiente;
      const destino = aviso || terminos ? "/aceptar" : (rutaInternaSegura(consulta.get("volver")) ?? RUTA_INICIO_APP);
      // El botón sigue ocupado hasta que llega la otra pantalla: no se envía dos veces.
      router.replace(destino);
      router.refresh();
      return;
    }

    setEnviando(false);
    const { error } = resultado;
    if (error.codigo === "CORREO_SIN_VERIFICAR") {
      responder({ tipo: "sinVerificar" });
    } else if (error.codigo === "DATOS_INVALIDOS" && error.campos) {
      const delServidor: ErroresDeCampo = {};
      for (const campo of ORDEN) {
        const codigo = error.campos[campo];
        if (codigo) delServidor[campo] = mensajeDeCampo(campo, codigo);
      }
      setErrores(delServidor);
      responder(Object.keys(delServidor).length > 0 ? { tipo: "campos" } : { tipo: "error", mensaje: mensajeDeError(error) });
    } else {
      responder({ tipo: "error", mensaje: mensajeDeError(error) });
    }
  }

  async function reenviarEnlace() {
    if (reenviando) return;
    setReenviando(true);
    const resultado = await apiNavegador.reenviarVerificacion({
      cuerpo: { correo: valores.correo.trim().toLowerCase() },
    });
    if (resultado.ok) {
      router.push("/verificar-correo");
      return;
    }
    setReenviando(false);
    responder({ tipo: "error", mensaje: mensajeDeError(resultado.error) });
  }

  const conError = ORDEN.filter((campo) => errores[campo]);

  return (
    <>
      {sesionExpirada ? (
        <Alerta tono="aviso" role="status">
          {avisosDeAcceso.sesionExpirada}
        </Alerta>
      ) : null}
      {errorDeGoogle ? (
        <Alerta tono="error" role="alert" titulo="No pudimos iniciar tu sesión">
          {avisosDeAcceso.errorGoogle}
        </Alerta>
      ) : null}

      {respuesta?.tipo === "error" ? (
        <Alerta key={respuesta.clave} ref={recuadro} id="respuesta" tono="error" role="alert" titulo="No pudimos iniciar tu sesión">
          {respuesta.mensaje}
        </Alerta>
      ) : null}
      {respuesta?.tipo === "campos" && conError.length > 0 ? (
        <Alerta
          key={respuesta.clave}
          ref={recuadro}
          id="respuesta"
          tono="error"
          role="alert"
          titulo={conError.length === 1 ? "Revisa 1 campo" : `Revisa ${conError.length} campos`}
        >
          <ul className="flex flex-col gap-0.5">
            {conError.map((campo) => (
              <li key={campo}>
                <a
                  href={`#inicio-${campo}`}
                  onClick={(evento) => {
                    evento.preventDefault();
                    (campo === "correo" ? campoCorreo : campoContrasena).current?.focus();
                  }}
                  className="underline underline-offset-4 hover:decoration-2"
                >
                  {ETIQUETAS[campo]}: {errores[campo]}
                </a>
              </li>
            ))}
          </ul>
        </Alerta>
      ) : null}
      {respuesta?.tipo === "sinVerificar" ? (
        <Alerta key={respuesta.clave} ref={recuadro} id="respuesta" tono="correo" role="status" titulo={tituloSinVerificar}>
          <p>{restoSinVerificar.join(". ")}</p>
          <button
            type="button"
            onClick={reenviarEnlace}
            aria-disabled={reenviando || undefined}
            className={`mt-1.5 inline-flex min-h-6 items-center aria-disabled:cursor-wait ${claseEnlace}`}
          >
            {reenviando ? "Enviando enlace…" : "Reenviar enlace"}
          </button>
        </Alerta>
      ) : null}

      {botonGoogle}

      <p className="flex items-center gap-3.5 text-detalle text-texto-secundario before:h-px before:flex-1 before:bg-marca-cafe/20 after:h-px after:flex-1 after:bg-marca-cafe/20">
        o con tu correo
      </p>

      <form noValidate onSubmit={enviar} aria-label="Iniciar sesión con correo" className="flex flex-col gap-[18px] lg:gap-5">
        <Campo
          ref={campoCorreo}
          id="inicio-correo"
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
        <CampoContrasena
          ref={campoContrasena}
          id="inicio-contrasena"
          name="contrasena"
          etiqueta={ETIQUETAS.contrasena}
          autoComplete="current-password"
          maxLength={200}
          value={valores.contrasena}
          error={errores.contrasena}
          onChange={(evento) => cambiar("contrasena", evento.target.value)}
          onBlur={() => salir("contrasena")}
        />
        <Link href="/recuperar-contrasena" className={`inline-flex min-h-6 items-center self-end ${claseEnlace}`}>
          ¿Olvidaste tu contraseña?
        </Link>
        <Boton
          variante="cafe"
          type="submit"
          aria-disabled={enviando || undefined}
          className="w-full aria-disabled:cursor-wait aria-disabled:bg-texto-secundario"
        >
          {enviando ? "Iniciando sesión…" : "Iniciar sesión"}
        </Boton>
      </form>

      <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-menor text-texto-secundario">
        ¿Aún no tienes cuenta?
        <Link href="/crear-cuenta" className={`inline-flex min-h-6 items-center ${claseEnlace}`}>
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
