# Carga de contenido

El contenido de Echo (módulos, cursos, lecciones, actividades, casos, exámenes e insignias) y las versiones de los
documentos legales viven en la carpeta `contenido/` de la raíz del repositorio. Un script los lleva a la base
(OP-35, DEC-33, DEC-120):

```bash
cd backend
npm run contenido:revisar    # valida y muestra qué cambiaría, sin escribir nada
npm run contenido:cargar     # aplica los cambios
```

Los dos compilan el backend antes de correr. El script se conecta como `echo_contenido` (`DATABASE_URL_CONTENIDO`
del `.env`) y hace todo en **una sola transacción**: si algo falla, no queda nada a medias. Se puede elegir otra
carpeta con `--carpeta <ruta>` y dejar un motivo en la auditoría con `--motivo "texto"`.

**En producción, antes de cargar se hace el respaldo** (`docs/backend/respaldos.md`, DEC-69). Primero se corre
`contenido:revisar` y se lee la lista de cambios.

## Estructura de la carpeta

```
contenido/
  fundamentos.yaml                      ← leyes, normas y códigos que citan las preguntas
  documentos.yaml                       ← versiones del aviso de privacidad y de los términos
  01-etica-profesional/                 ← un módulo: NN-slug
    modulo.yaml                         ← título, descripción e insignia
    01-codigos-de-etica/                ← un curso: NN-slug
      curso.yaml                        ← título, descripción y el examen
      01-que-es-un-codigo-de-etica.md   ← una lección: NN-slug.md
      01-que-es-un-codigo-de-etica.yaml ← su actividad y sus casos (opcional)
```

- **NN es el orden** (01, 02…) y el resto es el **slug**: minúsculas, números y guiones, sin acentos ni ñ. El slug
  aparece en las direcciones de la app, así que no conviene cambiarlo después de publicar.
- Los textos van en español con acentos; los nombres de las llaves, como en los ejemplos, sin acentos.
- Una llave mal escrita (por ejemplo `retroalimentacon`) es un error: el script la marca.

## Módulo: `modulo.yaml`

```yaml
titulo: Ética profesional en TI
descripcion: Qué es un código de ética y cómo cuida a las personas que usan lo que construyes.
publicado: true                # opcional; por omisión true
insignia:                      # obligatoria si el módulo está publicado
  nombre: Ética profesional
  descripcion: Completaste el módulo «Ética profesional en TI».
  imagen:
    ruta: /marca/moris-principal.png
    texto_alternativo: Sello del módulo «Ética profesional en TI».
    pie: null                  # opcional
```

## Curso: `curso.yaml`

```yaml
titulo: Códigos de ética
descripcion: Para qué sirve un código de ética y qué pide el de ACM.
publicado: true
examen:                        # obligatorio si el curso está publicado (DEC-100)
  titulo: "Examen: Códigos de ética"
  instrucciones: Sin cronómetro.
  calificacion_minima: 70      # opcional; por omisión 70
  minutos_espera: 20           # opcional; espera tras reprobar, por omisión 20
  preguntas:
    - tipo: opcion_multiple
      ...
```

Un texto que lleva dos puntos seguidos de espacio (`Examen: Códigos`) va entre comillas.

## Lección: `NN-slug.md`

Un encabezado entre líneas `---` y después las secciones. **Cada `## Título` empieza una sección**; dentro de una
sección se usan `###` o menos. Si la primera línea de una sección es una imagen, esa es la imagen de la sección.

```markdown
---
titulo: ¿Qué es un código de ética?
resumen: Normas que orientan decisiones profesionales.
publicado: true
---

## Para qué sirve

![Moris con cara de curiosidad.](/marca/moris-curioso.png "Moris pregunta antes de decidir.")

Un **código de ética** reúne las normas que orientan cómo actúa una profesión.

### Lo que vas a ver

- Qué es un código de ética.

## Por qué importa en TI

…
```

- La imagen lleva su texto alternativo entre corchetes (obligatorio, DEC-71) y, opcionalmente, un pie entre comillas.
  La ruta es la de la carpeta pública del frontend y empieza con `/`.
- Una misma ruta es la misma imagen en todo Echo: cambiar su texto alternativo lo cambia en todas partes.
- `publicado_en` (opcional) fija la fecha de publicación; si no se pone, es la fecha en que se publica por primera vez.
  Una lección publicada después de que un alumno aprobó su curso le aparece como «nueva» (DEC-10).

## Actividad y casos: `NN-slug.yaml`

```yaml
actividad:
  titulo: "Actividad: qué es un código de ética"
  instrucciones: Responde las preguntas. Puedes repetir la actividad cuando quieras.
  preguntas:
    - tipo: opcion_multiple
      enunciado: ¿Qué hace un código de ética profesional?
      retroalimentacion: Un código orienta decisiones; no sustituye a la ley.
      leccion_repaso: que-es-un-codigo-de-etica
      opciones:
        - texto: Orienta cómo actuar ante decisiones profesionales.
          valor: 1
          retroalimentacion: Correcto, es una guía para decidir.
        - texto: Sustituye a las leyes del país.
          valor: 0
          retroalimentacion: No, las complementa.
casos:
  - titulo: "Caso: el reporte con datos de más"
    instrucciones: Lee el caso y elige qué harías.
    preguntas:
      - tipo: decision
        enunciado: Te piden un reporte de calificaciones… ¿Qué haces?
        fundamento: acm-1-6
        opciones:
          - texto: Quito los correos.
            valor: 1
            consecuencia: El reporte cumple su propósito sin exponer a nadie.
            retroalimentacion: Usas solo los datos necesarios.
          - texto: Pregunto si los correos hacen falta.
            valor: 0.5
            consecuencia: Se retrasa un poco, pero se evita compartir de más.
```

La actividad se abre al terminar de leer la lección y los casos, en su orden, después de la actividad.

## Preguntas

| Tipo | Dónde | Cómo se responde |
|---|---|---|
| `opcion_multiple` | actividades y exámenes | una opción; exactamente una vale 1 y las demás 0 |
| `verdadero_falso` | actividades y exámenes | dos opciones; una vale 1 y la otra 0 |
| `relacion` | solo actividades (DEC-117) | `parejas` con `izquierda` y `derecha`; al menos 2, sin textos repetidos |
| `decision` | solo casos | opciones con valores de 0 a 1 (DEC-08) y su `consecuencia` |

Llaves de una pregunta: `tipo`, `enunciado`, `retroalimentacion`, `fundamento` (una clave de `fundamentos.yaml`),
`leccion_repaso` (el slug de la lección que conviene repasar si la falla), y `opciones` o `parejas`. Cada opción:
`texto`, `valor`, `retroalimentacion`, `consecuencia` (casos) y `fundamento`.

En una decisión, la etiqueta que ve el alumno sale del valor: 1 «óptima», entre 0 y 1 «aceptable», 0 «riesgosa»
(DEC-16).

```yaml
- tipo: relacion
  enunciado: Relaciona cada principio con lo que pide.
  parejas:
    - izquierda: Evitar el daño
      derecha: Prever consecuencias negativas
    - izquierda: Respetar la privacidad
      derecha: Usar solo los datos necesarios
```

## Fundamentos: `fundamentos.yaml`

```yaml
- clave: acm-1-6              # solo para citarlo desde las preguntas
  tipo: codigo                # ley, norma, principio o codigo
  nombre: Código de Ética y Conducta Profesional de ACM
  articulo: Principio 1.6
  descripcion: Respetar la privacidad de las personas.
  referencia: https://www.acm.org/code-of-ethics
```

## Documentos legales: `documentos.yaml`

```yaml
- tipo: terminos              # aviso_privacidad o terminos
  version: "1.1"              # entre comillas
  archivo: docs/legal/terminos-y-condiciones-v1.1.md
  requiere_aceptacion: true   # true si los alumnos deben volver a aceptarla
  resumen: Qué cambió.
```

Una versión nueva se publica con la huella de su archivo. **Una versión publicada no se edita**: si su archivo
cambia, la carga se detiene; hay que publicar una versión nueva con otro número.

## Qué pasa al volver a cargar

El script compara los archivos con la base y solo cambia lo que es distinto.

- **Módulos, cursos y lecciones** se reconocen por su slug. Si cambian su título, descripción, orden o secciones,
  se actualizan. **Nunca se borran**: para quitar uno se pone `publicado: false`. Si algo está en la base pero no en
  los archivos, el script lo avisa y no lo toca.
- **Las preguntas se reconocen por su posición** en el cuestionario (la primera, la segunda…):

| Qué pasa con la pregunta | Si nadie la ha respondido | Si alguien ya la respondió |
|---|---|---|
| No cambió | nada | nada |
| Cambió (texto, opciones, valores, retroalimentación, fundamento o lección de repaso) | se borra y se crea de nuevo | se **retira** y se crea una nueva |
| Ya no está en el archivo | se borra | se **retira** |

  Una pregunta retirada deja de aparecer, pero el historial de quien la respondió la sigue mostrando tal como la
  vio (INV-02, DEC-15). El script no distingue una corrección de redacción de un cambio de sentido: en una
  pregunta ya respondida, cualquier cambio la retira.
- Insertar una pregunta en medio corre las posiciones de las siguientes, y todas «cambian». Para no retirar
  preguntas sin necesidad, las nuevas se agregan al final.
- **Un caso** que ya no está se borra si nadie lo ha intentado y se retira si sí.

## Errores

`contenido:revisar` y `contenido:cargar` revisan todo antes de escribir y muestran todos los problemas juntos, con
el archivo y qué falla. Entre ellos: las reglas de las preguntas de la tabla, un módulo publicado sin insignia, un
curso publicado sin examen, un fundamento o una lección de repaso que no existen, un slug repetido o dos elementos
con el mismo número.
