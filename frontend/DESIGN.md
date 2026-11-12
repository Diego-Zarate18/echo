# Echo · sistema visual «Tierra»

Referencia corta para construir vistas. La fuente es Figma, archivo `1zggHPVnKEPlt7khBbtWTt`:
página «Vistas de la app» (`66:2`) y página «Identidad» (`0:1`). Decisiones: DEC-82 (dirección «Tierra»),
DEC-84 (de Figma a Next.js) y DEC-71 (WCAG 2.2 AA). Si Figma y el grafo no coinciden, manda el grafo.

Los tokens viven en `src/estilos/globales.css` (`@theme` de Tailwind 4). La paleta de Tailwind está vaciada:
solo existen estos colores.

## Color

| Token (utilidad) | Variable de Figma | Valor | Uso |
|---|---|---|---|
| `marca-cafe` | `marca/cafe` | `#3D2213` | Fondo principal, texto sobre claro |
| `marca-crema` | `marca/crema` | `#FBF3E9` | Secciones claras, texto sobre oscuro, botón principal |
| `marca-menta` | `marca/menta` | `#67EEC9` | Íconos y acentos **solo sobre fondo oscuro** |
| `marca-bosque` | `marca/bosque` | `#3E6A59` | Íconos sobre claro, anillo de foco sobre claro |
| `marca-terracota` | `marca/terracota` | `#AA5F2F` | Solo en las ilustraciones de Moris y el lettering |
| `texto-secundario` | `texto/secundario` | `#6B4A36` | Texto secundario sobre crema (7.1:1) |
| `superficie-hundida` | `superficie/hundida` | `#F1E6D7` | Tarjetas y globos sobre crema |
| `superficie-elevada` | `superficie/elevada` | `#FFFBF5` | Superficies elevadas sobre crema; hover del botón crema |
| `estado-riesgosa` | `estado/riesgosa` | `#9E2B25` | Errores y decisión riesgosa |
| `blanco` | — (literal en Figma) | `#FFFFFF` | Fondo del logo de la UP Chiapas y bordes del vidrio |

Contrastes que ya se revisaron: crema sobre café y café sobre crema 13.3:1; texto secundario sobre crema 7.1:1
y sobre superficie hundida 6.3:1; menta sobre café 10:1.

## Reglas de «Tierra»

- Café como fondo principal y crema en secciones claras. **Sin degradados.**
- Menta solo para íconos y acentos sobre fondo oscuro; **nunca** como color de texto sobre crema.
- **Vidrio sutil:** `bg-marca-crema/8` + `border-blanco/16` + `backdrop-blur-vidrio` (14 px). Solo sobre café.
- Hero como tarjeta de 32 px de radio (`rounded-hero`, `shadow-hero`) sobre un marco crema de 8 px, a la altura de la ventana.
- Separadores: `border-marca-menta/16` entre secciones oscuras, `border-marca-menta/22` en listas oscuras,
  `border-marca-cafe/14` en listas claras.
- Los contenedores con fondo oscuro llevan `data-fondo="oscuro"` (el anillo de foco cambia a menta).

## Tipografía

Nunito (`font-titulo`) para títulos, botones y etiquetas; Nunito Sans (`font-lectura`) para lectura.
Ambas con `next/font/google`: se sirven desde el propio dominio.

| Utilidad | Tamaño en 1440 px | Peso | Uso |
|---|---|---|---|
| `text-portada` | 78 px (44 en móvil), interlineado 1.02, −0.025em | Black 900 | `h1` del hero |
| `text-cierre` | 64 px, 1.02, −0.025em | Black 900 | Título del cierre |
| `text-seccion` | 52 px, 1.1, −0.015em | ExtraBold 800 | `h2` de sección |
| `text-entrada` | 44 px, 1.15, −0.015em | ExtraBold 800 | `h2` de entrada larga |
| `text-elemento` | 28 px, 1.1, −0.01em | ExtraBold 800 | `h3` de lista |
| `text-tarjeta` | 20 px, 1.25 | Bold 700 | Nombre en tarjeta |
| `text-destacado` | 19 px, 1.6 | Regular | Párrafo del hero |
| `text-amplio` | 18 px, 1.6 | Regular | Entrada de sección |
| `text-cuerpo` | 17 px, 1.6 | Regular / SemiBold | Lectura |
| `text-base` | 16 px, 1.5 | Bold (botones) | Botones, avisos |
| `text-menor` | 15 px, 1.5 | SemiBold / Bold | Navegación, globos |
| `text-detalle` | 14 px, 1.5 | Regular / Bold | Datos, pastillas |
| `text-nota` | 13 px, 1.5 | Regular | Estados en tarjetas |

Los títulos grandes escalan con `clamp()` entre 390 y 1440 px. Medida de lectura: 65–75 caracteres.

## Radios y sombras

`rounded-hero` 32 · `rounded-panel` 26 · `rounded-tarjeta` 24 · `rounded-burbuja` 22 · `rounded-globo` 20 ·
`rounded-logo` 18 · `rounded-aviso` 16 · `rounded-fila` 14 · `rounded-full` para botones y pastillas.
`shadow-hero` (tarjeta del hero) y `shadow-vidrio` (tarjeta de vidrio flotante).

## Botones (`src/componentes/ui/Boton.tsx`)

| Variante | Figma | Dónde | Estados |
|---|---|---|---|
| `crema` | Botón/Crema `60:346` | Principal sobre café. Con `conFlecha`, círculo café de 40 px con la flecha diagonal | Hover: `superficie-elevada` |
| `contorno` | Botón/Contorno sobre oscuro `45:125` | Secundario sobre café; borde crema de 1.5 px | Hover: crema al 8 % |
| `cafe` | Botón/Café `66:35` | Principal sobre fondos claros | Hover: `texto-secundario` |

Alto: `grande` 56 px (acciones), `mediano` 48 px (encabezado). Siempre `rounded-full`, Nunito Bold 16 px.
Con `href` es un enlace (`next/link`, o `<a>` para anclas); sin `href`, un `<button>`.

## Foco y accesibilidad

- Anillo de 3 px separado 2 px: bosque sobre claro y menta sobre oscuro (`data-fondo="oscuro"`), al menos 3:1.
- Áreas táctiles de al menos 24 × 24 px (los botones miden 48–56 px).
- Estados siempre con ícono **y** texto.
- `prefers-reduced-motion`: sin desplazamiento suave ni animaciones (`motion-safe:`).

## Movimiento: «el eco que regresa»

Un momento de autor, no la misma entrada en cada sección. Curvas `--ease-llegada` y `--ease-salida`, sin rebotes.
Nada se repite en bucle: el movimiento automático dura menos de 5 s (WCAG 2.2.2).

| Momento | Dónde | Qué hace |
|---|---|---|
| Entrada del hero (≈1.4 s) | `Presentacion` | «ÉTICA» llega desenfocada; Moris brota; tres ondas crema salen de él; «regresa.» llega con dos ecos que se funden con la palabra |
| Ondas al pasar el puntero | Moris del hero | Vuelven a salir las ondas (solo con puntero) |
| Moris habla | `.revelar-globo` | Los globos de Moris aparecen al entrar en la ventana |
| Declaración | `QueEsEcho` (`.declaracion`) | Se ilumina palabra por palabra al leerla (empieza al 42 %, ya cumple 3:1 para texto grande) |
| El cierre regresa | `Llamado` (`.brotar-al-ver`) | Moris vuelve a brotar como en el hero |
| Encabezado fijo | `EncabezadoPublico` | Al salir del hero se vuelve una píldora café sólida a 8 px del borde (62 px de alto) que se queda **siempre** a la vista. Se materializa una vez al aparecer (opacidad, escala 0.98, desenfoque; transición interrumpible de 220 ms) y hace la inversa al volver al hero. Un solo indicador (`clip-path`) se desliza a la sección actual (`aria-current`). Si un control con foco queda debajo de ella, la página se desplaza para dejarlo 16 px por debajo. Con movimiento reducido, solo fundido |
| Botón con flecha | `Boton` `conFlecha` | La flecha sale por arriba y otra entra desde abajo |
| Panel de acceso | `PanelDeAcceso` | Moris y el saludo entran una vez por carga; al navegar entre pantallas de acceso, Moris queda quieto y el saludo se funde (200 ms) |

Con movimiento reducido, la entrada es un fundido de 250 ms y lo demás no se mueve. Los títulos, filas y tarjetas
están visibles desde el inicio: no se animan solo por aparecer.

## Movimiento en la app (pantallas con sesión)

La app se usa todos los días: el movimiento ahí **responde**, no se luce. Regla de bolsillo: si la persona hace algo
decenas de veces por sesión, no se anima o se anima en 150 ms o menos.

### Curvas
| Token | Para qué | Nunca |
|---|---|---|
| `--ease-respuesta` | Casi todo: abrir, cerrar, aparecer, presionar, cambiar de estado | — |
| `--ease-desplazar` | Algo que viaja de un lugar a otro dentro de la pantalla (un indicador que se desliza) | Para aparecer o desaparecer |
| `--ease-llegada` | Solo el momento de deleite de la insignia nueva (ver abajo) | En controles |

Nada de `ease-in` (se siente lento al empezar), ni de rebotes o resortes, ni de `transition: all`. Tampoco el `ease-out`
genérico de Tailwind: siempre el token.

### Duraciones
| Duración | Qué |
|---|---|
| 150 ms | Presionar (`Boton` ya hace `scale-[0.97]`), hover, cambio de color o de borde, casilla |
| 200–220 ms | Abrir o cerrar algo dentro de la página: acordeón, menú, alerta (`animate-alerta`), retroalimentación al enviar |
| 250 ms | Hoja inferior móvil y diálogo al **entrar**; al **salir**, 200 ms |
| 400 ms | Una barra de progreso que cambia **mientras la persona la ve** (por ejemplo, al terminar una lección) |

Nada de la app dura más de 400 ms, salvo la insignia nueva.

### Qué NO se anima
- **El cambio de pantalla.** Sin transiciones de página: Next navega y la pantalla nueva aparece.
- **Pasar de una pregunta a otra** (examen y actividad), elegir una opción y el indicador «Guardado» / «Sin
  conexión»: cambian al instante (a lo sumo, el ícono con un fundido de 150 ms).
- **Listas y tarjetas al cargar** (módulos, cursos, resultados): ya están ahí. Sin cascada ni aparición escalonada.
- **Barras de progreso al cargar:** se dibujan ya en su valor. Solo se animan si el valor cambia en la misma pantalla.
- **Números que cuentan** (porcentajes, calificaciones): aparecen con su valor final.
- **Nada con el teclado repetido:** Tab, flechas y Enter no disparan animaciones; solo el anillo de foco.
- **Errores:** sin sacudidas ni parpadeos. El error llega con `animate-alerta` y recibe el foco.

### Recetas
| Patrón | Cómo |
|---|---|
| Botón presionado | `Boton` ya lo hace. En un botón propio: `transition-[scale] duration-150 ease-(--ease-respuesta) motion-safe:active:scale-[0.97]` |
| Acordeón | `<details>` con la clase `.apartado` (documentos legales), o el de Ayuda: botón con `aria-expanded` y región `.respuesta-acordeon` (`data-abierta`). No escribas un tercero |
| Alerta o retroalimentación que aparece | `animate-alerta` (220 ms, 6 px desde arriba) |
| Texto que cambia en un lugar que no se mueve | `animate-fundido` (200 ms, solo opacidad), como el saludo del panel de acceso al navegar |
| Hoja inferior (móvil: eliminar cuenta, sesión por expirar) | `<dialog>`; el panel entra con `translate-y-full` → `0` en 250 ms y sale en 200 ms (`--ease-respuesta`); el fondo, solo opacidad. Usa `@starting-style` (Tailwind `starting:`), que se puede interrumpir |
| Diálogo centrado (escritorio) | Opacidad 0 → 1 y escala 0.96 → 1 en 200 ms, `transform-origin: center`. Nunca desde `scale(0)` |
| Menú o panel que cuelga de un botón | Opacidad y 4 px de desplazamiento desde el botón, 200 ms, con `transform-origin` del lado del botón. Es lo que hace `MenuMovil`, pero él todavía usa el `ease-out` de Tailwind: al copiarlo, usa `ease-(--ease-respuesta)` |
| Barra de progreso que cambia | `transform: scaleX()` con `origin-left` en 400 ms, nunca `width` |
| **Insignia nueva** (SCR-13, el único momento de deleite) | Una vez: el sello entra con opacidad 0 → 1 y escala 0.9 → 1 en 500 ms con `--ease-llegada`; el texto, 100 ms después con `animate-alerta`. No se repite al volver a la pantalla |

### Siempre
- **Movimiento reducido:** todo lo que se mueve va con `motion-safe:` o dentro de
  `@media (prefers-reduced-motion: no-preference)`. La regla global de `globales.css` vuelve un fundido de 250 ms
  cualquier clase `animate-*`.
- **Interrumpible:** para abrir y cerrar se usan **transiciones**, no `@keyframes`. Así, abrir y cerrar rápido retoma
  desde donde va.
- **Solo `transform` y `opacity`**, salvo la altura del acordeón, que ya está resuelta.
- **Nada en bucle** ni que dure más de 5 s (WCAG 2.2.2).

## Íconos (`src/componentes/ui/iconos/`)

Trazo 1.75, estilo Lucide, rutas exportadas de los componentes `Icono/*` de Figma. Usan `currentColor` y
conservan el trazo en cualquier tamaño. Son decorativos (`aria-hidden`) salvo que reciban `titulo`.
Si un ícono es el único contenido de un botón, el botón lleva `aria-label`.

## Marca (`src/componentes/marca/`)

- `Logo`: `fondo="oscuro"` (vistas de la app, `84:491`) o `fondo="claro"` (Identidad, `24:10`). Solo cambia el ancho.
- `Moris`: `principal`, `feliz`, `sorprendido`, `curioso`, `triste`. Mínimo 40 px. `alt` obligatorio: describe a
  Moris cuando aporta; `alt=""` cuando el texto que lo acompaña ya dice todo.
- Nunca se redibujan, deforman, recolorean ni tapan. Las imágenes viven en `public/marca/` y `public/imagenes/`.
