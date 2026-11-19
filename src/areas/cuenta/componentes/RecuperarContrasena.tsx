"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { Campo } from "@/componentes/ui/Campo";
import { CorreoEnTexto } from "@/componentes/ui/CorreoEnTexto";
import { IconoSobre } from "@/componentes/ui/iconos/iconos";
import { apiNavegador } from "@/lib/api/navegador";
import { avisosDeCuenta, mensajeDeCampo, mensajeDeError } from "@/lib/api/mensajes";
import { PantallaDeAcceso } from "./PantallaDeAcceso";

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PANEL_RECUPERAR = {
  saludo: ["Recupera", "tu acceso."],
  entrada: "Tu avance está a salvo: solo necesitas una contraseña nueva.",
} as const;

const claseEnlace =
  "inline-flex min-h-6 items-center self-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2";

/**
 * SCR-04, paso 1 (Figma 83:637 y 83:696; móvil 149:5767). Pide el enlace (OP-06) y, exista o no la cuenta, responde
 * siempre lo mismo (DEC-77), con «Si entras con Google, no necesitas contraseña». El correo se queda en el estado de
 * la página; nunca va a la URL.
 */
export function RecuperarContrasena() {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [fallo, setFallo] = useState<{ mensaje: string; clave: number } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const recuadro = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (fallo) recuadro.current?.focus();
  }, [fallo]);

  // El formulario desaparece al enviarse: el foco pasa al título nuevo para no perderse.
  useEffect(() => {
    if (enviado) titulo.current?.focus();
  }, [enviado]);

  function validar(valor: string) {
    const limpio = valor.trim();
    if (!limpio) return mensajeDeCampo("correo", "OBLIGATORIO");
    return FORMATO_CORREO.test(limpio) ? null : mensajeDeCampo("correo", "FORMATO_INVALIDO");
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const problema = validar(correo);
    setError(problema);
    if (problema) {
      document.getElementById("recuperar-correo")?.focus();
      return;
    }
    setEnviando(true);
    const limpio = correo.trim().toLowerCase();
    const resultado = await apiNavegador.solicitarRecuperacion({ cuerpo: { correo: limpio } });
    setEnviando(false);
    if (resultado.ok) {
      setEnviado(limpio);
      return;
    }
    setFallo((anterior) => ({ mensaje: mensajeDeError(resultado.error), clave: (anterior?.clave ?? 0) + 1 }));
  }

  return (
    <PantallaDeAcceso saludo={PANEL_RECUPERAR.saludo} entrada={PANEL_RECUPERAR.entrada}>
      {enviado ? (
        <>
          <span aria-hidden="true" className="flex size-[72px] items-center justify-center rounded-full bg-superficie-hundida">
            <IconoSobre className="size-[34px] text-marca-bosque" />
          </span>
          <h1 ref={titulo} tabIndex={-1} className="font-titulo text-[32px] leading-[1.1] font-extrabold tracking-[-0.015em] outline-none lg:text-[40px]">
            Revisa tu correo
          </h1>
          <p className="text-cuerpo text-texto-secundario">
            Pediste el enlace para <CorreoEnTexto correo={enviado} />.
          </p>
          <Alerta tono="correo" role="status" titulo="Solicitud enviada">
            {avisosDeCuenta.recuperacionEnviada}
          </Alerta>
          <Boton variante="contornoClaro" href="/iniciar-sesion" className="w-full">
            Volver a iniciar sesión
          </Boton>
          <button type="button" onClick={() => setEnviado(null)} className={claseEnlace}>
            Usar otro correo
          </button>
        </>
      ) : (
        <>
          <h1 className="font-titulo text-[32px] leading-[1.1] font-extrabold tracking-[-0.015em] text-balance lg:text-[40px]">
            Recupera tu contraseña
          </h1>
          <p className="text-cuerpo text-texto-secundario">
            Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
          </p>
          {fallo ? (
            <Alerta key={fallo.clave} ref={recuadro} id="respuesta" tono="error" role="alert" titulo="No pudimos enviar el enlace">
              {fallo.mensaje}
            </Alerta>
          ) : null}
          <form noValidate onSubmit={enviar} aria-label="Pedir un enlace para crear una contraseña nueva" className="flex flex-col gap-5">
            <Campo
              id="recuperar-correo"
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
              onChange={(evento) => {
                setCorreo(evento.target.value);
                if (error) setError(validar(evento.target.value));
              }}
              onBlur={() => correo && setError(validar(correo))}
            />
            <Boton
              variante="cafe"
              type="submit"
              aria-disabled={enviando || undefined}
              className="w-full aria-disabled:cursor-wait aria-disabled:bg-texto-secundario"
            >
              {enviando ? "Enviando enlace…" : "Enviar enlace"}
            </Boton>
          </form>
          <Link href="/iniciar-sesion" className={claseEnlace}>
            Volver a iniciar sesión
          </Link>
        </>
      )}
    </PantallaDeAcceso>
  );
}
