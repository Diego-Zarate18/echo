import { DibujoDeIconos } from "@/areas/inicio/componentes/DibujoDeIconos";
import { EncabezadoPublico } from "@/areas/inicio/componentes/EncabezadoPublico";
import { Llamado } from "@/areas/inicio/componentes/Llamado";
import { PorQueEcho } from "@/areas/inicio/componentes/PorQueEcho";
import { Presentacion } from "@/areas/inicio/componentes/Presentacion";
import { QueEncontraras } from "@/areas/inicio/componentes/QueEncontraras";
import { QueEsEcho } from "@/areas/inicio/componentes/QueEsEcho";
import { QuienesSomos } from "@/areas/inicio/componentes/QuienesSomos";

/** SCR-18 · Inicio público (DEC-78, DEC-83). Contenido fijo: no invoca operaciones. */
export default function Inicio() {
  return (
    <div className="relative">
      <EncabezadoPublico />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Presentacion />
        <QueEsEcho />
        <QueEncontraras />
        <PorQueEcho />
        <QuienesSomos />
        <Llamado />
      </main>
      <DibujoDeIconos />
    </div>
  );
}
