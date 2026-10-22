# Contrato de la API de Echo

`openapi.yaml` (OpenAPI 3.1, escrito a mano) es **la fuente de verdad de la API** hasta que exista el backend de NestJS
(DEC-90). Sale de las operaciones `OP-*` del grafo v1.4.0. Cuando exista el backend, el OpenAPI que genere Nest tiene que
ser equivalente: mismas rutas, `operationId`, esquemas y códigos de error.

- **Frontend:** `npm run api:tipos` genera `frontend/src/lib/api/esquema.d.ts` con `openapi-typescript`, y `npm run tipos`
  falla si quedó desactualizado.
- **API simulada:** `frontend/simulador/` cumple este contrato en desarrollo (ver su README).
- **Pruebas:** `frontend/pruebas/api.spec.ts` revisa que el contrato sea válido (cada `$ref` existe) y que coincida en los
  dos sentidos con el simulador y con la tabla de operaciones del frontend.

## Cómo leerlo
- Cada operación tiene un `operationId` en español (`iniciarSesion`) y `x-grafo` con el id del grafo (`OP-04`). Los
  clientes del frontend usan el `operationId` como nombre de función.
- `components/schemas` tiene los esquemas. Las entradas terminan en `Entrada`.
- `components/responses` agrupa los errores por estado HTTP. La descripción de cada uno dice qué códigos puede llevar.
- La descripción de cada operación cita las reglas del grafo que aplica.

## Convenciones
- **Rutas:** todas bajo `/api` (el rewrite de Next lleva `/api/*` al backend, DEC-85), en español, sin acentos ni ñ.
- **JSON:** campos en `camelCase` en español (`apellidos`, `contrasena`, `expiraEn`). Las listas cerradas del grafo
  (`TEXT` + `CHECK`) van con sus mismos valores en `camelCase`: `opcion_multiple` → `opcionMultiple`,
  `aviso_privacidad` → `avisoPrivacidad`.
- **Ids:**
  - módulos, cursos y lecciones se piden por `slug`;
  - los cuestionarios y las preguntas, por su id numérico (la tabla `cuestionario` no tiene slug, y §5 de la arquitectura
    ya lo indica);
  - los intentos son UUID v7.
- **Fechas:** ISO 8601 en UTC (`2026-10-21T16:00:00.000Z`). El frontend las muestra en America/Mexico_City (INV-03). Los
  filtros de «Mis resultados» (`desde`, `hasta`) son días (`AAAA-MM-DD`) en hora de México (DEC-30).
- **Porcentajes:** números de 0 a 100 con dos decimales (DEC-07).
- **Cuerpos:**
  - siempre JSON;
  - **los campos que no están en el contrato se ignoran** (por ejemplo, una IP enviada en el cuerpo);
  - los esquemas de salida sí son cerrados (`additionalProperties: false`).
- **Errores:**
  - siempre `{ codigo, mensaje }`;
  - `codigo` sale de la lista cerrada `CodigoError`;
  - `mensaje` es texto técnico para registros y **nunca se muestra al alumno**: sus textos salen de
    `frontend/src/lib/api/mensajes.ts`;
  - según el código, el error trae datos extra: `campos` (solo `DATOS_INVALIDOS`, con un `CodigoCampo` por campo),
    `minutosRestantes` y `disponibleEn` (solo `EN_ESPERA`) y `preguntasPendientes` (solo `RESPUESTAS_INCOMPLETAS`).
- **Sesión:**
  - cookie `__Host-echo_sesion` (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, sin `Domain`), declarada como
    `securityScheme` (`cookieSesion`);
  - cada respuesta con sesión trae `X-Sesion-Expira` (ISO 8601);
  - `GET /api/sesion` devuelve `{ nombre, apellidos, metodoAcceso, expiraEn, aceptacionPendiente }`, y
    `POST /api/sesion/renovar` la renueva;
  - toda petición con sesión renueva la última actividad (C-01).
- **Mutaciones:** `POST`, `PUT`, `PATCH` y `DELETE` sin el `Origin` del frontend responden 403 `ORIGEN_NO_PERMITIDO` (DEC-85).
- **Redirecciones:** solo las de Google (`302`); el resto responde JSON o sin cuerpo (`202`, `204`).

## Operación → endpoint
| OP | Método y ruta | operationId |
|---|---|---|
| OP-31 | `GET /api/sesion` | `obtenerSesion` |
| OP-31 | `POST /api/sesion/renovar` | `renovarSesion` |
| OP-04 | `POST /api/sesion` | `iniciarSesion` |
| OP-05 | `DELETE /api/sesion` (esta) | `cerrarSesion` |
| OP-05 | `DELETE /api/sesiones` (todas) | `cerrarTodasLasSesiones` |
| OP-01 | `POST /api/cuenta/registro` | `registrarCuenta` |
| OP-02 | `POST /api/cuenta/verificacion` | `verificarCorreo` |
| OP-02 | `POST /api/cuenta/verificacion/reenvio` | `reenviarVerificacion` |
| OP-13 | `POST /api/cuenta/aceptacion` | `aceptarDocumentos` |
| OP-03 | `GET /api/auth/google` (`?proposito=eliminar` para el reingreso) | `entrarConGoogle` |
| OP-03 | `GET /api/auth/google/callback` | `volverDeGoogle` |
| OP-40 | `GET /api/documentos` | `obtenerDocumentosVigentes` |
| OP-06 | `POST /api/contrasena/recuperacion` | `solicitarRecuperacion` |
| OP-07 | `POST /api/contrasena/restablecimiento` | `restablecerContrasena` |
| OP-08 | `GET /api/perfil` | `obtenerPerfil` |
| OP-09 | `PATCH /api/perfil` | `editarNombre` |
| OP-39 | `PATCH /api/perfil/privacidad` | `cambiarPreferenciasPrivacidad` |
| OP-10 | `PUT /api/perfil/contrasena` | `cambiarContrasena` |
| OP-11 | `POST /api/perfil/correo` | `cambiarCorreo` |
| OP-12 | `POST /api/perfil/correo/confirmacion` | `confirmarCambioCorreo` |
| OP-14 | `POST /api/perfil/eliminacion` | `eliminarCuenta` |
| OP-15 | `GET /api/modulos` | `listarModulos` |
| OP-16 | `GET /api/modulos/{modulo}` | `obtenerModulo` |
| OP-17 | `GET /api/cursos/{curso}` | `obtenerCurso` |
| OP-18 | `GET /api/lecciones/{leccion}` | `abrirLeccion` |
| OP-19 | `PUT /api/lecciones/{leccion}/seccion-vista` | `guardarSeccionVista` |
| OP-20 | `POST /api/lecciones/{leccion}/terminar` | `terminarLeccion` |
| OP-21 | `GET /api/busqueda?q=` | `buscar` |
| OP-22 | `GET /api/actividades/{cuestionario}` | `abrirActividad` |
| OP-23 | `POST /api/actividades/{cuestionario}/envios` | `enviarActividad` |
| OP-24 | `GET /api/examenes/{cuestionario}` | `obtenerPortadaExamen` |
| OP-25 | `POST /api/examenes/{cuestionario}/intentos` | `iniciarIntentoExamen` |
| OP-26 | `PUT /api/intentos/{intento}/respuestas/{pregunta}` | `guardarRespuesta` |
| OP-27 | `POST /api/intentos/{intento}/envio` | `enviarExamen` |
| OP-28 | `GET /api/progreso` | `obtenerProgreso` |
| OP-29 | `GET /api/resultados?modulo=&tipo=&desde=&hasta=` | `listarResultados` |
| OP-30 | `GET /api/resultados/{intento}` | `obtenerDetalleIntento` |

**Ajustes a la propuesta de la tarea:**
- **OP-03, `?proposito=eliminar`:** el reingreso con Google para eliminar una cuenta sin contraseña (OP-14) reutiliza el
  mismo flujo. El callback marca la sesión como reingresada (vale 5 minutos) y redirige a `/perfil`. Es una propuesta;
  queda como duda.
- **OP-22 no crea el intento:** `GET /api/actividades/{cuestionario}` no tiene efectos. El intento se crea o se retoma al
  enviar (`POST …/envios`), con `fn_iniciar_intento` y luego `fn_enviar_intento`. Las actividades y los casos se
  responden de una vez y no tienen espera (DEC-21), así que no hace falta guardar respuesta por respuesta. El grafo dice
  «crea o retoma el intento» en OP-22: ver la diferencia en el reporte.
- **OP-18 sí registra la primera apertura en un `GET`.** Es idempotente y lo pide la operación.
- **OP-14, `POST` con cuerpo:** `{ confirmacion: true, contrasena? }`, porque `DELETE` no lleva cuerpo.
- **OP-26 sirve solo para exámenes:** las actividades se envían completas.

**No expuestas:** OP-32 (otorgar insignia: ocurre dentro de `enviarExamen`), OP-33 (enviar correos), OP-34 (limpieza
diaria), OP-35 (cargar contenido y publicar documentos), OP-36 (retirar preguntas u opciones), OP-37 (respaldo manual) y
OP-38 (cierre del proyecto). Son internas del backend, del Cron o de scripts con otros roles de base de datos.

## Códigos de error
| Código | HTTP | Cuándo | Respaldo |
|---|---|---|---|
| `NO_AUTENTICADO` | 401 | Sin sesión o sesión vencida (30 min sin actividad) | DEC-12, C-01 |
| `CREDENCIALES_INVALIDAS` | 401 | Correo inexistente, contraseña equivocada o pausa tras 5 fallos: el mismo código, mensaje y tiempo | DEC-77, DEC-26, INV-28 |
| `CORREO_SIN_VERIFICAR` | 403 | Contraseña correcta, sin pausa, con el correo sin verificar | DEC-77 |
| `ENLACE_INVALIDO` | 400 | Enlace de verificación, recuperación o cambio de correo vencido, usado o inexistente; un solo código para no dar pistas | DEC-13, DEC-24, DEC-25 |
| `CONTRASENA_INCORRECTA` | 403 | Solo con sesión: la contraseña actual no coincide (cambiar contraseña o correo, eliminar cuenta) | DEC-24, DEC-25, DEC-27 |
| `REINGRESO_REQUERIDO` | 403 | Eliminar una cuenta de Google sin un reingreso reciente | DEC-27 (propuesta) |
| `REGISTRO_GOOGLE_VENCIDO` | 401 | La cookie temporal del registro con Google venció (10 min) o no es válida | DEC-28, SCR-19 |
| `NO_DISPONIBLE_CON_GOOGLE` | 409 | Cambiar contraseña sin tenerla, o cambiar el correo de una cuenta de Google | OP-10, OP-11, DEC-24 |
| `DATOS_INVALIDOS` | 422 | Un campo falta o no cumple; trae `campos` | Validaciones de cada OP |
| `RESPUESTAS_INCOMPLETAS` | 422 | Enviar una actividad, un caso o un examen con preguntas sin responder; trae `preguntasPendientes` | OP-23, OP-27, SCR-12 |
| `NO_ENCONTRADO` | 404 | No existe, no está publicado o es de otro alumno | INV-07 |
| `BLOQUEADO_POR_AVANCE` | 403 | El avance lineal no lo permite; también terminar una lección sin llegar a su última sección | INV-06, DEC-03, OP-20 |
| `EN_ESPERA` | 409 | Nuevo intento de un examen antes de que pase `minutos_espera`; trae `minutosRestantes` y `disponibleEn` | DEC-21, C-05 |
| `EXAMEN_APROBADO` | 409 | Iniciar un intento de un examen ya aprobado | DEC-20, INV-05 |
| `INTENTO_CERRADO` | 409 | Guardar una respuesta o enviar un intento ya enviado | TRG-RESPUESTA-VALIDA |
| `ORIGEN_NO_PERMITIDO` | 403 | Mutación sin el `Origin` del frontend | DEC-85 |
| `DEMASIADAS_SOLICITUDES` | 429 | Límite de peticiones por IP en inicio de sesión, registro, reenvío, recuperación y cambio de correo; trae `Retry-After` | DEC-26, DEC-77 (RSG-04) |
| `ACEPTACION_PENDIENTE` | 403 | Hay una versión nueva del aviso o de los términos por aceptar | INV-30, DEC-28 |
| `VERSION_NO_VIGENTE` | 409 | Se aceptó una versión que ya no es la vigente | OP-01, OP-13 |
| `ERROR_INTERNO` | 500 | Falla inesperada | — |

**Cambios a la lista inicial:**
- **Se agregaron seis códigos** porque la interfaz necesita distinguir esos casos y ningún otro código los cubre sin
  confundir al alumno:
  - `REINGRESO_REQUERIDO`;
  - `REGISTRO_GOOGLE_VENCIDO` (estado de SCR-19);
  - `NO_DISPONIBLE_CON_GOOGLE`;
  - `RESPUESTAS_INCOMPLETAS` (estado de SCR-12);
  - `EXAMEN_APROBADO`;
  - `ERROR_INTERNO`.
- **`SIN_CONEXION`** existe solo en el frontend, para cuando la petición no llega a la API.

**Rutas permitidas con `ACEPTACION_PENDIENTE` (INV-30):**
- `GET /api/sesion`, `POST /api/sesion/renovar`, `DELETE /api/sesion` y `DELETE /api/sesiones`;
- `GET /api/documentos`, `POST /api/cuenta/aceptacion`, `GET /api/perfil` y `POST /api/perfil/eliminacion`;
- las de cuenta sin sesión (registro, verificación, recuperación, confirmación de correo y Google).

## Seguridad de la cuenta
- **Google no hereda cuentas sin verificar (DEC-93).** `volverDeGoogle` y `aceptarDocumentos` solo vinculan Google con una
  cuenta **activa y verificada** del mismo correo (INV-16). Si existe una cuenta **pendiente** con ese correo, al aceptar
  se elimina con sus enlaces y aceptaciones y se crea una cuenta nueva desde Google, con las casillas que acaba de marcar
  la persona. Así quien registró un correo ajeno con su propia contraseña no puede entrar después de que la dueña real
  entre con Google (pre-secuestro de cuenta).

## Reglas del grafo que el contrato hace visibles
| Regla | Dónde |
|---|---|
| **INV-04:** nada antes de enviar trae `valor`, la opción o pareja correcta ni la retroalimentación | `PreguntaParaResponder` (sin valores) es un esquema distinto de `PreguntaCalificada`. La columna derecha de la relación usa `clave` opaca, no el id de la pareja: si fueran ids, el izquierdo y el derecho correctos tendrían el mismo número |
| **DEC-11:** el examen reprobado no trae la respuesta correcta | `ResultadoExamen` es `ExamenAprobado` o `ExamenReprobado`; el reprobado usa `PreguntaSinSolucion`. Lo mismo en `DetalleIntento` (`solucion: completa` u `oculta`) |
| **DEC-17:** las actividades sí muestran la correcta | `PreguntaCalificada.opciones[].correcta` y `uniones[].derechaCorrecta` |
| **DEC-16:** decisión óptima, aceptable o riesgosa | `DecisionCalificada` con `etiqueta`, `consecuencia` y `fundamento` |
| **DEC-19:** un intento abierto que se retoma | `POST /api/examenes/{c}/intentos` responde 200 con el intento abierto o 201 con uno nuevo, y trae las respuestas guardadas |
| **DEC-21:** espera tras reprobar | `EN_ESPERA` con `minutosRestantes`; portada e índice con `estado: enEspera` |
| **DEC-77 / INV-28:** no delatar cuentas | Registro, reenvío, recuperación y cambio de correo responden siempre 202; inicio de sesión, un solo `CREDENCIALES_INVALIDAS` |
| **INV-06 / INV-07** | `BLOQUEADO_POR_AVANCE`; ningún endpoint recibe el id del alumno, y lo ajeno es `NO_ENCONTRADO` |
| **DEC-57:** Markdown | `Seccion.cuerpo` es texto Markdown sin HTML |
| **INV-13:** texto alternativo | `Imagen.textoAlternativo` es obligatorio (1 a 300 caracteres) |
| **INV-08:** secretos | Ninguna respuesta trae hashes ni códigos; los códigos de enlace solo llegan en el cuerpo de la petición |
| **INV-30 / DEC-28 / DEC-87 / DEC-88 / DEC-89:** aceptación | `RegistroEntrada` y `AceptacionEntrada` (casillas, versiones y negativas); la IP la toma el servidor; `Perfil.aceptaciones` sin IP; `Documento` sin huella |
