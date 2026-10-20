import Image from "next/image";
import upChiapas from "../../../../public/imagenes/inicio/up-chiapas.png";
import logoEquipo from "../../../../public/imagenes/inicio/logo-equipo.png";
import { EncabezadoSeccion } from "./EncabezadoSeccion";

// Nombres y cargos tal como están en Figma (84:652).
const personas = [
  { iniciales: "ÁM", nombre: "Ángel Eduardo Moreno Moreno", cargo: "Estudiante · Ingeniería en TI", docente: false },
  { iniciales: "BR", nombre: "Brian Luis Ruiz Pérez", cargo: "Estudiante · Ingeniería en TI", docente: false },
  { iniciales: "DZ", nombre: "Diego Alberto Zárate Vázquez", cargo: "Estudiante · Ingeniería en TI", docente: false },
  { iniciales: "JV", nombre: "José Pablo Vázquez Cruz", cargo: "Docente de Ética y Legislación en TI", docente: true },
] as const;

/** Sección «Quiénes somos» (84:648): equipo, docente y logos institucionales. */
export function QuienesSomos() {
  return (
    <section
      id="quienes-somos"
      aria-labelledby="titulo-quienes-somos"
      data-fondo="claro"
      className="bg-marca-crema px-5 py-20 text-marca-cafe md:px-10 md:py-28 lg:px-[72px] lg:py-[130px]"
    >
      <div className="mx-auto w-full max-w-[1296px]">
        <EncabezadoSeccion
          id="titulo-quienes-somos"
          titulo="Hecho por estudiantes, para estudiantes"
          entrada="Somos estudiantes de Ingeniería en Tecnologías de la Información e Innovación Digital de la Universidad Politécnica de Chiapas. Creamos Echo en la materia de Ética y Legislación en TI para que aprender sobre responsabilidad profesional sea claro, accesible y cercano."
          tono="claro"
          proporcion="entrada-amplia"
        />

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-14 xl:grid-cols-4">
          {personas.map((persona) => (
            <li
              key={persona.nombre}
              data-fondo={persona.docente ? "oscuro" : undefined}
              className={[
                "flex flex-col gap-4 rounded-tarjeta p-[26px]",
                persona.docente ? "bg-marca-cafe text-marca-crema" : "bg-superficie-hundida",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className={[
                  "flex size-16 items-center justify-center rounded-full font-titulo text-tarjeta leading-normal font-extrabold",
                  persona.docente ? "bg-marca-menta text-marca-cafe" : "bg-marca-cafe text-marca-menta",
                ].join(" ")}
              >
                {persona.iniciales}
              </span>
              <h3 className="font-titulo text-tarjeta font-bold">{persona.nombre}</h3>
              <p className={`text-detalle ${persona.docente ? "" : "text-texto-secundario"}`}>
                {persona.cargo}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-12 lg:mt-14">
          <div className="flex shrink-0 flex-wrap gap-5">
            <div className="rounded-logo bg-blanco px-[18px] py-3">
              <Image
                src={upChiapas}
                alt="Universidad Politécnica de Chiapas"
                sizes="124px"
                className="h-auto w-[124px]"
              />
            </div>
            <div className="rounded-logo bg-marca-cafe px-[18px] py-3">
              <Image
                src={logoEquipo}
                alt="Lethal Code, el equipo que creó Echo"
                sizes="134px"
                className="h-auto w-[134px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
