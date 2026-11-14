import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CONFIGURACION } from '../../infraestructura/configuracion/configuracion';
import type { Configuracion } from '../../infraestructura/configuracion/configuracion';
import { LimitePorIpService } from '../../infraestructura/seguridad/limite-por-ip.service';
import { RUTA_CON_LIMITE_POR_IP } from '../decoradores/limite-por-ip';
import { ErrorApi } from '../errores/error-api';
import { ipDelCliente } from '../utilidades/ip-cliente';

/** Aplica el límite por IP (DEC-26) a las rutas marcadas con @LimitePorIp. */
@Injectable()
export class LimitePorIpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limite: LimitePorIpService,
    @Inject(CONFIGURACION) private readonly configuracion: Configuracion,
  ) {}

  canActivate(contexto: ExecutionContext): boolean {
    const conLimite = this.reflector.getAllAndOverride<boolean>(
      RUTA_CON_LIMITE_POR_IP,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!conLimite) return true;

    const peticion = contexto.switchToHttp().getRequest<Request>();
    const ip = ipDelCliente(peticion, this.configuracion.proxiesConfiables);
    const resultado = this.limite.registrar(ip);
    if (!resultado.permitida) {
      throw new ErrorApi(
        'DEMASIADAS_SOLICITUDES',
        {},
        resultado.reintentarEnSegundos,
      );
    }
    return true;
  }
}
