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
| Encabezado fijo | `EncabezadoPublico` | Al salir del hero se fija arriba, siempre visible, como el encabezado de la app (Figma `82:463`): franja crema opaca de borde a borde con la barra café (16 px de radio) dentro, para que nada asome alrededor. Se materializa (opacidad, escala 0.98, desenfoque) y un solo indicador (`clip-path`) se desliza a la sección actual (`aria-current`) |
| Botón con flecha | `Boton` `conFlecha` | La flecha sale por arriba y otra entra desde abajo |

Con movimiento reducido, la entrada es un fundido de 250 ms y lo demás no se mueve. Los títulos, filas y tarjetas
están visibles desde el inicio: no se animan solo por aparecer.

## Íconos (`src/componentes/ui/iconos/`)

Trazo 1.75, estilo Lucide, rutas exportadas de los componentes `Icono/*` de Figma. Usan `currentColor` y
conservan el trazo en cualquier tamaño. Son decorativos (`aria-hidden`) salvo que reciban `titulo`.
Si un ícono es el único contenido de un botón, el botón lleva `aria-label`.

## Marca (`src/componentes/marca/`)

- `Logo`: `fondo="oscuro"` (vistas de la app, `84:491`) o `fondo="claro"` (Identidad, `24:10`). Solo cambia el ancho.
- `Moris`: `principal`, `feliz`, `sorprendido`, `curioso`, `triste`. Mínimo 40 px. `alt` obligatorio: describe a
  Moris cuando aporta; `alt=""` cuando el texto que lo acompaña ya dice todo.
- Nunca se redibujan, deforman, recolorean ni tapan. Las imágenes viven en `public/marca/` y `public/imagenes/`.
