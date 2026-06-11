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
export const MAX_POINTS = 798;

export const GAME_RULES: GameRule[] = [
  {
    id: 'group-exact',
    label: 'Marcador exacto de un partido de grupos',
    points: '5 pts',
    detail:
      'Aciertas el marcador exacto de un partido de la fase de grupos, al final del tiempo reglamentario (minuto 90 + minutos de adición; sin prórroga ni penales). Ejemplo: predices México 2–0 y el partido termina 2–0 → +5 pts.',
  },
  {
    id: 'group-outcome',
    label: 'Acertar solo el resultado (gana o empata)',
    points: '2 pts',
    detail:
      'Aciertas quién gana o que empatan, aunque no el marcador exacto. Ejemplo: predices 3–1 y termina 1–0 → +2 pts, porque acertaste que ganaba el local. Si aciertas el marcador exacto recibes los 5, no se suman los 2.',
  },
  {
    id: 'knockout-score',
    label: 'Marcador de un partido de eliminatoria',
    points: '5 · 2',
    detail:
      'Igual que en grupos pero para los partidos de eliminatoria (Eliminatorias de 32, Octavos, Cuartos, Semifinal y Tercer lugar): 5 pts por el marcador exacto al final del tiempo reglamentario (90 + adición; sin prórroga ni penales) y 2 por acertar solo el resultado. Estos marcadores se registran en la pestaña "Eliminatorias", y cada cruce se habilita cuando ya se conocen sus dos equipos. La final no entra aquí: tiene su propio bonus de marcador.',
  },
  {
    id: 'advance',
    label: 'Cada equipo que clasifica a una ronda eliminatoria',
    points: '2 · 3 · 5 · 8',
    detail:
      'Por cada equipo que pusiste en una ronda y de verdad llegó: Eliminatorias de 32 (2 pts), Octavos de Final (3 pts), Cuartos de Final (5 pts), Semifinales (8 pts), cada uno. Ejemplo: pusiste a Brasil en Cuartos y llegó → +5. Mientras más avanza la ronda, más vale cada acierto.',
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
    label: 'Acertar el tercer lugar',
    points: '15 pts',
    detail:
      'Aciertas quién gana el partido por el tercer lugar. Ejemplo: predices a Croacia de tercero y gana ese partido → +15.',
  },
  {
    id: 'final-score',
    label: 'Marcador exacto de la final (bonus)',
    points: '15 pts',
    detail:
      'Aciertas cuántos goles marca cada uno de tus finalistas en la final, al final del tiempo reglamentario (90 + adición; sin prórroga ni penales). Cuenta solo si tu campeón y tu subcampeón son de verdad los que juegan la final y le pones a cada uno su marcador exacto. Ejemplo: dices que tu campeón le gana 2–1 a tu subcampeón y la final termina justo así → +15. Si te equivocas en el marcador de algún equipo, o si uno de tus finalistas no llega a la final, no suma.',
  },
  {
    id: 'top-scorer',
    label: 'Acertar el goleador del torneo',
    points: '15 pts',
    detail:
      'Aciertas el máximo goleador del Mundial. Se evalúa de forma flexible: no importan mayúsculas ni acentos. Ejemplo: "kylian mbappe" cuenta como "Kylian Mbappé".',
  },
  {
    id: 'ranking-ties',
    label: 'Posiciones y empates en el ranking',
    detail:
      'Tu puesto se define por el total de puntos: quien más tiene va primero. Si dos o más quedan empatados, comparten el puesto y se reparten en partes iguales la suma de los premios de los puestos que cubren. Ejemplos: dos empatados en el 1.° se dividen el premio del 1.° más el del 2.° y el siguiente queda de 3.°; tres o más empatados en el 1.° se dividen todos los premios y no hay 2.° ni 3.°; un 1.° y dos empatados en el 2.° → estos se dividen el premio del 2.° más el del 3.° y no hay 3.°. Así, quien hace más puntos nunca recibe menos que alguien por debajo.',
  },
];
