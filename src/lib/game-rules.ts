/**
 * Reglas del juego que se muestran al usuario (sección "Reglas del juego"
 * en /home). Cada regla tiene un texto corto + un detalle con ejemplo que
 * se abre al tocar el ícono de info.
 *
 * Los puntajes deben coincidir con `SCORING` en `src/lib/scoring.ts`.
 */

export interface GameRule {
  id: string;
  /** Texto corto que se ve siempre. */
  label: string;
  /** Etiqueta de puntos (ej. "5 pts", "2 · 3 · 5 · 8"). Opcional. */
  points?: string;
  /** Explicación detallada + ejemplo, visible al abrir el info. */
  detail: string;
}

/** Máximo teórico de puntos en un pronóstico perfecto. */
export const MAX_POINTS = 643;

export const GAME_RULES: GameRule[] = [
  {
    id: 'group-exact',
    label: 'Marcador exacto de un partido de grupos',
    points: '5 pts',
    detail:
      'Aciertas el marcador exacto de un partido de la fase de grupos, contado al minuto 90 (sin prórroga ni penaltis). Ejemplo: predices México 2–0 y el partido termina 2–0 → +5 pts.',
  },
  {
    id: 'group-outcome',
    label: 'Acertar solo el resultado (gana o empata)',
    points: '2 pts',
    detail:
      'Aciertas quién gana o que empatan, aunque no el marcador exacto. Ejemplo: predices 3–1 y termina 1–0 → +2 pts, porque acertaste que ganaba el local. Si aciertas el marcador exacto recibes los 5, no se suman los 2.',
  },
  {
    id: 'advance',
    label: 'Cada equipo que clasifica a una ronda eliminatoria',
    points: '2 · 3 · 5 · 8',
    detail:
      'Por cada equipo que pusiste en una ronda y de verdad llegó: Dieciseisavos 2 pts, Octavos 3, Cuartos 5, Semifinales 8 (cada uno). Ejemplo: pusiste a Brasil en Cuartos y llegó → +5. Mientras más avanza la ronda, más vale cada acierto.',
  },
  {
    id: 'finalists',
    label: 'Cada finalista (campeón y subcampeón) que llega a la final',
    points: '12 pts',
    detail:
      'Por cada uno de tus dos finalistas que realmente llega a la final, aunque no la gane. Ejemplo: tu campeón pierde la final pero llegó → +12 igual.',
  },
  {
    id: 'champion',
    label: 'Acertar el campeón del Mundial',
    points: '30 pts',
    detail:
      'Tu campeón es el campeón real del torneo. Ejemplo: predices Argentina campeón y gana → +30 (además de los 12 por haber sido finalista).',
  },
  {
    id: 'third',
    label: 'Acertar el tercer puesto',
    points: '15 pts',
    detail:
      'Aciertas quién gana el partido por el tercer puesto. Ejemplo: predices a Croacia de tercero y gana ese partido → +15.',
  },
  {
    id: 'final-score',
    label: 'Marcador exacto de la final (bonus)',
    points: '15 pts',
    detail:
      'Aciertas el marcador de la final al minuto 90 (sin penaltis). No importa el orden: si predices 2–1 y termina 1–2, cuenta igual → +15.',
  },
  {
    id: 'top-scorer',
    label: 'Acertar el goleador del torneo',
    points: '15 pts',
    detail:
      'Aciertas el máximo goleador del Mundial. Se evalúa de forma flexible: no importan mayúsculas ni acentos. Ejemplo: "kylian mbappe" cuenta como "Kylian Mbappé".',
  },
  {
    id: 'tiebreak',
    label: 'Empates y premio',
    detail:
      'Si dos o más participantes terminan con los mismos puntos, en la tabla se ordenan alfabéticamente por nombre y apellidos. Si el empate persiste al final del Mundial, el premio se reparte en partes iguales entre los participantes empatados.',
  },
];
