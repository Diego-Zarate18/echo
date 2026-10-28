"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { leerCorreoPendiente } from "@/areas/cuenta/correoPendiente";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { Campo } from "@/componentes/ui/Campo";
import { IconoAlerta, IconoCirculoCheck, IconoReloj, IconoSobre } from "@/componentes/ui/iconos/iconos";
import { apiNavegador } from "@/lib/api/navegador";
import type { ErrorApi } from "@/lib/api/errores";
import { mensajeDeCampo, mensajeDeError } from "@/lib/api/mensajes";
import { useConsultaDeLaUrl } from "@/lib/useConsultaDeLaUrl";
import { PantallaDeAcceso } from "./PantallaDeAcceso";

type Tipo = "verificacion" | "cambio-correo";
type Resultado =
  | { estado: "verificando" }
  | { estado: "listo" }
  | { estado: "vencido" }
  | { estado: "usado" }
  | { estado: "error"; error: ErrorApi };

/** Lo que dice SCR-03 en cada caso. El panel cambia con el tipo de enlace (83:420 y 83:598). */
const PANEL: Record<Tipo, { saludo: readonly [string, string]; entrada: string }> = {
  verificacion: { saludo: ["Ya casi", "estás dentro."], entrada: "Activa tu cuenta desde tu correo y empieza tu primera lección." },
  "cambio-correo": { saludo: ["Tu cuenta,", "al día."], entrada: "Los cambios de correo se confirman desde la dirección nueva." },
};

const RESPUESTA_GENERICA = "Si hay una cuenta pendiente con ese correo, te enviamos un enlace nuevo.";
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ícono decorativo en un círculo hundido de 72 px (83:449). */
function IconoDeEstado({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="flex size-[72px] items-center justify-center rounded-full bg-superficie-hundida">
      {children}
    </span>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-titulo text-[32px] leading-[1.1] font-extrabold tracking-[-0.015em] text-balance lg:text-[40px]">
      {children}
    </h1>
  );
}

function Texto({ children }: { children: ReactNode }) {
  return <p className="text-cuerpo text-texto-secundario">{children}</p>;
}

const claseEnlace =
  "inline-flex min-h-6 items-center self-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2";

/**
 * Pide un enlace nuevo (OP-02, reenvío). La respuesta es siempre la misma, exista o no una cuenta pendiente con ese
 * correo (DEC-77). Si el correo ya se conoce (se acaba de registrar), no se vuelve a pedir.
 */
function ReenviarEnlace({ correoConocido, principal }: { correoConocido: string | null; principal: boolean }) {
  const [correo, setCorreo] = useState(correoConocido ?? "");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; clave: number; tono: "correo" | "error" } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const limpio = correo.trim().toLowerCase();
    const problema = !limpio
      ? mensajeDeCampo("correo", "OBLIGATORIO")
      : FORMATO_CORREO.test(limpio)
        ? null
        : mensajeDeCampo("correo", "FORMATO_INVALIDO");
    setError(problema);
    if (problema) {
      document.getElementById("verificar-correo")?.focus();
      return;
    }
    setEnviando(true);
    const resultado = await apiNavegador.reenviarVerificacion({ cuerpo: { correo: limpio } });
    setEnviando(false);
    setAviso((anterior) => ({
      texto: resultado.ok ? RESPUESTA_GENERICA : mensajeDeError(resultado.error),
      tono: resultado.ok ? "correo" : "error",
      clave: (anterior?.clave ?? 0) + 1,
    }));
  }

  return (
    <form noValidate onSubmit={enviar} aria-label="Pedir un enlace nuevo" className="flex flex-col gap-[18px] lg:gap-5">
      {aviso ? (
        <Alerta key={aviso.clave} tono={aviso.tono} role={aviso.tono === "error" ? "alert" : "status"}>
          {aviso.texto}
        </Alerta>
      ) : null}
      {correoConocido ? null : (
        <Campo
          id="verificar-correo"
          name="correo"
          etiqueta="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          value={correo}
          error={error}
          onChange={(evento) => setCorreo(evento.target.value)}
        />
      )}
      <Boton
        variante={principal ? "cafe" : "contornoClaro"}
        type="submit"
        aria-disabled={enviando || undefined}
        className="w-full aria-disabled:cursor-wait"
      >
        {enviando ? "Enviando enlace…" : correoConocido ? "Reenviar enlace" : "Enviar enlace nuevo"}
      </Boton>
    </form>
  );
}

/**
 * SCR-03 · Verificar correo (Figma 83:405, 83:466, 83:528 y 83:583; móvil 149:5692 y 149:5733).
 * - Sin `codigo`: «Revisa tu correo», con «Reenviar enlace».
 * - Con `codigo`: verifica (OP-02) o, con `tipo=cambio-correo`, confirma el cambio (OP-12) y muestra el resultado.
 * El código se quita de la URL en cuanto se lee (`history.replaceState`), para que no quede en el historial ni se
 * comparta al copiar la dirección.
 */
/** Llama a OP-02 u OP-12 con el código del enlace y traduce la respuesta al estado de la pantalla. */
async function revisarEnlace(codigo: string, tipo: Tipo): Promise<Resultado> {
  const entrada = { cuerpo: { codigo } };
  const respuesta = tipo === "cambio-correo" ? await apiNavegador.confirmarCambioCorreo(entrada) : await apiNavegador.verificarCorreo(entrada);
  if (respuesta.ok) return { estado: "listo" };
  if (respuesta.error.codigo === "ENLACE_INVALIDO") return { estado: respuesta.error.motivo === "usado" ? "usado" : "vencido" };
  return { estado: "error", error: respuesta.error };
}

const sinSuscripcion = () => () => {};

export function VerificarCorreo() {
  const consulta = useConsultaDeLaUrl();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  // El correo recién registrado vive en la memoria del navegador; en el HTML estático no hay ninguno.
  const correoPendiente = useSyncExternalStore(sinSuscripcion, leerCorreoPendiente, () => null);
  const enlace = useRef<{ codigo: string; tipo: Tipo } | null>(null);
  const tipo: Tipo = consulta.get("tipo") === "cambio-correo" ? "cambio-correo" : "verificacion";
  const codigo = consulta.get("codigo");

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const delEnlace = parametros.get("codigo");
    if (!delEnlace || enlace.current) return;
    const tipoDelEnlace: Tipo = parametros.get("tipo") === "cambio-correo" ? "cambio-correo" : "verificacion";
    enlace.current = { codigo: delEnlace, tipo: tipoDelEnlace };
    // Fuera el código de la URL; se conserva `tipo` para que el panel siga diciendo lo mismo.
    window.history.replaceState(window.history.state, "", tipoDelEnlace === "cambio-correo" ? "?tipo=cambio-correo" : window.location.pathname);
    void revisarEnlace(delEnlace, tipoDelEnlace).then(setResultado);
  }, []);

  async function reintentar() {
    if (!enlace.current) return;
    setResultado({ estado: "verificando" });
    setResultado(await revisarEnlace(enlace.current.codigo, enlace.current.tipo));
  }

  const panel = PANEL[tipo];
  let contenido: ReactNode;

  if ((!resultado && codigo) || resultado?.estado === "verificando") {
    contenido = (
      <p role="status" className="text-cuerpo text-texto-secundario">
        {tipo === "cambio-correo" ? "Confirmando tu correo nuevo…" : "Verificando tu correo…"}
      </p>
    );
  } else if (!resultado) {
    contenido = (
      <>
        <IconoDeEstado>
          <IconoSobre className="size-[34px] text-marca-bosque" />
        </IconoDeEstado>
        <Titulo>Revisa tu correo</Titulo>
        <Texto>
          {correoPendiente ? (
            <>
              Te enviamos un mensaje a <strong className="font-semibold text-marca-cafe">{correoPendiente}</strong>.
            </>
          ) : (
            "Te enviamos un mensaje a tu correo."
          )}{" "}
          Abre el enlace para activar tu cuenta; vence en 24 horas.
        </Texto>
        <Alerta tono="correo" role="status" titulo="¿No llegó?">
          Revisa la carpeta de correo no deseado o pide un enlace nuevo.
        </Alerta>
        <ReenviarEnlace correoConocido={correoPendiente} principal={false} />
        <Link href="/iniciar-sesion" className={claseEnlace}>
          Volver a iniciar sesión
        </Link>
      </>
    );
  } else if (resultado.estado === "listo") {
    contenido = (
      <>
        <IconoDeEstado>
          <IconoCirculoCheck className="size-[34px] text-marca-bosque" />
        </IconoDeEstado>
        <Titulo>{tipo === "cambio-correo" ? "Tu correo se actualizó" : "Tu correo está verificado"}</Titulo>
        <Texto>
          {tipo === "cambio-correo"
            ? "Desde ahora usa tu correo nuevo para iniciar sesión y recibir nuestros mensajes."
            : "Tu cuenta ya está activa y tu sesión, iniciada. Empieza tu primera lección cuando quieras."}
        </Texto>
        <Boton variante="cafe" href="/modulos" className="w-full">
          Ir a Módulos
        </Boton>
        {tipo === "cambio-correo" ? (
          <Link href="/perfil" className={claseEnlace}>
            Ver mi perfil
          </Link>
        ) : null}
      </>
    );
  } else if (resultado.estado === "vencido") {
    contenido = (
      <>
        <IconoDeEstado>
          <IconoReloj className="size-[34px] text-marca-terracota" />
        </IconoDeEstado>
        <Titulo>Este enlace ya venció</Titulo>
        {tipo === "cambio-correo" ? (
          <>
            <Texto>Los enlaces para cambiar el correo duran 30 minutos. Pide el cambio de nuevo desde tu Perfil.</Texto>
            <Boton variante="cafe" href="/perfil" className="w-full">
              Ir a mi Perfil
            </Boton>
          </>
        ) : (
          <>
            <Texto>Los enlaces de verificación duran 24 horas. Pide uno nuevo y úsalo dentro de ese tiempo.</Texto>
            <ReenviarEnlace correoConocido={null} principal />
            <p className="text-detalle text-texto-secundario">
              Si hay una cuenta pendiente con ese correo, te enviaremos un enlace nuevo.
            </p>
          </>
        )}
      </>
    );
  } else if (resultado.estado === "usado") {
    contenido = (
      <>
        <IconoDeEstado>
          <IconoAlerta className="size-[34px] text-texto-secundario" />
        </IconoDeEstado>
        <Titulo>Este enlace ya se usó</Titulo>
        <Texto>
          {tipo === "cambio-correo"
            ? "Cada enlace funciona una sola vez. Si ya confirmaste el cambio, inicia sesión con tu correo nuevo."
            : "Cada enlace funciona una sola vez. Si ya activaste tu cuenta, inicia sesión para continuar."}
        </Texto>
        <Boton variante="cafe" href="/iniciar-sesion" className="w-full">
          Iniciar sesión
        </Boton>
        {tipo === "verificacion" ? (
          <Link href="/verificar-correo" onClick={() => setResultado(null)} className={claseEnlace}>
            Pedir un enlace nuevo
          </Link>
        ) : null}
      </>
    );
  } else {
    contenido = (
      <>
        <Titulo>No pudimos revisar el enlace</Titulo>
        <Alerta tono="error" role="alert" titulo="Algo salió mal">
          {mensajeDeError(resultado.error)}
        </Alerta>
        <Boton variante="contornoClaro" type="button" onClick={reintentar} className="w-full">
          Intentar de nuevo
        </Boton>
      </>
    );
  }

  return (
    <PantallaDeAcceso saludo={panel.saludo} entrada={panel.entrada}>
      {contenido}
    </PantallaDeAcceso>
  );
}
