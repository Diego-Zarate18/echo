/**
 * Filamentos de circuito que salen de Moris (84:481 / 84:710 en el hero, 67:46 en Iniciar sesión), decorativos.
 * Rutas exportadas de Figma. Con `animado`, se trazan desde Moris y los puntos se encienden (la entrada del hero);
 * sin él, ya están dibujados.
 */
export function Filamentos({ className, animado = false }: { className: string; animado?: boolean }) {
  return (
    <svg
      viewBox="0 0 220 130"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none absolute opacity-60 ${className}`}
    >
      <g
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={animado ? "1" : undefined}
        className={animado ? "animate-trazar [animation-delay:750ms]" : undefined}
      >
        <path pathLength={1} d="M0 65H150" />
        <path pathLength={1} d="M0 45H58L88 15H140" />
        <path pathLength={1} d="M0 85H58L88 115H140" />
      </g>
      <g
        fill="currentColor"
        className={
          animado ? "animate-encender origin-center [transform-box:fill-box] [animation-delay:1350ms]" : undefined
        }
      >
        <path d="M162 76C168.075 76 173 71.0751 173 65C173 58.9249 168.075 54 162 54C155.925 54 151 58.9249 151 65C151 71.0751 155.925 76 162 76Z" />
        <path d="M150 24C154.971 24 159 19.9706 159 15C159 10.0294 154.971 6 150 6C145.029 6 141 10.0294 141 15C141 19.9706 145.029 24 150 24Z" />
        <path d="M150 124C154.971 124 159 119.971 159 115C159 110.029 154.971 106 150 106C145.029 106 141 110.029 141 115C141 119.971 145.029 124 150 124Z" />
      </g>
    </svg>
  );
}
