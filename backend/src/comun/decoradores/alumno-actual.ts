import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type MetodoAcceso = 'correo' | 'google' | 'ambos';

/** Alumno de la sesión, tal como lo dejó la guardia de sesión en la petición. */
export interface AlumnoSesion {
  usuarioId: string;
  sesionId: string;
  nombre: string;
  apellidos: string | null;
  metodoAcceso: MetodoAcceso;
  /** Momento en que caduca la sesión si no hay más actividad. */
  expiraEn: Date;
  aceptacionPendiente: { aviso: boolean; terminos: boolean };
}

export type PeticionConAlumno = Request & { alumno?: AlumnoSesion };

/** Inyecta en el controlador al alumno de la sesión. Solo en rutas con sesión (sin @Publica). */
export const AlumnoActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): AlumnoSesion => {
    const peticion = contexto.switchToHttp().getRequest<PeticionConAlumno>();
    if (!peticion.alumno) {
      throw new Error('@AlumnoActual se usó en una ruta sin sesión');
    }
    return peticion.alumno;
  },
);
