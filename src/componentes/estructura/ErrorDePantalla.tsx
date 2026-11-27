import Link from "next/link";
import type { ReactNode } from "react";
import { Alerta } from "@/componentes/ui/Alerta";
import { Migas, type Miga } from "@/componentes/ui/Migas";
import { mensajeDeError } from "@/lib/api/mensajes";
import type { ErrorApi } from "@/lib/api/errores";

/**
 * Lo que muestra una pantalla de la app cuando su lectura falla: migas, el recuadro de error y una salida. El mismo
 * patrón que SCR-07 y SCR-08 («No pudimos abrir este módulo»), para no repetirlo en cada vista.
 */
export function ErrorDePantalla({
  titulo,
  error,
  migas,
  salida,
  children,
}: {
  titulo: string;
  error: ErrorApi;
  migas?: Miga[];
  salida: { texto: string; href: string };
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      {migas ? <Migas elementos={migas} /> : null}
      <Alerta tono="error" role="alert" titulo={titulo} className="w-full">
        {children ?? mensajeDeError(error)}
      </Alerta>
      <Link
        href={salida.href}
        className="inline-flex min-h-11 items-center font-titulo text-menor font-bold text-marca-cafe underline underline-offset-4 hover:decoration-2"
      >
        {salida.texto}
      </Link>
    </div>
  );
}
