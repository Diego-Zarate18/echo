import { SetMetadata } from '@nestjs/common';

export const RUTA_CON_LIMITE_POR_IP = 'ruta_con_limite_por_ip';

/** Ruta de cuenta sujeta al límite de 60 peticiones cada 10 minutos por IP (DEC-26). */
export const LimitePorIp = () => SetMetadata(RUTA_CON_LIMITE_POR_IP, true);
