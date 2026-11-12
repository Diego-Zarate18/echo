# Tarea NN · <Pantalla> (SCR-NN)

**Estado:** pendiente
**Escrita:** AAAA-MM-DD · sesión de diseño

## Revisión de la tarea anterior
<Aprobada o corrección. Respuestas numeradas a cada duda del reporte. Archivada en `historial/tarea-NN.md`.>

---

## Parte 0 · Pendientes de la revisión
<Cambios pequeños que salieron de la revisión: grafo, contrato, ajustes. Cada uno con su commit.>

## Parte A · <Pantalla> (SCR-NN)
**Figma:**
- escritorio: `<id>` (<estado>), `<id>` (<estado>);
- móvil: `<id>`.

**Ruta:** `<ruta>`, en `(<grupo>)`. **Servidor o cliente:** <según arquitectura §6>.

**Grafo:** SCR-NN; operaciones OP-NN (<qué recibe y devuelve>); decisiones e invariantes que aplican (DEC-NN, INV-NN).

**Contenido y comportamiento:**
- <qué muestra, de dónde sale cada dato>;
- <qué hace cada acción, qué operación llama y a dónde lleva>;
- <movimiento: qué se anima según DESIGN.md § «Movimiento en la app», o «nada»>;

**Estados** (los de `estados_a_disenar` del nodo SCR, más carga y error):
- <estado>: <qué se ve>.

**Si Figma y el grafo no coinciden:** <lo que ya se sabe; manda el grafo>.

## Pruebas
1. <flujo principal con el escenario del simulador que corresponda>;
2. <cada estado>;
3. axe sin violaciones en escritorio y móvil, en cada estado;
4. solo con teclado;
5. todas las anteriores siguen pasando.

**Capturas:** `tarea-NN-<estado>-escritorio.png` (1440 × 900), `tarea-NN-<estado>-movil.png` (390 × 844).

## Skills
`impeccable`, `animate`, `apple-design`, `ui-ux-pro-max`, `webapp-testing` (los que estén instalados). Repórtalos en
«Skills usados», con lo que aportó cada uno.

## Terminado cuando
- Lint, tipos, build y **todas** las pruebas pasan; reporta el resultado real.
- Commits atómicos en `development`, subidos. Por ejemplo: `feat(<area>): <Pantalla> (SCR-NN)`, `test(<area>): …`.
- Si toca sesión, datos personales o calificación: **«REQUIERE REVISIÓN HUMANA»** en el resumen.

## Al terminar
Llena `ai/handoff/reporte.md` (plantilla en `docs/frontend/relevo/plantilla-reporte.md`), cópialo a
`historial/reporte-NN.md`, cambia el estado a `hecha` y detente. **No hagas commit de nada dentro de `ai/handoff/`.**
