import type {
  AlumnoSesion,
  MetodoAcceso,
} from '../../../comun/decoradores/alumno-actual';
import { aIsoUtc } from '../../../comun/utilidades/fechas';

/** Esquema `Sesion` de docs/api/openapi.yaml. */
export interface SesionSalida {
  nombre: string;
  apellidos: string | null;
  metodoAcceso: MetodoAcceso;
  expiraEn: string;
  aceptacionPendiente: { aviso: boolean; terminos: boolean };
}

export function aSesionSalida(alumno: AlumnoSesion): SesionSalida {
  return {
    nombre: alumno.nombre,
    apellidos: alumno.apellidos,
    metodoAcceso: alumno.metodoAcceso,
    expiraEn: aIsoUtc(alumno.expiraEn),
    aceptacionPendiente: {
      aviso: alumno.aceptacionPendiente.aviso,
      terminos: alumno.aceptacionPendiente.terminos,
    },
  };
}
