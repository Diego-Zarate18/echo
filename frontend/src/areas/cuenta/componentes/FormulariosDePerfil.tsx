"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { Campo, CampoContrasena } from "@/componentes/ui/Campo";
import { Casilla } from "@/componentes/ui/Casilla";
import { CASILLAS } from "@/areas/cuenta/textosDeConsentimiento";
import type { components } from "@/lib/api/esquema";
import type { ErrorApi } from "@/lib/api/errores";
import { apiNavegador } from "@/lib/api/navegador";
import { avisosDeCuenta, mensajeDeCampo, mensajeDeError } from "@/lib/api/mensajes";
import { rutasDeNavegacion } from "@/lib/api/operaciones";
import { RequisitosContrasena, requisitoQueFalta } from "./RequisitosContrasena";

type Errores = Partial<Record<string, string>>;
type Aviso = { tono: "error" | "correo"; titulo: string; texto: string; clave: number } | null;

const claseBotonEnviar = "self-start aria-disabled:cursor-wait aria-disabled:bg-texto-secundario";

/** Aviso de un formulario: recibe el foco al aparecer para que el lector de pantalla lo lea (como en Restablecer). */
function AvisoDeFormulario({ aviso }: { aviso: Aviso }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (aviso) ref.current?.focus();
  }, [aviso]);
  if (!aviso) return null;
  return (
    <Alerta key={aviso.clave} ref={ref} tono={aviso.tono} role={aviso.tono === "error" ? "alert" : "status"} titulo={aviso.titulo}>
      {aviso.texto}
    </Alerta>
  );
}

/** Errores por campo de DATOS_INVALIDOS; `null` si el error no es de campos. */
function erroresDeCampos(error: ErrorApi): Errores | null {
  if (error.codigo !== "DATOS_INVALIDOS" || !error.campos) return null;
  return Object.fromEntries(Object.entries(error.campos).map(([campo, codigo]) => [campo, codigo ? mensajeDeCampo(campo, codigo) : undefined]));
}

function enfocarPrimerError(prefijo: string, errores: Errores, orden: string[]) {
  const primero = orden.find((campo) => errores[campo]);
  if (primero) document.getElementById(`${prefijo}-${primero}`)?.focus();
}

function Formulario({ etiqueta, onSubmit, children }: { etiqueta: string; onSubmit: (e: FormEvent<HTMLFormElement>) => void; children: ReactNode }) {
  return (
    <form noValidate aria-label={etiqueta} onSubmit={onSubmit} className="flex flex-col gap-4">
      {children}
    </form>
  );
}

/** OP-09: nombre y apellidos (los apellidos pueden faltar en cuentas de Google, DEC-22, pero al guardar se piden). */
export function EditarNombre({ nombre: nombreInicial, apellidos: apellidosIniciales }: { nombre: string; apellidos: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [apellidos, setApellidos] = useState(apellidosIniciales);
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const locales: Errores = {
      nombre: nombre.trim() ? undefined : mensajeDeCampo("nombre", "OBLIGATORIO"),
      apellidos: apellidos.trim() ? undefined : mensajeDeCampo("apellidos", "OBLIGATORIO"),
    };
    setErrores(locales);
    if (locales.nombre || locales.apellidos) return enfocarPrimerError("perfil", locales, ["nombre", "apellidos"]);
    setEnviando(true);
    const resultado = await apiNavegador.editarNombre({ cuerpo: { nombre: nombre.trim(), apellidos: apellidos.trim() } });
    setEnviando(false);
    if (resultado.ok) {
      setAviso((a) => ({ tono: "correo", titulo: "Listo", texto: "Guardamos tu nombre.", clave: (a?.clave ?? 0) + 1 }));
      router.refresh();
      return;
    }
    const deCampos = erroresDeCampos(resultado.error);
    if (deCampos) {
      setErrores(deCampos);
      return enfocarPrimerError("perfil", deCampos, ["nombre", "apellidos"]);
    }
    setAviso((a) => ({ tono: "error", titulo: "No pudimos guardar tu nombre", texto: mensajeDeError(resultado.error), clave: (a?.clave ?? 0) + 1 }));
  }

  return (
    <Formulario etiqueta="Editar nombre" onSubmit={enviar}>
      <AvisoDeFormulario aviso={aviso} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="perfil-nombre" name="nombre" etiqueta="Nombre(s)" autoComplete="given-name" maxLength={100} value={nombre} error={errores.nombre} onChange={(e) => setNombre(e.target.value)} />
        <Campo
          id="perfil-apellidos"
          name="apellidos"
          etiqueta="Apellido(s)"
          autoComplete="family-name"
          maxLength={100}
          value={apellidos}
          error={errores.apellidos}
          onChange={(e) => setApellidos(e.target.value)}
        />
      </div>
      <Boton variante="cafe" tamano="mediano" type="submit" aria-disabled={enviando || undefined} className={claseBotonEnviar}>
        {enviando ? "Guardando…" : "Guardar cambios"}
      </Boton>
    </Formulario>
  );
}

/** OP-11: siempre «Revisa tu correo nuevo», exista o no una cuenta con ese correo (DEC-77). */
export function CambiarCorreo() {
  const [correoNuevo, setCorreoNuevo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);
  const orden = ["correoNuevo", "contrasena"];

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const correo = correoNuevo.trim().toLowerCase();
    const locales: Errores = {
      correoNuevo: !correo ? mensajeDeCampo("correoNuevo", "OBLIGATORIO") : /^\S+@\S+\.\S+$/.test(correo) ? undefined : mensajeDeCampo("correoNuevo", "FORMATO_INVALIDO"),
      contrasena: contrasena ? undefined : mensajeDeCampo("contrasena", "OBLIGATORIO"),
    };
    setErrores(locales);
    if (locales.correoNuevo || locales.contrasena) return enfocarPrimerError("correo", locales, orden);
    setEnviando(true);
    const resultado = await apiNavegador.cambiarCorreo({ cuerpo: { correoNuevo: correo, contrasena } });
    setEnviando(false);
    if (resultado.ok) {
      setContrasena("");
      setAviso((a) => ({ tono: "correo", titulo: "Revisa tu correo nuevo", texto: avisosDeCuenta.cambioDeCorreoEnviado, clave: (a?.clave ?? 0) + 1 }));
      return;
    }
    if (resultado.error.codigo === "CONTRASENA_INCORRECTA") {
      setErrores({ contrasena: mensajeDeError(resultado.error) });
      return document.getElementById("correo-contrasena")?.focus();
    }
    const deCampos = erroresDeCampos(resultado.error);
    if (deCampos) {
      setErrores(deCampos);
      return enfocarPrimerError("correo", deCampos, orden);
    }
    setAviso((a) => ({ tono: "error", titulo: "No pudimos pedir el cambio", texto: mensajeDeError(resultado.error), clave: (a?.clave ?? 0) + 1 }));
  }

  return (
    <Formulario etiqueta="Cambiar correo" onSubmit={enviar}>
      <AvisoDeFormulario aviso={aviso} />
      <div className="flex flex-col gap-4">
        <Campo id="correo-correoNuevo" name="correoNuevo" type="email" etiqueta="Correo nuevo" autoComplete="email" maxLength={254} value={correoNuevo} error={errores.correoNuevo} onChange={(e) => setCorreoNuevo(e.target.value)} />
        <CampoContrasena id="correo-contrasena" name="contrasena" etiqueta="Contraseña actual" ayuda="La pedimos para confirmar que eres tú." autoComplete="current-password" maxLength={200} value={contrasena} error={errores.contrasena} onChange={(e) => setContrasena(e.target.value)} />
      </div>
      <Boton variante="cafe" tamano="mediano" type="submit" aria-disabled={enviando || undefined} className={claseBotonEnviar}>
        {enviando ? "Enviando…" : "Enviar enlace"}
      </Boton>
    </Formulario>
  );
}

/** OP-10: pide la actual, aplica los requisitos de DEC-25 y cierra las demás sesiones. */
export function CambiarContrasena() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);
  const orden = ["contrasenaActual", "contrasenaNueva"];

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const locales: Errores = {
      contrasenaActual: actual ? undefined : mensajeDeCampo("contrasena", "OBLIGATORIO"),
      contrasenaNueva: nueva ? requisitoQueFalta(nueva) : mensajeDeCampo("contrasena", "OBLIGATORIO"),
    };
    setErrores(locales);
    if (locales.contrasenaActual || locales.contrasenaNueva) return enfocarPrimerError("contrasena", locales, orden);
    setEnviando(true);
    const resultado = await apiNavegador.cambiarContrasena({ cuerpo: { contrasenaActual: actual, contrasenaNueva: nueva } });
    setEnviando(false);
    if (resultado.ok) {
      setActual("");
      setNueva("");
      setAviso((a) => ({ tono: "correo", titulo: "Listo, tu contraseña cambió", texto: "Cerramos tus sesiones en los demás dispositivos.", clave: (a?.clave ?? 0) + 1 }));
      return;
    }
    if (resultado.error.codigo === "CONTRASENA_INCORRECTA") {
      setErrores({ contrasenaActual: mensajeDeError(resultado.error) });
      return document.getElementById("contrasena-contrasenaActual")?.focus();
    }
    const deCampos = erroresDeCampos(resultado.error);
    if (deCampos) {
      setErrores(deCampos);
      return enfocarPrimerError("contrasena", deCampos, orden);
    }
    setAviso((a) => ({ tono: "error", titulo: "No pudimos cambiar tu contraseña", texto: mensajeDeError(resultado.error), clave: (a?.clave ?? 0) + 1 }));
  }

  return (
    <Formulario etiqueta="Cambiar contraseña" onSubmit={enviar}>
      <AvisoDeFormulario aviso={aviso} />
      <div className="flex flex-col gap-4">
        <CampoContrasena id="contrasena-contrasenaActual" name="contrasenaActual" etiqueta="Contraseña actual" autoComplete="current-password" maxLength={200} value={actual} error={errores.contrasenaActual} onChange={(e) => setActual(e.target.value)} />
        <div className="flex flex-col gap-3">
          <CampoContrasena
            id="contrasena-contrasenaNueva"
            name="contrasenaNueva"
            etiqueta="Contraseña nueva"
            autoComplete="new-password"
            maxLength={200}
            describe="contrasena-requisitos"
            value={nueva}
            error={errores.contrasenaNueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          <RequisitosContrasena id="contrasena-requisitos" contrasena={nueva} />
        </div>
      </div>
      <Boton variante="cafe" tamano="mediano" type="submit" aria-disabled={enviando || undefined} className={claseBotonEnviar}>
        {enviando ? "Guardando…" : "Cambiar contraseña"}
      </Boton>
    </Formulario>
  );
}

/** OP-05 (todas): revoca todas las sesiones, también esta; la cookie se borra y se vuelve a Iniciar sesión. */
export function CerrarTodasLasSesiones() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  async function cerrar() {
    if (enviando) return;
    setEnviando(true);
    const resultado = await apiNavegador.cerrarTodasLasSesiones();
    if (!resultado.ok && resultado.error.estado !== 401) {
      setEnviando(false);
      setAviso((a) => ({ tono: "error", titulo: "No pudimos cerrar tus sesiones", texto: mensajeDeError(resultado.error), clave: (a?.clave ?? 0) + 1 }));
      return;
    }
    router.replace("/iniciar-sesion");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-menor text-marca-cafe">Se cerrará la sesión en todos los dispositivos, incluido este.</p>
      <AvisoDeFormulario aviso={aviso} />
      <Boton variante="contornoClaro" tamano="mediano" type="button" onClick={cerrar} aria-disabled={enviando || undefined}>
        {enviando ? "Cerrando sesiones…" : "Cerrar sesión en todos lados"}
      </Boton>
    </div>
  );
}

/** OP-39: las dos negativas del Anexo A; desmarcadas significa que el alumno no se opone. */
export function PreferenciasDePrivacidad({ preferencias }: { preferencias: components["schemas"]["Preferencias"] }) {
  const [valores, setValores] = useState(preferencias);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    const resultado = await apiNavegador.cambiarPreferenciasPrivacidad({ cuerpo: valores });
    setEnviando(false);
    setAviso((a) =>
      resultado.ok
        ? { tono: "correo", titulo: "Listo", texto: "Guardamos tus preferencias.", clave: (a?.clave ?? 0) + 1 }
        : { tono: "error", titulo: "No pudimos guardar tus preferencias", texto: mensajeDeError(resultado.error), clave: (a?.clave ?? 0) + 1 },
    );
    if (resultado.ok) setValores(resultado.datos);
  }

  return (
    <Formulario etiqueta="Preferencias de privacidad" onSubmit={enviar}>
      <AvisoDeFormulario aviso={aviso} />
      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">Usos opcionales de tus datos</legend>
        {(["negativaEncuesta", "negativaEstadisticas"] as const).map((nombre) => (
          <Casilla key={nombre} id={`privacidad-${nombre}`} name={nombre} checked={valores[nombre]} onChange={(e) => setValores((v) => ({ ...v, [nombre]: e.target.checked }))}>
            {CASILLAS[nombre]}
          </Casilla>
        ))}
      </fieldset>
      <Boton variante="cafe" tamano="mediano" type="submit" aria-disabled={enviando || undefined} className={claseBotonEnviar}>
        {enviando ? "Guardando…" : "Guardar preferencias"}
      </Boton>
    </Formulario>
  );
}

/**
 * OP-14: anonimiza la cuenta (INV-01). Se confirma en un `<dialog>` modal (atrapa el foco y cierra con Esc).
 * Con contraseña, la pide; con Google, exige volver a entrar con Google: el callback regresa con `?reingreso=google`
 * y el diálogo se abre solo.
 */
export function EliminarCuenta({ conContrasena, reingresoGoogle }: { conContrasena: boolean; reingresoGoogle: boolean }) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [confirmacion, setConfirmacion] = useState(false);
  const [contrasena, setContrasena] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);
  const [pedirReingreso, setPedirReingreso] = useState(false);

  useEffect(() => {
    if (reingresoGoogle) dialogo.current?.showModal();
  }, [reingresoGoogle]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const locales: Errores = {
      confirmacion: confirmacion ? undefined : mensajeDeCampo("confirmacion", "CASILLA_OBLIGATORIA"),
      contrasena: !conContrasena || contrasena ? undefined : mensajeDeCampo("contrasena", "OBLIGATORIO"),
    };
    setErrores(locales);
    if (locales.confirmacion || locales.contrasena) return enfocarPrimerError("eliminar", locales, ["confirmacion", "contrasena"]);
    setEnviando(true);
    const resultado = await apiNavegador.eliminarCuenta({ cuerpo: conContrasena ? { confirmacion, contrasena } : { confirmacion } });
    if (resultado.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setEnviando(false);
    const { error } = resultado;
    if (error.codigo === "CONTRASENA_INCORRECTA") {
      setErrores({ contrasena: mensajeDeError(error) });
      return document.getElementById("eliminar-contrasena")?.focus();
    }
    if (error.codigo === "REINGRESO_REQUERIDO") setPedirReingreso(true);
    const deCampos = erroresDeCampos(error);
    if (deCampos) {
      setErrores(deCampos);
      return enfocarPrimerError("eliminar", deCampos, ["confirmacion", "contrasena"]);
    }
    setAviso((a) => ({ tono: "error", titulo: "No pudimos eliminar tu cuenta", texto: mensajeDeError(error), clave: (a?.clave ?? 0) + 1 }));
  }

  const enlaceGoogle = `${rutasDeNavegacion.entrarConGoogle}?proposito=eliminar`;
  const necesitaGoogle = !conContrasena && (!reingresoGoogle || pedirReingreso);

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-menor text-marca-cafe">
        Borraremos tu nombre, apellidos, correo y {conContrasena ? "contraseña" : "tu vínculo con Google"}. Tus resultados se conservan sin forma de saber que eran tuyos. Tu correo quedará libre para crear una cuenta nueva desde cero.
      </p>
      {!conContrasena ? <p className="text-detalle text-texto-secundario">Como entras con Google, te pediremos volver a entrar con Google para confirmar.</p> : null}
      {necesitaGoogle && !pedirReingreso ? (
        <Boton variante="contornoClaro" tamano="mediano" href={enlaceGoogle}>
          Confirmar con Google
        </Boton>
      ) : (
        <Boton variante="contornoClaro" tamano="mediano" type="button" onClick={() => dialogo.current?.showModal()} className="border-estado-riesgosa! text-estado-riesgosa!">
          Eliminar mi cuenta
        </Boton>
      )}

      <dialog
        ref={dialogo}
        aria-labelledby="eliminar-titulo"
        aria-describedby="eliminar-descripcion"
        className="m-auto w-[min(560px,calc(100%-32px))] rounded-tarjeta bg-superficie-elevada p-6 text-marca-cafe shadow-hero backdrop:bg-marca-cafe/60 md:p-8"
      >
        <form noValidate onSubmit={enviar} className="flex flex-col gap-5">
          <h2 id="eliminar-titulo" className="font-titulo text-tarjeta font-extrabold">
            ¿Eliminar tu cuenta?
          </h2>
          <p id="eliminar-descripcion" className="text-menor">
            Borraremos tu nombre, apellidos, correo y {conContrasena ? "contraseña" : "tu vínculo con Google"}, y cerraremos tu sesión. Tus resultados se conservan sin forma de saber que eran tuyos. No se puede deshacer.
          </p>
          <AvisoDeFormulario aviso={aviso} />
          {pedirReingreso ? (
            <Boton variante="cafe" tamano="mediano" href={enlaceGoogle} className="self-start">
              Volver a entrar con Google
            </Boton>
          ) : null}
          <Casilla id="eliminar-confirmacion" name="confirmacion" checked={confirmacion} error={errores.confirmacion} onChange={(e) => setConfirmacion(e.target.checked)}>
            Entiendo que mi cuenta se elimina para siempre.
          </Casilla>
          {conContrasena ? (
            <CampoContrasena id="eliminar-contrasena" name="contrasena" etiqueta="Tu contraseña" autoComplete="current-password" maxLength={200} value={contrasena} error={errores.contrasena} onChange={(e) => setContrasena(e.target.value)} />
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Boton variante="cafe" tamano="mediano" type="submit" aria-disabled={enviando || undefined} className="bg-estado-riesgosa hover:bg-estado-riesgosa/90 aria-disabled:cursor-wait">
              {enviando ? "Eliminando…" : "Sí, eliminar mi cuenta"}
            </Boton>
            <Boton variante="contornoClaro" tamano="mediano" type="button" onClick={() => dialogo.current?.close()}>
              Cancelar
            </Boton>
          </div>
        </form>
      </dialog>
    </div>
  );
}
