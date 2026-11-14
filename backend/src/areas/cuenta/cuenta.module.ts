import { Module } from '@nestjs/common';
import { AceptacionController } from './aceptacion/aceptacion.controller';
import { AceptacionService } from './aceptacion/aceptacion.service';
import { ContrasenaController } from './contrasena/contrasena.controller';
import { ContrasenaService } from './contrasena/contrasena.service';
import { DocumentosController } from './documentos/documentos.controller';
import { DocumentosService } from './documentos/documentos.service';
import { EnlacesService } from './enlaces/enlaces.service';
import { AccesoGoogleService } from './google/acceso-google.service';
import { GoogleController } from './google/google.controller';
import { PerfilController } from './perfil/perfil.controller';
import { PerfilService } from './perfil/perfil.service';
import { RegistroController } from './registro/registro.controller';
import { RegistroService } from './registro/registro.service';
import { SesionModule } from './sesion/sesion.module';

/** Área de cuenta (MOD-CUENTA): registro, verificación, recuperación, Google, documentos legales y perfil. */
@Module({
  imports: [SesionModule],
  controllers: [
    DocumentosController,
    RegistroController,
    ContrasenaController,
    GoogleController,
    AceptacionController,
    PerfilController,
  ],
  providers: [
    DocumentosService,
    EnlacesService,
    RegistroService,
    ContrasenaService,
    AccesoGoogleService,
    AceptacionService,
    PerfilService,
  ],
})
export class CuentaModule {}
