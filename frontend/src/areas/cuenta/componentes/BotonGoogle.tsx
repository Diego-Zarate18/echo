import { Roboto } from "next/font/google";
import { rutasDeNavegacion } from "@/lib/api/operaciones";

/** Las pautas de marca de Google piden Roboto Medium en el botón (Figma 66:37). Solo se carga el peso 500. */
const roboto = Roboto({ weight: "500", subsets: ["latin"], display: "swap" });

/**
 * «Continuar con Google» (Botón/Google 66:37), tema claro de las pautas de Google: fondo blanco, borde #747775,
 * texto #1F1F1F y la «G» sin alterar. Es un enlace, no un `fetch`: el backend redirige a Google y de vuelta (OP-03).
 */
export function BotonGoogle() {
  return (
    <a
      href={rutasDeNavegacion.entrarConGoogle}
      className={`${roboto.className} flex h-14 w-full items-center justify-center gap-3 rounded-full border border-[#747775] bg-blanco text-[15px] text-[#1f1f1f] transition-[background-color,scale] duration-150 ease-(--ease-respuesta) hover:bg-superficie-elevada motion-safe:active:scale-[0.97]`}
    >
      {/* Logo de Google exportado de Figma (66:38), tal cual. */}
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="size-5 shrink-0">
        <path
          d="M10 3.95833C11.475 3.95833 12.7958 4.46667 13.8375 5.45833L16.6917 2.60417C14.9583 0.991667 12.6958 2.38419e-07 10 2.38419e-07C6.09167 2.38419e-07 2.7125 2.24167 1.06667 5.50833L4.39167 8.0875C5.17917 5.71667 7.39167 3.95833 10 3.95833Z"
          fill="#EA4335"
        />
        <path
          d="M19.575 10.2292C19.575 9.575 19.5125 8.94167 19.4167 8.33333H10V12.0917H15.3917C15.15 13.325 14.45 14.375 13.4 15.0833L16.6208 17.5833C18.5 15.8417 19.575 13.2667 19.575 10.2292Z"
          fill="#4285F4"
        />
        <path
          d="M4.3875 11.9125C4.1875 11.3083 4.07083 10.6667 4.07083 10C4.07083 9.33333 4.18333 8.69167 4.3875 8.0875L1.0625 5.50833C0.383334 6.85833 2.38419e-07 8.38333 2.38419e-07 10C2.38419e-07 11.6167 0.383334 13.1417 1.06667 14.4917L4.3875 11.9125Z"
          fill="#FBBC05"
        />
        <path
          d="M10 20C12.7 20 14.9708 19.1125 16.6208 17.5792L13.4 15.0792C12.5042 15.6833 11.35 16.0375 10 16.0375C7.39167 16.0375 5.17917 14.2792 4.3875 11.9083L1.0625 14.4875C2.7125 17.7583 6.09167 20 10 20Z"
          fill="#34A853"
        />
      </svg>
      Continuar con Google
    </a>
  );
}
