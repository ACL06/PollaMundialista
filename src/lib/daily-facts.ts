import { formatMatchDateKey } from '@/lib/format-date';

/**
 * "Dato curioso del día ⚽" — cápsula informativa que aparece en Comunidad
 * (solo post-lock, una vez arranca el Mundial). Modelo estático y determinista:
 *
 *   - Los 40 datos viven acá, en orden de aparición (día 1 → día 40).
 *   - El "Día N de 40" se ancla a la fecha del lock (= arranque del torneo),
 *     así que el día 1 cae justo el día inaugural.
 *   - La elección del dato es función pura de la FECHA (en TZ Bogotá), no del
 *     reloj del dispositivo: mismo dato en SSR y cliente, y cacheable.
 *
 * Cada dato tiene un `title` (titular corto con emoji, el gancho) y un `text`
 * (la explicación). La cápsula muestra el titular grande y el texto debajo.
 *
 * Variedad: las categorías se intercalan para que dos días seguidos no sean
 * del mismo tipo. Mezcla total = Historia 10 · Récords 8 · Jugadores 8 ·
 * Curiosidades 6 · Selecciones 4 · Mundial 2026 4.
 *
 * Todos los datos están verificados con su `source` (no se muestra; sirve para
 * auditar el contenido). Solo texto + emoji: nada de imágenes con derechos.
 */

export type FactCategory =
  | 'historia'
  | 'records'
  | 'jugadores'
  | 'curiosidades'
  | 'selecciones'
  | 'mundial-2026';

export const CATEGORY_LABEL: Record<FactCategory, string> = {
  historia: 'Historia de los Mundiales',
  records: 'Récords increíbles',
  jugadores: 'Leyendas y jugadores',
  curiosidades: 'Curiosidades',
  selecciones: 'Datos de selecciones',
  'mundial-2026': 'Mundial 2026',
};

export interface DailyFact {
  category: FactCategory;
  /** Titular corto con emoji (el gancho). Se muestra grande. */
  title: string;
  /** El dato, 1-3 frases cortas en español colombiano. */
  text: string;
  /** Fuente/contexto para auditar el dato. No se muestra al usuario. */
  source: string;
}

/**
 * Los 40 datos EN ORDEN DE APARICIÓN. El índice 0 = día 1 (día inaugural).
 * No reordenar a la ligera: el orden define qué dato sale cada día.
 */
export const DAILY_FACTS: DailyFact[] = [
  {
    category: 'historia',
    title: '✉️ Al primer Mundial entrabas invitado',
    text: 'El primer Mundial se jugó en Uruguay en 1930 con apenas 13 selecciones, todas invitadas: todavía no existían las eliminatorias para clasificar.',
    source: 'Uruguay 1930, 13 equipos por invitación.',
  },
  {
    category: 'records',
    title: '⚡ Un gol antes de pestañear: 11 segundos',
    text: 'El gol más rápido en la historia de los Mundiales lo marcó el turco Hakan Şükür a los 11 segundos, ante Corea del Sur en 2002.',
    source: 'Corea/Japón 2002, partido por el tercer puesto.',
  },
  {
    category: 'jugadores',
    title: '👑 Nadie más ha ganado tres Mundiales',
    text: 'Pelé es el único futbolista que ha ganado tres Mundiales: 1958, 1962 y 1970.',
    source: 'Tres títulos de Brasil con Pelé en plantilla.',
  },
  {
    category: 'curiosidades',
    title: '🐶 Un perro salvó el Mundial',
    text: 'En 1966 el trofeo del Mundial fue robado en Inglaterra. Lo encontró un perro llamado Pickles, husmeando bajo un arbusto.',
    source: 'Robo de la Copa Jules Rimet, 1966; el perro Pickles.',
  },
  {
    category: 'selecciones',
    title: '🏆 Solo 8 países lo han levantado',
    text: 'En casi un siglo de Mundiales, solo ocho países han sido campeones: Brasil, Alemania, Italia, Argentina, Francia, Uruguay, Inglaterra y España.',
    source: '8 campeones distintos hasta Qatar 2022.',
  },
  {
    category: 'mundial-2026',
    title: '🌎 Tres países lo organizan por primera vez',
    text: 'El Mundial 2026 será el primero organizado por tres países a la vez: Estados Unidos, México y Canadá.',
    source: 'Sede compartida USA/México/Canadá, 2026.',
  },
  {
    category: 'historia',
    title: '😱 El día que calló el Maracaná',
    text: 'El Mundial de 1950 no tuvo una final como tal: el campeón se decidió en un cuadrangular. El partido decisivo, Uruguay 2-1 Brasil en Maracaná, quedó para siempre como el "Maracanazo".',
    source: 'Brasil 1950, fase final en liguilla; Maracanazo.',
  },
  {
    category: 'records',
    title: '🎯 16 goles y el récord histórico',
    text: 'Miroslav Klose es el máximo goleador en la historia de los Mundiales, con 16 goles anotados entre 2002 y 2014.',
    source: 'Klose, 16 goles, récord histórico de Mundiales.',
  },
  {
    category: 'jugadores',
    title: '✋ Dos goles eternos en un mismo partido',
    text: 'En un mismo partido de 1986 ante Inglaterra, Maradona marcó los dos goles más recordados del fútbol: la "Mano de Dios" y, minutos después, el "Gol del Siglo".',
    source: 'Cuartos de final México 1986, Argentina 2-1 Inglaterra.',
  },
  {
    category: 'curiosidades',
    title: '🇨🇴 El Mundial que Colombia dejó pasar',
    text: 'Colombia iba a ser la sede del Mundial de 1986, pero renunció por razones económicas. México tomó su lugar y se convirtió en el primer país en organizarlo dos veces.',
    source: 'Colombia declina la sede de 1986; México la asume.',
  },
  {
    category: 'records',
    title: '💥 Diez goles de un solo equipo',
    text: 'La mayor cantidad de goles que una selección ha anotado en un solo partido de Mundial son los 10 de Hungría frente a El Salvador (10-1), en 1982.',
    source: 'España 1982, Hungría 10-1 El Salvador.',
  },
  {
    category: 'historia',
    title: '🏆 El trofeo que Brasil se quedó',
    text: 'El trofeo original, la Copa Jules Rimet, se entregó hasta 1970. Brasil la ganó tres veces y se la quedó en propiedad; el trofeo actual se usa desde 1974.',
    source: 'Copa Jules Rimet retirada por Brasil en 1970.',
  },
  {
    category: 'jugadores',
    title: '📅 Marcó en cinco Mundiales distintos',
    text: 'Cristiano Ronaldo fue el primer futbolista en marcar en cinco Mundiales distintos, de 2006 a 2022.',
    source: 'CR7 anotó en 2006, 2010, 2014, 2018 y 2022.',
  },
  {
    category: 'selecciones',
    title: '🇧🇷 Nunca ha faltado a un Mundial',
    text: 'Brasil es la única selección que ha jugado todos los Mundiales de la historia, y también la más ganadora, con cinco títulos.',
    source: 'Brasil presente en todas las ediciones; 5 títulos.',
  },
  {
    category: 'curiosidades',
    title: '🦁 La primera mascota fue un leoncito',
    text: 'La primera mascota de un Mundial fue "World Cup Willie", un leoncito con la bandera británica, en Inglaterra 1966.',
    source: 'World Cup Willie, primera mascota oficial, 1966.',
  },
  {
    category: 'mundial-2026',
    title: '🎟️ El Mundial más grande de la historia',
    text: 'El Mundial 2026 será el primero con 48 selecciones, 16 más que las 32 de las últimas ediciones.',
    source: 'Ampliación a 48 equipos en 2026.',
  },
  {
    category: 'historia',
    title: '😬 La primera tanda de penaltis',
    text: 'La primera tanda de penaltis de un Mundial se jugó en 1982, en la dramática semifinal entre Alemania Federal y Francia.',
    source: 'España 1982, semifinal de Sevilla, primera tanda en un Mundial.',
  },
  {
    category: 'records',
    title: '🌟 Un goleador de apenas 17 años',
    text: 'Pelé es el goleador más joven en la historia de los Mundiales: tenía 17 años cuando anotó en Suecia 1958.',
    source: 'Pelé, 17 años, goleador más joven (1958).',
  },
  {
    category: 'jugadores',
    title: '🎩 Tres goles en una final: solo dos lo han hecho',
    text: 'El inglés Geoff Hurst marcó tres goles en la final de 1966. Durante más de medio siglo fue el único con un triplete en una final de Mundial, hasta que Mbappé lo igualó en 2022.',
    source: 'Hurst (1966) y Mbappé (2022), hat-tricks en finales.',
  },
  {
    category: 'curiosidades',
    title: '💛 Por qué Brasil dejó el blanco',
    text: 'Brasil no siempre vistió de amarillo: jugaba de blanco hasta que, tras el trauma del "Maracanazo" de 1950, un concurso rediseñó la camiseta con los colores de su bandera.',
    source: 'La verdeamarela nace tras 1950 (concurso de 1953).',
  },
  {
    category: 'records',
    title: '🎯 13 goles en un solo Mundial',
    text: 'El francés Just Fontaine anotó 13 goles en un solo Mundial, el de 1958. Es un récord que sigue intacto más de 60 años después.',
    source: 'Fontaine, 13 goles en Suecia 1958.',
  },
  {
    category: 'historia',
    title: '🤷 El campeón que no fue a defender',
    text: 'Uruguay, el primer campeón del mundo en 1930, es el único que no fue a defender su título: no viajó al Mundial de Italia 1934.',
    source: 'Uruguay no asiste a 1934.',
  },
  {
    category: 'jugadores',
    title: '🔄 Campeones como jugador y como técnico',
    text: 'Solo tres personas han sido campeonas del mundo como jugador y como director técnico: Mário Zagallo, Franz Beckenbauer y Didier Deschamps.',
    source: 'Zagallo, Beckenbauer y Deschamps: campeones como jugador y DT.',
  },
  {
    category: 'selecciones',
    title: '🇩🇪 Ocho finales: nadie llegó a más',
    text: 'Alemania es la selección que más finales de Mundial ha disputado: ocho en total.',
    source: 'Alemania, 8 finales (récord).',
  },
  {
    category: 'curiosidades',
    title: '👟 El mito de los pies descalzos',
    text: 'Se suele decir que India se retiró del Mundial de 1950 porque no la dejaban jugar descalza; en realidad pesaron más los costos y lo largo del viaje.',
    source: 'India se retira de 1950; el "descalzos" es mito.',
  },
  {
    category: 'mundial-2026',
    title: '🇦🇷 La final más épica: 3-3 y penaltis',
    text: 'En 2022, Argentina se coronó en Qatar tras una final épica ante Francia: 3-3 y definición por penaltis, considerada una de las mejores de la historia.',
    source: 'Qatar 2022, Argentina campeón ante Francia.',
  },
  {
    category: 'historia',
    title: '⚽ Una final con dos balones',
    text: 'La final del primer Mundial, en 1930, se jugó con dos balones distintos: uno aportado por cada finalista, uno en cada tiempo.',
    source: 'Final 1930: balón argentino el 1T, uruguayo el 2T.',
  },
  {
    category: 'records',
    title: '🤯 Doce goles en un solo partido',
    text: 'El partido con más goles en la historia de los Mundiales fue el Austria 7-5 Suiza de 1954: doce goles en un solo encuentro.',
    source: 'Suiza 1954, cuartos Austria 7-5 Suiza.',
  },
  {
    category: 'jugadores',
    title: '🧤 El único arquero elegido el mejor',
    text: 'Oliver Kahn es el único arquero elegido mejor jugador de un Mundial: ganó el premio en 2002, pese a que Alemania perdió la final.',
    source: 'Kahn, Balón de Oro del Mundial 2002.',
  },
  {
    category: 'curiosidades',
    title: '👥 El Mundial con más público por partido',
    text: 'El Mundial de Estados Unidos 1994 tiene el récord de asistencia promedio por partido de toda la historia: cerca de 69.000 espectadores.',
    source: 'USA 1994, mayor promedio de público por partido.',
  },
  {
    category: 'records',
    title: '🕺 Un goleador de 42 años',
    text: 'Roger Milla es el goleador más veterano de los Mundiales: anotó con Camerún a los 42 años, en 1994.',
    source: 'Milla, 42 años, goleador más veterano (1994).',
  },
  {
    category: 'historia',
    title: '📺 El primer Mundial a color',
    text: 'México 1970 fue el primer Mundial transmitido a color y también el primero en usar tarjetas amarillas y rojas.',
    source: 'México 1970: primera transmisión a color y debut de las tarjetas.',
  },
  {
    category: 'jugadores',
    title: '🧤 El primero en jugar cinco Mundiales',
    text: 'El arquero mexicano Antonio Carbajal fue el primer futbolista en disputar cinco Mundiales, entre 1950 y 1966.',
    source: 'Carbajal, primero en jugar 5 Mundiales.',
  },
  {
    category: 'selecciones',
    title: '🇪🇸 La espera terminó en 2010',
    text: 'España tardó en llegar a lo más alto: fue campeona del mundo por primera vez en 2010, en Sudáfrica.',
    source: 'España campeona en Sudáfrica 2010.',
  },
  {
    category: 'historia',
    title: '⚽ El primer gol de todos los Mundiales',
    text: 'El primer gol en la historia de los Mundiales lo marcó el francés Lucien Laurent, en 1930.',
    source: 'Lucien Laurent, primer gol mundialista (1930).',
  },
  {
    category: 'records',
    title: '🎆 La final con más goles',
    text: 'La final con más goles fue la de 1958: Brasil venció 5-2 a Suecia, con un Pelé adolescente brillando.',
    source: 'Final 1958, Brasil 5-2 Suecia (7 goles).',
  },
  {
    category: 'jugadores',
    title: '🐐 Messi tocó la gloria en su quinto Mundial',
    text: 'En Qatar 2022, Lionel Messi cerró su quinto Mundial levantando por fin la copa y siendo elegido el mejor jugador del torneo.',
    source: 'Messi, campeón y Balón de Oro en 2022.',
  },
  {
    category: 'historia',
    title: '🕊️ Los 16 años sin Mundial',
    text: 'Hubo 16 años sin Mundial: las ediciones de 1942 y 1946 se cancelaron por la Segunda Guerra Mundial.',
    source: '1942 y 1946 no se jugaron por la guerra.',
  },
  {
    category: 'mundial-2026',
    title: '🇲🇽 El primer país con tres Mundiales',
    text: 'Con su participación en 2026, México será el primer país en albergar partidos de tres Mundiales distintos: 1970, 1986 y 2026.',
    source: 'México, sede en 1970, 1986 y 2026.',
  },
  {
    category: 'historia',
    title: '⏱️ El gol que acababa el partido al instante',
    text: 'El "gol de oro", que terminaba el partido al instante en la prórroga, solo existió en los Mundiales de 1998 y 2002 antes de eliminarse.',
    source: 'Gol de oro vigente en 1998 y 2002.',
  },
];

/** Vista lista para pintar: dato del día + posición en la serie. */
export interface DailyFactToday {
  title: string;
  text: string;
  categoryLabel: string;
  /** 1-based: 1 = día inaugural. */
  day: number;
  /** Total de datos en la serie (40). */
  total: number;
}

/**
 * Número de día (1-based) de `now` respecto al ancla, contando DÍAS DE
 * CALENDARIO en TZ Bogotá. Reduce ambas fechas a su día Bogotá (yyyy-MM-dd) y
 * resta — así el corte de día cae a la medianoche de Bogotá, no a la de UTC, y
 * la hora exacta del kickoff del ancla es irrelevante (el día 1 dura toda esa
 * jornada).
 */
function bogotaDayNumber(now: Date, anchor: Date): number {
  const nowMs = Date.parse(`${formatMatchDateKey(now)}T00:00:00Z`);
  const anchorMs = Date.parse(`${formatMatchDateKey(anchor)}T00:00:00Z`);
  return Math.floor((nowMs - anchorMs) / 86_400_000) + 1;
}

/**
 * Dato curioso correspondiente a `now`, anclado a `anchor` (la fecha del lock).
 * Devuelve null si:
 *   - no hay ancla (lock sin resolver),
 *   - aún no llega el día 1 (no debería pasar: Comunidad es post-lock), o
 *   - ya pasó el día 40 (el torneo terminó; la cápsula se retira).
 */
export function getDailyFact(now: Date, anchor: Date | null): DailyFactToday | null {
  if (!anchor) return null;
  const total = DAILY_FACTS.length;
  const day = bogotaDayNumber(now, anchor);
  if (day < 1 || day > total) return null;
  const fact = DAILY_FACTS[day - 1];
  return {
    title: fact.title,
    text: fact.text,
    categoryLabel: CATEGORY_LABEL[fact.category],
    day,
    total,
  };
}
