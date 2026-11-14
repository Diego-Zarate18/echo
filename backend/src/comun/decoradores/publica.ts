import { SetMetadata } from '@nestjs/common';

export const RUTA_PUBLICA = 'ruta_publica';

/** Ruta que no pide sesión. Sin este decorador, toda ruta exige una sesión válida. */
export const Publica = () => SetMetadata(RUTA_PUBLICA, true);
