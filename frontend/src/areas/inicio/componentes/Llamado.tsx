import { Moris } from "@/componentes/marca/Moris";
import { Boton } from "@/componentes/ui/Boton";

/** Cierre con llamada a la acción (84:680). */
export function Llamado() {
  return (
    <section
      aria-labelledby="titulo-llamado"
      data-fondo="oscuro"
      className="bg-marca-cafe px-5 py-20 text-marca-crema md:px-10 md:py-28 lg:px-[72px] lg:py-[110px]"
    >
      <div className="mx-auto grid w-full max-w-[1296px] items-center gap-12 xl:grid-cols-[minmax(0,600px)_560px] xl:justify-between">
        <div className="flex flex-col gap-6">
          <h2 id="titulo-llamado" className="font-titulo text-cierre font-black text-balance">
            Tu primera lección <span className="sm:block">te espera.</span>
          </h2>
          <p className="max-w-[520px] text-amplio">
            Crea tu cuenta con tu correo o con Google. Solo te pedimos tu nombre, tus apellidos y tu correo.
          </p>
          <div className="flex flex-col gap-2.5 md:flex-row md:gap-4">
            <Boton variante="crema" conFlecha href="/registro" className="w-full md:w-[200px]">
              Crear cuenta
            </Boton>
            <Boton variante="contorno" href="/iniciar-sesion" className="w-full md:w-[200px]">
              Ya tengo cuenta
            </Boton>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:relative sm:mx-auto sm:h-[340px] sm:w-[560px] sm:max-w-full xl:mx-0">
          <p className="revelar-globo max-w-[330px] rounded-burbuja border border-blanco/16 bg-marca-crema/8 px-[22px] py-[18px] text-base font-semibold backdrop-blur-vidrio sm:absolute sm:top-0 sm:left-0 sm:w-[330px]">
            <span className="sr-only">Moris dice: </span>
            ¡Hola! Soy Moris. ¡Qué alegría tenerte aquí! Vamos a explorar Echo juntos.
          </p>
          <Moris
            expresion="feliz"
            alt=""
            sizes="260px"
            className="brotar-al-ver w-[200px] self-end sm:absolute sm:right-0 sm:bottom-0 sm:w-[260px]"
          />
        </div>
      </div>
    </section>
  );
}
