import { Global, Module } from '@nestjs/common';
import { FuncionesBdService } from './funciones-bd.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, FuncionesBdService],
  exports: [PrismaService, FuncionesBdService],
})
export class BaseDeDatosModule {}
