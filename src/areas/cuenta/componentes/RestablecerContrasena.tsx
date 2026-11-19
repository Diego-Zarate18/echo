"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { CampoContrasena } from "@/componentes/ui/Campo";
import { IconoCirculoCheck, IconoReloj } from "@/componentes/ui/iconos/iconos";
import { apiNavegador } from "@/lib/api/navegador";
import { mensajeDeCampo, mensajeDeError } from "@/lib/api/mensajes";
import { PantallaDeAcceso } from "./PantallaDeAcceso";
import { PANEL_RECUPERAR } from "./RecuperarContrasena";
import { RequisitosContrasena, requisitoQueFalta } from "./RequisitosContrasena";

type Estado = "formulario" | "listo" | "vencido" | "usado" | "invalido";

/**
 * El código del enlace se lee una vez de la URL y se guarda aquí, porque en cuanto se lee se quita de la barra de
 * direcciones (`history.replaceState`). Con `useSyncExternalStore` el HTML estático no trae ninguno y no hay diferencias
 * al hidratar. Se borra al usarse, para que otra visita a la página no lo reutilice.
 */
let codigoDelEnlace: string | null = null;
/** En el HTML estático (y al hidratar) aún no se sabe si hay código: se dibuja el formulario, el caso común. */
const SIN_LEER = "";
const sinSuscripcion = () => () => {};
function leerCodigo() {
  const enLaUrl = new URLSearchParams(window.location.search).get("codigo");
  if (enLaUrl) codigoDelEnlace = enLaUrl;
  return codigoDelEnlace;
}

const claseEnlace =
  "inline-flex min-h-6 items-center self-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2";

function IconoDeEstado({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="flex size-[72px] items-center justify-center rounded-full bg-superficie-hundida">
      {children}
    </span>
  );
}

/**
 * SCR-04, paso 2 (Figma 83:754, 83:834 y 83:888; móvil 149:5803). Contraseña nueva con los mismos requisitos de
 * Crear cuenta (DEC-25). OP-07 la guarda y cierra todas las sesiones, también la de este navegador.
 * Con ENLACE_INVALIDO, el `motivo` dice si el enlace venció o ya se usó.
 */
export function RestablecerContrasena() {
  const codigo = useSyncExternalStore(sinSuscripcion, leerCodigo, () => SIN_LEER);
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("formulario");
  const [fallo, setFallo] = useState<{ mensaje: string; clave: number } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const recuadro = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  // Fuera el código de la URL en cuanto se lee: no queda en el historial ni se comparte al copiar la dirección.
  useEffect(() => {
    // Se guarda antes de borrarlo, por si este efecto corre antes de que React lea la URL.
    leerCodigo();
    if (new URLSearchParams(window.location.search).has("codigo")) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (fallo) recuadro.current?.focus();
  }, [fallo]);

  // El formulario desaparece con el resultado: el foco pasa al título nuevo.
  useEffect(() => {
    if (estado !== "formulario") titulo.current?.focus();
  }, [estado]);

  function validar(valor: string) {
    return valor ? (requisitoQueFalta(valor) ?? null) : mensajeDeCampo("contrasena", "OBLIGATORIO");
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || !codigo || codigo === SIN_LEER) return;
    const problema = validar(contrasena);
    setError(problema);
    if (problema) {
      document.getElementById("nueva-contrasena")?.focus();
      return;
    }
    setEnviando(true);
    const resultado = await apiNavegador.restablecerContrasena({ cuerpo: { codigo, contrasena } });
    setEnviando(false);
    if (resultado.ok) {
      codigoDelEnlace = null;
      setEstado("listo");
      return;
    }
    const { error: delServidor } = resultado;
    if (delServidor.codigo === "ENLACE_INVALIDO") {
      codigoDelEnlace = null;
      setEstado(delServidor.motivo === "usado" ? "usado" : delServidor.motivo === "vencido" ? "vencido" : "invalido");
    } else if (delServidor.codigo === "DATOS_INVALIDOS" && delServidor.campos?.contrasena) {
      setError(mensajeDeCampo("contrasena", delServidor.campos.contrasena));
      document.getElementById("nueva-contrasena")?.focus();
    } else {
      setFallo((anterior) => ({ mensaje: mensajeDeError(delServidor), clave: (anterior?.clave ?? 0) + 1 }));
    }
  }

  const claseTitulo = "font-titulo text-[32px] leading-[1.1] font-extrabold tracking-[-0.015em] text-balance outline-none lg:text-[40px]";
  let contenido: ReactNode;

  if (estado === "listo") {
    contenido = (
      <>
        <IconoDeEstado>
          <IconoCirculoCheck className="size-[34px] text-marca-bosque" />
        </IconoDeEstado>
        <h1 ref={titulo} tabIndex={-1} className={claseTitulo}>
          Listo, tu contraseña cambió
        </h1>
        <p className="text-cuerpo text-texto-secundario">Cerramos todas tus sesiones abiertas. Inicia sesión con tu contraseña nueva.</p>
        <Boton variante="cafe" href="/iniciar-sesion" className="w-full">
          Iniciar sesión
        </Boton>
      </>
    );
  } else if (estado !== "formulario" || codigo === null) {
    // Sin código en la URL, o el backend dijo que el enlace ya no sirve (83:834).
    const tituloEstado = estado === "vencido" ? "Este enlace ya venció" : estado === "usado" ? "Este enlace ya se usó" : "Este enlace ya no funciona";
    contenido = (
      <>
        <IconoDeEstado>
          <IconoReloj className="size-[34px] text-marca-terracota" />
        </IconoDeEstado>
        <h1 ref={titulo} tabIndex={-1} className={claseTitulo}>
          {tituloEstado}
        </h1>
        <p className="text-cuerpo text-texto-secundario">
          Los enlaces para restablecer la contraseña duran 30 minutos y sirven una sola vez.
        </p>
        <Boton variante="cafe" href="/recuperar-contrasena" className="w-full">
          Pedir un enlace nuevo
        </Boton>
        <Link href="/iniciar-sesion" className={claseEnlace}>
          Volver a iniciar sesión
        </Link>
      </>
    );
  } else {
    contenido = (
      <>
        <h1 className={claseTitulo}>Crea una contraseña nueva</h1>
        {fallo ? (
          <Alerta key={fallo.clave} ref={recuadro} id="respuesta" tono="error" role="alert" titulo="No pudimos guardar tu contraseña">
            {fallo.mensaje}
          </Alerta>
        ) : null}
        <form noValidate onSubmit={enviar} aria-label="Crear una contraseña nueva" className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <CampoContrasena
              id="nueva-contrasena"
              name="contrasena"
              etiqueta="Contraseña nueva"
              autoComplete="new-password"
              maxLength={200}
              describe="nueva-requisitos"
              value={contrasena}
              error={error}
              onChange={(evento) => {
                setContrasena(evento.target.value);
                if (error) setError(validar(evento.target.value));
              }}
              onBlur={() => contrasena && setError(validar(contrasena))}
            />
            <RequisitosContrasena id="nueva-requisitos" contrasena={contrasena} />
          </div>
          <Alerta tono="aviso" role="status" titulo="Por tu seguridad">
            Al guardarla cerraremos todas tus sesiones abiertas, también la de este dispositivo.
          </Alerta>
          <Boton
            variante="cafe"
            type="submit"
            aria-disabled={enviando || undefined}
            className="w-full aria-disabled:cursor-wait aria-disabled:bg-texto-secundario"
          >
            {enviando ? "Guardando…" : "Guardar contraseña"}
          </Boton>
        </form>
      </>
    );
  }

  return (
    <PantallaDeAcceso saludo={PANEL_RECUPERAR.saludo} entrada={PANEL_RECUPERAR.entrada}>
      {contenido}
    </PantallaDeAcceso>
  );
}
