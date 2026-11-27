// The Spanish text of the UI: the same shape as `en.ts` (a missing or extra key fails the build), in the football
// Spanish of Spain, whose conventions the dates and numbers follow too (see `index.ts`). It speaks to the player as
// "tú", as games in Spanish do. The comments in `en.ts` say what each string is for.
//
// Spanish puts the plural after every number but 1 ("0 cambios", "1 cambio"), and the words after a count agree with
// its noun ("1 cambio aplicado", "3 cambios aplicados"), so the sentences with a count are written out for one and for
// many.

import type { Concern, Entity, OpportunityKind } from "../types";
import type { ErrorTexts, Strings } from "./en";
import { fieldName } from "./fieldNames";
import { reasonText } from "./reasons";
import { REASONS_ES } from "./reasons/es";

const numbers = new Intl.NumberFormat("es-ES");
const percents = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

/**
 * A count or an amount with the thousands separators of the language: "12.345", but "1234", as Spanish leaves four
 * digits whole.
 */
const format = (value: number) => numbers.format(value);

/** "0 cambios", "1 cambio", "12.345 cambios". */
const changes = (count: number) => (count === 1 ? "1 cambio" : `${format(count)} cambios`);

/** For the places that say how many changes there are, which may be none: "Ningún cambio", "3 cambios". */
const changeCount = (count: number) => (count === 0 ? "Ningún cambio" : changes(count));

/** "1 valor sin tocar", "12 valores sin tocar". */
const valuesLeftAlone = (count: number) =>
  count === 1 ? "1 valor sin tocar" : `${format(count)} valores sin tocar`;

/** What each list holds, for one and for many. Every one of them is masculine, so the words around them are too. */
const nouns: Record<Entity, { one: string; many: string }> = {
  player: { one: "jugador", many: "jugadores" },
  staff: { one: "empleado", many: "empleados" },
  club: { one: "club", many: "clubes" },
};

/** "237 jugadores", "1 empleado", "12 clubes". */
const entityCount = (entity: Entity, count: number) =>
  `${format(count)} ${count === 1 ? nouns[entity].one : nouns[entity].many}`;

const SQUAD_STATUSES: Partial<Record<number, string>> = {
  1: "Jugador estrella",
  2: "Jugador importante",
  3: "Titular habitual",
  4: "Jugador de rotación",
  5: "Revulsivo",
  7: "Jugador secundario",
  9: "Suplente de emergencia",
  10: "Promesa a punto de despuntar",
  11: "Promesa de futuro",
  13: "Joven",
  14: "Habitual del filial",
  15: "Portero titular",
  16: "Portero de copa",
  17: "Portero de copa nacional",
  20: "Portero suplente",
  21: "Portero suplente de emergencia",
  22: "Prescindible",
};

/** The kinds of contract (see `en.ts`). */
const CONTRACT_TYPES: Partial<Record<number, string>> = {
  0: "Contrato a tiempo parcial",
  1: "Contrato a tiempo completo",
  2: "Contrato amateur",
  3: "Contrato juvenil",
  4: "Sin contrato",
  8: "Contrato sénior",
  10: "Contrato sénior de salario mínimo",
  11: "Contrato sénior",
};

/** The name of the field a failure names. */
const field = (key: string | undefined) => fieldName(es, key ?? "");

/** A day the commands name as "20280131", written out in the language's own way. */
const dayText = (value: string | undefined) => {
  const [y, m, d] = [Number(value?.slice(0, 4)), Number(value?.slice(4, 6)), Number(value?.slice(6, 8))];
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
};

/** The noun of the kind of record a failure names, or "registro" when it names none. */
const recordNoun = (entity: string | undefined) =>
  entity === "player" || entity === "staff" || entity === "club" ? nouns[entity].one : "registro";

/** The reasons the Rust side gives for a field that cannot be changed some way. */
const UNSUPPORTED: Partial<Record<string, string>> = {
  "a date can only be set or moved by years": "una fecha solo se puede fijar o mover por años",
  "only a date can be moved by years": "solo una fecha se puede mover por años",
  "it is changed one person at a time": "se cambia persona a persona",
  "the new value is not one of the game's own records of that kind":
    "el nuevo valor no es uno de los registros del propio juego de ese tipo",
  "the in-game date is not known": "no se conoce la fecha del juego",
};

const reload = "vuelve a leer los datos e inténtalo de nuevo";

/** The lists of a club's staff, as `staff.noRoom` names them. */
const STAFF_DEPARTMENTS: Partial<Record<string, string>> = {
  medical: "del personal médico",
  coaching: "del cuerpo técnico",
  scouting: "de ojeadores",
};

/** The kinds of contract clauses and bonuses, by the codes contracts hold them as (see `en.ts`). */
const CLAUSE_NAMES_ES: Partial<Record<number, string>> = {
  0: "Cláusula de rescisión por traspaso mínimo",
  1: "Cláusula de rescisión por descenso",
  2: "Cláusula de rescisión por no ascender",
  3: "Aumento salarial anual",
  4: "Aumento salarial por ascenso",
  5: "Rebaja salarial por descenso",
  6: "Cláusula de salida para un puesto técnico",
  8: "Porcentaje de un futuro traspaso",
  9: "Porcentaje del beneficio de un futuro traspaso",
  10: "Prima por objetivo de goles en la temporada",
  11: "Ampliación de un año tras partidos de liga (última temporada)",
  12: "Cláusula de igualar al mejor pagado",
  13: "Salario tras alcanzar partidos de liga con el club",
  14: "Aumento salarial por ascenso a primera división",
  15: "Rebaja salarial por descenso de primera división",
  16: "Cláusula de rescisión por traspaso mínimo (clubes extranjeros)",
  17: "Cláusula de rescisión por traspaso mínimo (clubes nacionales de categoría superior)",
  18: "Cláusula de rescisión por traspaso mínimo (clubes nacionales)",
  19: "Salario tras alcanzar partidos internacionales",
  20: "Porcentaje del salario pagado por un patrocinador",
  21: "Porcentaje de la taquilla para el jugador",
  22: "Ampliación opcional del contrato por parte del club",
  23: "Renuncia a la compensación del club por un puesto de entrenador",
  25: "Ampliación de un año tras partidos de liga (última temporada con ascenso)",
  26: "Ampliación de un año tras partidos de liga (última temporada sin descenso)",
  27: "Cláusula de rescisión por traspaso mínimo (clubes en la Liga de Campeones de la UEFA)",
  28: "Cláusula de contrato garantizado de la MLS",
  29: "Ampliación del contrato tras ascender",
  30: "Cláusula de rescisión por lesión",
  31: "Cláusula de rescisión por traspaso mínimo (clubes en una competición continental)",
  32: "Prima por partido jugado",
  33: "Prima por gol",
  34: "Prima por portería a cero",
  37: "Prima por internacionalidad",
  38: "Prima por suplente no utilizado",
  39: "Prima por asistencia",
  40: "Prima por objetivo de asistencias en la temporada",
  41: "Prima por objetivo de goles y asistencias en la temporada",
  54: "No se muestra en el juego (54)",
  55: "Cláusula de rescisión por descenso activa",
  56: "Cláusula de rescisión por no ascender activa",
  58: "No se muestra en el juego (58)",
  63: "No se muestra en el juego (63)",
};

/** Players' traits (preferred moves), by their bit in the game's mask (see `en.ts`). */
const TRAIT_NAMES_ES: readonly string[] = [
  "Conduce el balón por la izquierda",
  "Conduce el balón por la derecha",
  "Conduce el balón por el centro",
  "Se mete en el área rival",
  "Se desmarca a los espacios",
  "Sube al ataque siempre que puede",
  "Juega pases cortos y sencillos",
  "Intenta pases definitivos a menudo",
  "Dispara desde lejos",
  "Dispara con potencia",
  "Coloca los disparos",
  "Golpea con efecto",
  "Le gusta regatear al portero",
  "Le gusta romper el fuera de juego",
  "Usa el exterior del pie",
  "Marca de cerca al rival",
  "Provoca a los rivales",
  "Protesta a los árbitros",
  "Juega de espaldas a la portería",
  "Baja a recibir el balón",
  "Hace paredes",
  "Le gusta hacer vaselinas al portero",
  "Marca el ritmo del juego",
  "Intenta chilenas",
  "Busca el pase antes que el disparo",
  "No juega balones al hueco",
  "Detiene el juego",
  "Se pasa el balón por delante del rival",
  "Se pasa el balón a la derecha antes de regatear",
  "Se pasa el balón a la izquierda antes de regatear",
  "Se recrea con el balón",
  "Llega tarde al área rival",
  "Intenta salir jugando de los apuros",
  "Se queda siempre atrás",
  "Evita usar la pierna mala",
  "Intenta jugadas de fantasía",
  "Intenta faltas lejanas",
  "Se lanza al suelo en las entradas",
  "No se lanza al suelo en las entradas",
  "Recorta hacia dentro",
  "Se pega a la banda",
  "Anima al público",
  "Intenta disparos al primer toque",
  "Intenta pases largos",
  "Le gusta recibir al pie",
  "Lanza las faltas con potencia",
  "Le gusta regatear una y otra vez",
  "Le gusta cambiar el juego a la otra banda",
  "Se retirará en lo más alto",
  "Jugará al fútbol tanto tiempo como pueda",
  "Tiene un saque de banda largo y tenso",
  "Conduce el balón a menudo",
  "Conduce el balón pocas veces",
  "Intenta mejorar la pierna mala",
  "Delantero de referencia estático",
  "Usa el saque de banda largo para iniciar contraataques",
  "Evita los disparos lejanos",
  "Recorta hacia dentro desde la banda izquierda",
  "Recorta hacia dentro desde la banda derecha",
  "Centra pronto",
  "Saca el balón jugado desde la defensa",
  "Juega el balón con los pies",
];

/** What a check is about, from the key a failure gives, with a capital. */
const checkName = (key: string | undefined) => {
  const name = (es.checks as Partial<Record<string, string>>)[key ?? ""] ?? key ?? "";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

/** The name of a job code a failure gives, as `jobs` below has it. */
const jobName = (code: string | undefined) => (es.jobs as Partial<Record<number, string>>)[Number(code)] ?? code;

const errors: ErrorTexts = {
  "team.nobodyInjured": () => "Nadie en este equipo está lesionado.",
  "team.noCohesion": () =>
    "El editor no puede leer la cohesión de este equipo: esta versión del juego no se ha comprobado, o ninguno de " +
    "sus jugadores tiene cohesión con el club.",
  "team.noTactics": () =>
    "El editor no puede leer cuánto conoce este equipo su táctica: esta versión del juego no se ha comprobado, o el " +
    "equipo no juega una táctica que elijas tú.",
  "guard.unknownBuild": () =>
    "FMLibreEditor no se ha probado con esta versión del juego, así que no escribe en ella. «Editar de todos modos», " +
    "en el aviso de arriba, activa la edición.",
  "guard.failed": (p) =>
    `${checkName(p.check)}: no han superado las comprobaciones en esta versión del juego, así que FMLibreEditor no ` +
    "los cambia.",
  "guard.saveChanged": () =>
    "El juego ha cargado una partida, o ha vuelto a su menú principal, desde que FMLibreEditor lo leyó, así que no " +
    "cambia nada hasta que se recarguen los datos.",
  "edit.unknownField": (p) => `Aquí no hay ningún campo editable llamado «${p.field}».`,
  "edit.outOfRange": (p) => `${p.value} no es un valor válido para ${field(p.field)}: admite de ${p.min} a ${p.max}.`,
  "edit.notADate": (p) => `${p.value} no es una fecha válida para ${field(p.field)}.`,
  "edit.notAChoice": (p) => `${p.value} no es uno de los valores que admite ${field(p.field)}.`,
  "edit.taken": (p) => `El dorsal ${p.value} está ocupado: lo lleva ${p.name ?? `el jugador con UID ${p.uid}`}.`,
  "edit.unsupported": (p) => `${field(p.field)} no se puede cambiar así: ${UNSUPPORTED[p.reason] ?? p.reason}.`,
  "edit.moved": (p) => `Este ${recordNoun(p.entity)} ha cambiado de sitio en la memoria del juego; ${reload}.`,
  "edit.noRecord": (p) => `${field(p.field)} no se puede cambiar aquí: su registro falta o no supera la comprobación.`,
  "edit.unset": (p) => `${field(p.field)} no está fijado en el juego, así que no se ha tocado.`,
  "edit.implausible": (p) =>
    `${field(p.field)} marca ${p.value}, un valor que no puede tener; por seguridad, no se ha tocado.`,
  "edit.notApplied": (p) => `${field(p.field)}: se escribió ${p.wrote}, pero al releerlo dio ${p.read}.`,
  "edit.conflict": (p) =>
    `${field(p.field)} vale ahora ${p.found}, no ${p.expected}: el juego lo ha cambiado desde entonces.`,
  "move.moved": () => `El jugador ha cambiado de sitio en la memoria del juego; ${reload}.`,
  "move.notAClub": () => "Este club no tiene un primer equipo al que pueda unirse el jugador.",
  "move.freeAgent": () => "El jugador es agente libre: no tiene un club que dejar ni con el que intercambiar.",
  "move.sameClub": () => "El jugador ya está en este club.",
  "move.onLoan": () =>
    "El jugador está cedido: repéscalo primero o haz la cesión definitiva, en la parte Cesión de su perfil.",
  "move.notOnLoan": () => "El jugador no está cedido.",
  "move.playerCoach": () => "Los jugadores-entrenadores no se pueden traspasar: también trabajan como personal.",
  "move.unusualContract": () => "El contrato del jugador no es un contrato de jugador corriente.",
  "move.humanClub": () =>
    "El jugador está en un club que dirige un mánager humano. En esta versión del juego, el editor aún no " +
    "encuentra las alineaciones del club, así que solo puede salir del club desde el propio juego.",
  "move.menAndWomen": () => "Uno de los clubes es masculino y el otro, femenino.",
  "move.notListed": () => "Las listas de la plantilla no tienen al jugador donde deberían.",
  "move.noRoom": (p) =>
    `La lista de la plantilla del club no tiene sitio para otro jugador (ahora ${p.players}) y el editor no puede ` +
    "ampliarla en este sistema.",
  "sign.noPool": () =>
    "El editor no encuentra dónde guarda el juego sus contratos en esta versión, así que no puede darle uno a un " +
    "agente libre.",
  "sign.poolFull": () =>
    "El juego no tiene sitio para otro contrato hasta que haga uno él mismo, como hace al pasar los días: avanza un " +
    "día en el juego y vuelve a intentarlo.",
  "arrange.unknown": () => "El editor no encuentra dónde guarda el juego sus traspasos en esta versión del juego.",
  "arrange.underWay": () => "El jugador ya tiene un movimiento acordado, o una oferta sin responder.",
  "arrange.noMemory": () =>
    "El editor no pudo reservar memoria en el juego para esto: el sistema no le dejó ejecutar por él las propias " +
    "funciones del juego.",
  "arrange.made": () =>
    "El juego ya ha hecho este traspaso, o ha cambiado lo que escribió prepararlo: no se puede deshacer.",
  "sign.noModel": () =>
    "El club no tiene en su primer equipo ningún jugador con un contrato corriente en el que basar el nuevo.",
  "sign.noDate": () => "El editor no puede leer la fecha del juego, que es cuando empieza el nuevo contrato.",
  "loan.end": (p) => `La cesión debe acabar después de su llegada y no más tarde que su contrato: entre el ${dayText(p.earliest)} y el ${dayText(p.latest)}.`,
  "loan.noModel": () => "El juego no tiene una cesión propia en curso en la que basar esta. Inténtalo de nuevo tras un día de juego.",
  "move.outOfRange": (p) => `${p.value} no es un valor válido para ${field(p.field)}: admite de ${p.min} a ${p.max}.`,
  "move.changed": () => `El juego ha cambiado esa memoria desde entonces; ${reload}.`,
  "move.notApplied": () => "Se escribió en la memoria, pero al releerla dio otra cosa.",
  "heal.notInjured": () => "El jugador no tiene ninguna lesión que curar.",
  "ban.notBanned": () => "El jugador no tiene ninguna sanción que levantar.",
  "relation.missing": () => `Esa nacionalidad o formación ya no está en la lista del jugador; ${reload}.`,
  "relation.noRoom": () =>
    "La lista del jugador no tiene sitio y el editor no puede ampliarla; cambia una de sus entradas en su lugar.",
  "relation.target": () => "No es un país ni un club del juego del tipo que admite esta entrada.",
  "relation.same": () => "El jugador ya tiene eso.",
  "relation.rule": (p) => `La regla de formación local ${p.rule} no es de las que escribe el editor.`,
  "staff.you": () => "Eres tú, el mánager que controlas.",
  "staff.unemployed": () => "Este miembro del personal no tiene club.",
  "staff.role": () =>
    "El club o uno de sus equipos apunta directamente a este miembro del personal (como a un mánager que también es " +
    "su director de fútbol, o a un presidente que dirige el equipo); de moverlo se encarga el propio juego.",
  "staff.notListed": () => "Las listas de personal del club no lo tienen donde deberían.",
  "staff.noRoom": (p) =>
    `La lista ${STAFF_DEPARTMENTS[p.department] ?? `de ${p.department}`} del club no tiene sitio para nadie más ` +
    `(ahora ${p.staff}) y el editor no puede ampliarla aquí.`,
  "names.unknown": () =>
    "El editor no encuentra dónde guarda el juego los nombres de las personas en esta versión, así que no puede cambiarlos.",
  "names.noRoom": (p) =>
    `El juego no tiene sitio ahora mismo para otro ${({ first: "nombre", last: "apellido", common: "nombre común" } as Record<string, string>)[p.table] ?? "nombre"} nuevo. ` +
    "Lo hace él solo cuando entran jugadores y personal nuevos; o guarda la partida, vuelve a cargarla e inténtalo de nuevo.",
  "names.same": () => "Ese ya es el nombre.",
  "names.bad": (p) =>
    `Un nombre o un apellido no puede estar vacío, y ningún nombre puede empezar o acabar con un espacio, tener caracteres de control ni ocupar más de ${p.max} bytes.`,
  "stadium.none": () => "No se puede leer el estadio en el que juega el primer equipo del club.",
  "stadium.shared": (p) => `${p.holders} cosas del juego comparten este nombre; no se puede cambiar solo para el estadio.`,
  "stadium.nameLength": (p) =>
    `El nuevo nombre de este estadio debe ocupar de ${p.min} a ${p.max} bytes para caber donde el juego lo guarda; este ocupa ${p.bytes}.`,
  "stadium.badName": () => "El nombre de un estadio no puede estar vacío, empezar o acabar con un espacio ni tener caracteres de control.",
  "staff.job": (p) => `El editor todavía no mueve al personal con el puesto de ${jobName(p.job)} ni da ese puesto.`,
  "staff.directorTaken": (p) =>
    `El club ya tiene director de fútbol: ${p.name ?? "otra persona"}. Dale a este miembro del personal otro puesto ` +
    `allí, o mueve antes a ${p.name ?? "esa persona"}.`,
  "staff.managerTaken": (p) =>
    `El club ya tiene mánager: ${p.name ?? "otra persona"}. Dale a este miembro del personal otro puesto allí, o ` +
    `mueve antes a ${p.name ?? "esa persona"}.`,
  "staff.yourClub": () =>
    "Este club lo diriges tú. Dale a este miembro del personal otro puesto allí: FMLibreEditor nunca ocupa tu lugar.",
  "staff.noJob": () => "Elige el puesto que ocupará en el club.",
  "staff.noModel": (p) =>
    p.staff === "0"
      ? "Este club no tiene personal: el juego no lo mantiene en los clubes de ligas que no son jugables en esta " +
        "partida."
      : "Nadie del personal de este club tiene un contrato completo propio en el que basar uno nuevo.",
  "squad.noTeam": () => `El club no tiene ese equipo o no supera la comprobación; ${reload}.`,
  "captain.notInTeam": () =>
    "El jugador no juega en este equipo; el capitán solo puede ser uno de los jugadores del propio equipo.",
  "captain.unchanged": () => "El jugador ya tiene ese papel.",
  "session.notRunning": () =>
    "Football Manager 27 no se está ejecutando. Inicia el juego, carga una partida y vuelve a intentarlo.",
  "session.noSuchProcess": (p) => `No hay ningún ${p.exe ?? "fm.exe"} con el PID ${p.pid}.`,
  "session.severalRunning": (p) => `Hay ${p.count} copias de ${p.exe ?? "fm.exe"} en ejecución (${p.pids}); elige una.`,
  "session.pluginNotLoaded": () =>
    "Los datos del juego aún no se han cargado; espera al menú principal y vuelve a intentarlo.",
  "session.unsupportedEdition": (p) => `FM${p.edition} aún no es compatible.`,
  "session.unknownEdition": () => "No se ha podido saber qué Football Manager es este.",
  "session.playersNotFound": () =>
    "No se ha encontrado la lista de jugadores; carga una partida (el menú principal no basta) y vuelve a intentarlo.",
  "memory.win32": (p) => `Windows ha rechazado una operación (${p.operation}, error ${p.code}).`,
  "memory.read": (p) => `No se ha podido leer la memoria del juego (error del sistema ${p.code}).`,
  "memory.write": (p) => `No se ha podido escribir en la memoria del juego (error del sistema ${p.code}).`,
  "memory.readOnly": () => "El juego se abrió solo para lectura; Windows no ha permitido escribir.",
  "memory.notWritable": () =>
    "Esa dirección no está en la memoria de datos modificable del juego, así que no se ha escrito.",
  "memory.invalidPe": () => "No se ha podido leer el módulo del juego.",
  "memory.invalidMachO": () => "No se ha podido leer el módulo del juego.",
  "memory.mach": (p) => `macOS ha rechazado una operación (${p.operation}, error ${p.code}).`,
  "memory.posix": (p) => `macOS ha rechazado una operación (${p.operation}, errno ${p.code}).`,
  "memory.noBridge": () =>
    "macOS no deja entrar a FMLibreEditor en el juego: el juego se inició sin el puente de FMLibreEditor. " +
    "Instala el puente y vuelve a iniciar el juego desde Steam.",
  "memory.bridge": (p) => `El puente de FMLibreEditor en el juego no ha entregado la memoria (${p.reason}).`,
  "scout.noClub": () => "No diriges ningún club en esta partida, así que no hay para quién ojear.",
  "scout.noTactic": (p) => `No se pudo leer del juego la táctica de ${p.club}.`,
  "scout.notPlaced": () => "El jugador no está en ningún puesto de la táctica.",
  "scout.unknownRole": (p) => `El editor no conoce el rol ${p.role}.`,
  "setup.steamRunning": () =>
    "Steam está abierto, así que no se han tocado las opciones de lanzamiento de FM27; el puente en sí está " +
    "instalado. Cierra Steam y vuelve a intentarlo, o introduce tú la opción de lanzamiento en Steam.",
  "setup.noSteamAccount": () =>
    "No se ha encontrado ninguna cuenta de Steam en este Mac; abre Steam e inicia sesión una vez.",
  "setup.noLibrary": (p) => `Falta un archivo del puente en la aplicación: ${p.path}`,
  "setup.unknownConfig": (p) => `${p.path} no tiene un formato que FMLibreEditor conozca, así que no se ha tocado.`,
  "setup.io": (p) => `${p.path}: ${p.error}`,
  "app.internal": () => "Se ha producido un error inesperado en la aplicación.",
  "app.notConnected": () => "No hay conexión con el juego.",
  "app.notFound": (p) =>
    `No hay ningún ${recordNoun(p.entity)} con el ID ${p.uid} en las listas; vuelve a leer los datos.`,
  "app.dataChanged": () => `Estos datos han cambiado en el juego; ${reload}.`,
  "app.noChange": (p) => `No existe el cambio ${p.id}.`,
  "app.alreadyUndone": () => "Este cambio ya se ha deshecho.",
  "app.historyOnly": () => "Este cambio se hizo antes de la última conexión de la aplicación y deshacerlo requería la memoria del juego tal como estaba entonces: devuélvelo a mano.",
  "app.history": (p) => `No se pudo borrar el historial: ${p.reason}`,
  "export.failed": (p) => `No se ha podido escribir el archivo: ${p.reason}`,
  "export.notAllowed": (p) =>
    `FMLibreEditor no puede escribir en ${p.folder}. Si macOS ha preguntado si puede usar tu carpeta Documentos, ` +
    "permítelo en Ajustes del Sistema › Privacidad y seguridad › Archivos y carpetas y vuelve a exportar.",
  "export.noFolder": () => "No hay ninguna carpeta a la que exportar.",
  "export.notExported": () => "Ese no es un archivo que haya exportado FMLibreEditor.",
  "export.openFailed": (p) => `No se ha podido abrir: ${p.reason}`,
  "mass.noOperations": () => "Elige al menos un campo que cambiar.",
  "mass.tooMany": (p) =>
    `Hay ${p.count} resultados. Para una edición masiva, acota la búsqueda o los filtros a ${p.limit} como máximo.`,
  "recipe.tooOld": (p) =>
    `El jugador tiene ${p.age} años: esta receta es para jugadores de ${p.oldest} años o menos.`,
  "recipe.ageUnknown": () => "No se conoce la edad del jugador, y esta receta depende de ella.",
  "recipe.outOfDate": () => "Esta vista previa está desfasada. Vuelve a abrir la receta.",
  "mass.outOfDate": () => "Esta vista previa está desfasada. Vuelve a generar la vista previa de la edición masiva.",
};

export const es: Strings = {
  attributes: {
    // Técnicos
    corners: "Saques de esquina",
    crossing: "Centros",
    dribbling: "Regate",
    finishing: "Remate",
    first_touch: "Control",
    free_kicks: "Lanzamiento de faltas",
    heading: "Cabeceo",
    long_shots: "Tiros lejanos",
    long_throws: "Saque de banda largo",
    marking: "Marcaje",
    passing: "Pases",
    penalty_taking: "Penaltis",
    tackling: "Entradas",
    technique: "Técnica",
    // Mentales
    aggression: "Agresividad",
    anticipation: "Anticipación",
    bravery: "Valentía",
    composure: "Serenidad",
    concentration: "Concentración",
    decisions: "Decisiones",
    determination: "Determinación",
    flair: "Talento",
    leadership: "Liderazgo",
    off_the_ball: "Desmarques",
    positioning: "Colocación",
    teamwork: "Juego en equipo",
    vision: "Visión",
    work_rate: "Sacrificio",
    // Físicos
    acceleration: "Aceleración",
    agility: "Agilidad",
    balance: "Equilibrio",
    jumping_reach: "Alcance de salto",
    natural_fitness: "Recuperación física",
    pace: "Velocidad",
    stamina: "Resistencia",
    strength: "Fuerza",
    // Portero (el control y los pases son los de Técnicos)
    aerial_reach: "Alcance aéreo",
    command_of_area: "Mando en el área",
    communication: "Comunicación",
    eccentricity: "Excentricidad",
    handling: "Blocaje",
    kicking: "Saque con el pie",
    one_on_ones: "Uno contra uno",
    punching: "Despeje de puños (tendencia)",
    reflexes: "Reflejos",
    rushing_out: "Salidas (tendencia)",
    throwing: "Saque con la mano",
    // Ocultos
    consistency: "Regularidad",
    dirtiness: "Juego sucio",
    important_matches: "Partidos importantes",
    injury_proneness: "Propensión a lesiones",
    versatility: "Versatilidad",
    // Pies
    left_foot: "Pie izquierdo",
    right_foot: "Pie derecho",
  },

  staffAttributes: {
    // Entrenamiento
    attacking: "Ataque",
    defending: "Defensa",
    fitness: "Preparación física",
    goalkeeping: "Porteros",
    possession: "Posesión",
    set_pieces: "Balón parado",
    tactical: "Táctica",
    technical: "Técnica",
    working_with_youngsters: "Trabajo con jóvenes",
    // Mentales
    authority: "Autoridad",
    determination: "Determinación",
    motivating: "Motivación",
    people_management: "Gestión de personas",
    // Conocimientos
    data_analysis: "Análisis de datos",
    judging_ability: "Valorar la calidad de jugadores",
    judging_potential: "Valorar el potencial de jugadores",
    judging_staff: "Valorar la calidad del personal",
    negotiating: "Negociación",
    tactical_knowledge: "Conocimiento táctico",
    // Médicos
    physiotherapy: "Fisioterapia",
    sports_science: "Ciencias del deporte",
  },

  personality: {
    adaptability: "Adaptabilidad",
    ambition: "Ambición",
    loyalty: "Lealtad",
    pressure: "Presión",
    professionalism: "Profesionalidad",
    sportsmanship: "Deportividad",
    temperament: "Temperamento",
    controversy: "Controversia",
  },

  positions: {
    gk: "GK",
    sw: "SW",
    dl: "DL",
    dc: "DC",
    dr: "DR",
    dm: "DM",
    ml: "ML",
    mc: "MC",
    mr: "MR",
    aml: "AML",
    amc: "AMC",
    amr: "AMR",
    st: "ST",
    wbl: "WBL",
    wbr: "WBR",
  },

  clubFacilities: {
    training: "Entrenamiento",
    youth_facilities: "Instalaciones de cantera",
    youth_coaching: "Formación en la cantera",
    youth_recruitment: "Captación de cantera",
    corporate: "Corporativas",
  },

  supporterTraits: {
    loyalty: "Lealtad",
    passion: "Pasión",
    patience: "Paciencia",
    affluence: "Poder adquisitivo",
    temperament: "Temperamento",
    expectations: "Expectativas",
  },

  supporterMix: {
    hardcore: "Incondicionales",
    core: "Habituales",
    family: "Familias",
    fair_weather: "Oportunistas",
    corporate: "Corporativos",
    casual: "Ocasionales",
  },

  jobs: {
    1: "Jugador",
    2: "Entrenador",
    4: "Presidente",
    6: "Directivo",
    10: "Director de fútbol",
    12: "Fisioterapeuta",
    14: "Ojeador",
    16: "Mánager",
    20: "Segundo entrenador",
    22: "Entrenador de balón parado",
    26: "Preparador físico",
    34: "Entrenador de porteros",
    // Named as the game's Spanish text names them.
    38: "Médico jefe",
    40: "Jefe de ciencias del deporte",
    44: "Jefe de ojeadores",
    46: "Médico",
    48: "Científico deportivo",
    50: "Fisioterapeuta jefe",
    58: "Analista de captación",
    60: "Analista de rendimiento",
    62: "Analista jefe de rendimiento",
    64: "Director de cantera",
    66: "Propietario",
    70: "Presidente del club",
    86: "Gestor de cesiones",
    88: "Director técnico",
  },

  fields: {
    current_ability: "Habilidad actual",
    potential_ability: "Habilidad potencial",
    height: "Altura (cm)",
    date_of_birth: "Fecha de nacimiento",
    asking_price: "Precio de venta",
    nation: "Nacionalidad",
    city_of_birth: "Ciudad de nacimiento",
    "reputation.home": "Reputación local",
    "reputation.current": "Reputación actual",
    "reputation.world": "Reputación mundial",
    "international.caps": "Partidos internacionales",
    "international.goals": "Goles internacionales",
    "international.u21_caps": "Partidos sub-21",
    "international.u21_goals": "Goles sub-21",
    condition: "Energía",
    match_sharpness: "Ritmo de competición",
    jadedness: "Fatiga",
    morale: "Moral",
    "contract.wage": "Salario semanal",
    wageShare: "parte del salario",
    monthlyFee: "cuota mensual",
    optionFee: "opción de compra",
    "contract.loyalty_bonus": "Prima de fidelidad semanal",
    "contract.happiness": "Felicidad",
    "contract.playing_time_happiness": "Felicidad con los minutos",
    "contract.unhappiness": "Motivos de descontento",
    "contract.expires": "Fin de contrato",
    "contract.squad_number": "Dorsal",
    "contract.squad_status": "Estatus en la plantilla",
    "contract.transfer_listed": "Transferible",
    "contract.loan_listed": "Cedible",
    "loan.expires": "Fin de la cesión",
    "loan.option_fee": "Opción de compra",
    "contract.job": "Puesto",
    "tie.nationality": "Nacionalidad secundaria",
    "tie.trainedInNation": "Formado en el país",
    "tie.trainedAtClub": "Formado en el club",
    "tie.workPermit": "Sin permiso de trabajo en",
    club: "Club",
    injuries: "Lesiones",
    cohesion: "Cohesión",
    tactics: "Familiaridad táctica",
    bans: "Sanciones",
    retirement: "Retirada",
    clause: "Cláusula del contrato",
    "clause.amount": "Importe de la cláusula",
    "clause.condition": "Condición de la cláusula",
    captain: "Capitán",
    vice_captain: "Vicecapitán",
    reputation: "Reputación",
    "facilities.training": "Instalaciones de entrenamiento",
    "facilities.youth_facilities": "Instalaciones de cantera",
    "facilities.youth_coaching": "Formación en la cantera",
    "facilities.youth_recruitment": "Captación de cantera",
    "facilities.corporate": "Instalaciones corporativas",
    "finance.balance": "Saldo",
    "finance.transfer_budget": "Presupuesto de fichajes",
    "finance.wage_budget": "Presupuesto salarial",
    "finance.total_wage_budget": "Presupuesto salarial total",
    "stadium.capacity": "Aforo del estadio",
    "stadium.name": "Nombre del estadio",
    "name.first": "Nombre",
    "name.last": "Apellido",
    "name.common": "Nombre común",
    "name.full": "Nombre completo",
    "stadium.seating": "Aforo con asientos",
    "stadium.used": "Aforo en uso",
    "stadium.expansion": "Aforo ampliable",
    "prize.win": "Premio de la liga por victoria",
    "prize.draw": "Premio de la liga por empate",
    "prize.loss": "Premio de la liga por derrota",
  },

  profile: {
    close: "Cerrar perfil",
    loading: "Cargando perfil…",
    resize: "Cambiar el ancho del panel del perfil",
    resizeHint: "Arrastra para ensanchar o estrechar el panel; haz doble clic para devolverle su ancho",
    none: "—",

    // Cabecera
    freeAgent: "Agente libre",
    born: "Nacimiento:",
    height: (cm) => `${cm} cm`,
    heightUnit: "cm",
    uid: "UID",
    currentAbility: "Habilidad actual",
    currentAbilityShort: "HA",
    potentialAbility: "Habilidad potencial",
    potentialAbilityShort: "HP",
    potentialRange: "Potencial fijado como un rango",

    // Atributos
    technical: "Técnicos",
    goalkeeping: "Portero",
    mental: "Mentales",
    physical: "Físicos",
    hidden: "Ocultos",
    feet: "Pies",
    personality: "Personalidad",
    raw: (raw, scale = 100) => `valor interno ${raw} / ${scale}`,
    lowerIsBetter: "cuanto más bajo, mejor",
    age: (age) => `${age} años`,

    // Posiciones
    positions: "Posiciones",
    positionsSummary: (best) => `Valoraciones por posición: ${best}`,
    positionRatings: "Valoraciones por posición",
    positionTiers: {
      natural: "Natural",
      accomplished: "Hábil",
      competent: "Competente",
      unconvincing: "Poco convincente",
      ineffective: "Ineficaz",
    },
    positionTooltip: (position, rating, tier) => `${position} · ${rating} · ${tier}`,

    // Contrato
    contract: "Contrato",
    wage: "Salario semanal",
    wageNote: (converted) =>
      converted
        ? "el juego guarda libras; se muestra al cambio del propio FM"
        : "el juego guarda libras; puedes elegir otra moneda en los ajustes",
    signed: "Firmado",
    expires: "Vence",
    joined: "Incorporación",
    extendContract: (years: number) => `Ampliar ${years} años`,
    extendingContract: "Ampliando…",
    extendContractTitle: (years: number, until: string) => `El contrato dura ${years} años más, hasta el ${until}`,
    squadStatus: "Estatus en la plantilla",
    squadStatusName: (status) => SQUAD_STATUSES[status] ?? `Estatus ${status}`,
    contractType: "Tipo de contrato",
    contractTypeName: (code) => CONTRACT_TYPES[code] ?? `Tipo ${code}`,
    squadNumber: "Dorsal",
    transferListed: "Transferible",
    loanListed: "Cedible",

    // Trayectoria
    career: "Trayectoria",
    internationalCaps: "Partidos internacionales",
    internationalGoals: "Goles internacionales",
    u21Caps: "Partidos sub-21",
    u21Goals: "Goles sub-21",
    askingPrice: "Precio de venta",
    notSet: "Sin fijar",
    reputation: "Reputación",
    reputationHome: "Local",
    reputationCurrent: "Actual",
    reputationWorld: "Mundial",
    retirement: "Retirada",
    retires: "Prevé retirarse",
    noRetirement: "El juego no ha previsto su retirada",
    keepPlaying: "Evitar la retirada",
    keepingPlaying: "Evitando…",
    keepPlayingTitle:
      "Cancela su retirada prevista y le da la característica «Jugará al fútbol tanto tiempo como pueda»",

    // Médico
    morale: (value) => `${value} / 20`,
    traits: "Características",
    noTraits: "Sin características",
    traitName: (bit) => TRAIT_NAMES_ES[bit] ?? `Característica ${bit}`,
    unhappiness: "Descontento",
    noUnhappiness: "Nada le hace estar descontento",
    removeUnhappiness: "Quitar todo",
    removingUnhappiness: "Quitando…",
    removeUnhappinessTitle: "Quita de su lista todos los motivos de descontento",
    removeUnhappinessFollows:
      "Los motivos de sus compañeros con él terminan cuando el juego avanza: pulsa Continuar en el juego",
    concernSince: (date) => `desde el ${date}`,
    concernAbout: (name) => `sobre ${name}`,
    concernKind: (kind) => (kind === 1 ? "Preocupado" : kind === 2 ? "Interno" : `Tipo ${kind}`),
    concernMotive: (concern: Concern) => reasonText(REASONS_ES, concern) ?? `Motivo ${concern.motive}`,
    clauses: "Primas y cláusulas",
    noClauses: "Sin primas ni cláusulas",
    loyaltyBonus: "Prima de fidelidad",
    happiness: "Felicidad",
    playingTimeHappiness: "Felicidad con los minutos",
    moodTitle: "Como lo muestra FMRTE, de -100 a 100; el juego lo muestra con palabras",
    clauseName: (kind) => CLAUSE_NAMES_ES[kind] ?? `Cláusula ${kind}`,
    loan: "Cesión",
    loanAt: "Cedido a",
    loanParent: "Pertenece a",
    loanFrom: "Desde",
    loanUntil: "Hasta",
    loanNumber: "Dorsal allí",
    recall: "Repescar de la cesión",
    recallTitle: "Devolverlo hoy a su club; pregunta antes",
    recallAgain: "Repescar de nuevo",
    makePermanent: "Hacer definitiva",
    makePermanentTitle: "Que se quede en el club donde está cedido, con contrato con él; pregunta antes",
    recalledWaiting: "Repescado · vuelta pendiente",
    endsTodayWaiting: "Termina hoy · vuelta pendiente",
    pendingTitle: (parent) => `La cesión termina hoy: avanza un día en el juego y estará de vuelta en ${parent}`,
    endPassed: (date) =>
      `La cesión debía terminar el ${date}, pero el juego no lo ha devuelto. Repéscalo de nuevo y avanza un día.`,
    loanCanRecall: "Se puede repescar",
    loanCanRecallTitle: "Si su club puede repescarlo en el juego. Repescar de la cesión aquí funciona en ambos casos",
    loanCanTerminate: "Se puede rescindir",
    loanCupMatches: "Juega en copa",
    loanAgainstClub: "Juega contra su club",
    loanOptionFee: "Opción de compra",
    loanOptionFeeTitle: "El traspaso por el que el club donde está cedido puede ficharlo en propiedad",
    loanMonthlyFee: "Cuota mensual",
    loanMonthlyFeeTitle: "Lo que el club donde está cedido paga a su club por cada mes que juega",
    loanUnusedFee: "Cuota mensual sin jugar",
    loanUnusedFeeTitle: "Lo que el club donde está cedido paga a su club por cada mes que no juega",
    clauseCondition: (kind, value) => {
      switch (kind) {
        case 10:
          return value === 1 ? "1 gol" : `${format(value)} goles`;
        case 40:
          return value === 1 ? "1 asistencia" : `${format(value)} asistencias`;
        case 41:
          return `${format(value)} goles y asistencias`;
        case 19:
          return value === 1 ? "1 partido internacional" : `${format(value)} partidos internacionales`;
        case 11:
        case 13:
        case 25:
        case 26:
          return value === 1 ? "1 partido de liga" : `${format(value)} partidos de liga`;
        case 22:
        case 29:
          return value === 1 ? "1 año" : `${format(value)} años`;
        case 3:
        case 4:
        case 5:
        case 8:
        case 9:
        case 14:
        case 15:
        case 20:
        case 21:
          return `${value} %`;
        default:
          return String(value);
      }
    },
    clauseExpires: (date) => `vence el ${date}`,
    clauseExpiresAfter: (days) =>
      days === 1 ? "vence 1 día después de la firma" : `vence ${format(days)} días después de la firma`,
    clauseProfitShare: (percent, amount) => `${percent} del beneficio por encima de ${amount}`,
    clauseWage: (amount) => `${amount} a la semana`,
    moraleTitle:
      "La felicidad general en el juego: satisfecho con 10, algo feliz con 11, extremadamente feliz con 15 y 20",
    jadednessTitle:
      "Cuánto desgaste acumula por jugar: -500 es totalmente descansado y, cuanto más alto, más necesita descansar",
    noInjuries: "Sin lesiones",
    unknownInjury: "Lesión desconocida",
    injuryStarted: (date) => `Desde el ${date}`,
    injuryBack: (dates) => `Regreso previsto: ${dates}`,
    heal: "Curar",
    healTitle: "Curar todas las lesiones de este jugador en el juego",
    noBans: "Sin sanciones",
    banMatches: (matches) => (matches === 1 ? "1 partido" : `${format(matches)} partidos`),
    banStarted: (date) => `Desde el ${date}`,
    liftBans: "Levantar",
    liftBansTitle: "Levantar todas las sanciones de este jugador en el juego",

    // Sobre los atributos, mientras se lee el perfil
    maxAttributes: "Atributos al máximo",
    maxAttributesTitle: "Poner cada atributo en su mejor valor: 20, y 1 para la propensión a lesiones y el juego sucio",
    maxAttributesDone: (count) =>
      count === 0
        ? "Todos sus atributos ya están en su mejor valor"
        : count === 1
          ? "1 cambio escrito"
          : `${format(count)} cambios escritos`,
    maxAttributesUndone: (count) =>
      count === 0 ? "No se ha deshecho nada" : count === 1 ? "1 cambio deshecho" : `${format(count)} cambios deshechos`,
    undoMax: "Deshacer",
    undoMaxTitle: "Volver a escribir en el juego sus atributos anteriores",
    freezeAttributes: "Congelar los atributos",
    freezeAttributesNote:
      "Sus atributos no empeoran mientras la aplicación esté abierta y conectada; las mejoras siguen contando",
    maxStaffAttributesTitle: "Poner cada atributo de este miembro del personal en su mejor valor: 20",
    undoMaxStaffTitle: "Volver a escribir en el juego los atributos anteriores",
    freezeStaffAttributesNote:
      "Sus atributos no empeoran mientras la aplicación esté abierta y conectada; las mejoras siguen contando",
    freezeFitness: "Congelar energía y ritmo",
    freezeFitnessNote:
      "Su energía y su ritmo de competición no bajan con la aplicación abierta y conectada; lo que gana cuenta",
    freezePositions: "Congelar",
    freezePositionsInfo: "¿Qué hace congelar las posiciones?",
    freezePositionsNote:
      "Mientras la aplicación esté abierta y conectada, sus valoraciones por posición se quedan como están: no " +
      "aprende ninguna posición nueva y sus valoraciones ni suben ni bajan. La aplicación lo recuerda para esta " +
      "partida.",

    // Personal
    you: "Tú",
    youTitle: "El mánager que controlas en esta partida",
    id: "ID",
    job: "Puesto",
    changeJob: "Cambiar de puesto",
    changeJobTitle: "Dar a este miembro del personal otro puesto en su club en el juego",
    newJob: "Nuevo puesto",
    applyJob: "Aplicar",
    cancelJob: "Cancelar",
    unemployed: "Sin empleo",
    coaching: "Entrenamiento",
    knowledge: "Conocimientos",
    medical: "Médico",
    playerCoach: (job) => `${job} (jugador-entrenador)`,
    unknownJob: (code) => `Puesto ${code}`,
  },

  playerList: {
    nav: "Jugadores",
    count: (total) => entityCount("player", total),
    search: "Buscar jugadores por nombre o UID",
    summary: (total, shown, sorted) => {
      const count = entityCount("player", total);
      if (total <= shown) {
        return count;
      }
      return sorted === null
        ? `${count} · se muestran los ${shown} mejores por habilidad actual`
        : `${count} · se muestran los ${shown} primeros por ${sorted.by}, en orden ` +
            (sorted.ascending ? "ascendente" : "descendente");
    },
    empty: (query, filtered) => {
      if (query === "") {
        return filtered ? "Ningún jugador coincide con estos filtros." : "No se han encontrado jugadores.";
      }
      return filtered
        ? `Ningún jugador coincide con «${query}» con estos filtros.`
        : `Ningún jugador coincide con «${query}».`;
    },
    columns: {
      name: "Nombre",
      age: "Edad",
      positions: "Posiciones",
      nation: "País",
      club: "Club",
      contractExpires: "Contrato",
      born: "Nacimiento",
      currentAbility: "HA",
      potentialAbility: "HP",
      uid: "UID",
    },
    sortBy: (by) => `Ordenar por ${by}`,
    sortNames: {
      currentAbility: "habilidad actual",
      potentialAbility: "habilidad potencial",
      age: "edad",
      name: "nombre",
      nation: "país",
      club: "club",
      contractExpires: "fin de contrato",
    },
    filters: {
      toggle: "Filtros",
      toggleActive: (count) => (count === 1 ? "Filtros, 1 activo" : `Filtros, ${count} activos`),
      clear: "Borrar",
      any: "Cualquiera",
      position: "Posición",
      gender: "Género",
      men: "Masculino",
      women: "Femenino",
      age: "Edad",
      minAge: "Edad mínima",
      maxAge: "Edad máxima",
      minPlaceholder: "Mín.",
      maxPlaceholder: "Máx.",
      minCurrentAbility: "HA mín.",
      minCurrentAbilityTitle: "Habilidad actual mínima",
      minPotentialAbility: "HP mín.",
      minPotentialAbilityTitle: "Habilidad potencial mínima",
      abilityPlaceholder: "1–200",
      nation: "País",
      club: "Club",
      freeAgentsOnly: "Solo agentes libres",
      contractEndsBy: "Contrato hasta",
      transferListedOnly: "Solo transferibles",
      loanListedOnly: "Solo cedibles",
      attributes: {
        heading: "Atributos",
        attribute: "Atributo",
        pick: "Elige un atributo",
        min: (name) => (name ? `${name}: mínimo` : "Mínimo"),
        max: (name) => (name ? `${name}: máximo` : "Máximo"),
        add: "Añadir atributo",
        remove: (name) => (name ? `Quitar ${name}` : "Quitar esta fila"),
      },
      saved: {
        save: "Guardar",
        saveTitle: "Guardar con un nombre los filtros y el orden actuales",
        name: "Nombre del filtro guardado",
        namePlaceholder: "Nombre del filtro",
        ok: "Aceptar",
        cancel: "Cancelar",
        select: "Filtros guardados",
        delete: "Eliminar",
        deleteTitle: (name) => `Eliminar el filtro guardado: ${name}`,
        replaceQuestion: (name) => `Ya hay un filtro guardado llamado «${name}». ¿Reemplazarlo?`,
        replace: "Reemplazar",
        full: (max) =>
          `Se pueden guardar hasta ${max} filtros. Elimina uno antes, o usa el nombre de un filtro guardado para ` +
          "reemplazarlo.",
      },
    },
  },

  staffList: {
    nav: "Personal",
    count: (total) => entityCount("staff", total),
    search: "Buscar personal por nombre o ID",
    summary: (total, shown, sorted) => {
      const count = entityCount("staff", total);
      if (total <= shown) {
        return count;
      }
      return sorted === null
        ? `${count} · se muestran los ${shown} mejores por habilidad actual`
        : `${count} · se muestran los ${shown} primeros por ${sorted.by}, en orden ` +
            (sorted.ascending ? "ascendente" : "descendente");
    },
    empty: (query, filtered) => {
      if (query === "") {
        return filtered ? "Ningún empleado coincide con estos filtros." : "No se ha encontrado personal.";
      }
      return filtered
        ? `Ningún empleado coincide con «${query}» con estos filtros.`
        : `Ningún empleado coincide con «${query}».`;
    },
    columns: {
      name: "Nombre",
      age: "Edad",
      job: "Puesto",
      club: "Club",
      nation: "País",
      born: "Nacimiento",
      currentAbility: "HA",
      potentialAbility: "HP",
      id: "ID",
    },
    sortBy: (by) => `Ordenar por ${by}`,
    sortNames: {
      currentAbility: "habilidad actual",
      potentialAbility: "habilidad potencial",
      age: "edad",
      name: "nombre",
      nation: "país",
      club: "club",
    },
    filters: {
      job: "Puesto",
      anyJob: "Cualquiera",
      unemployedOnly: "Solo sin empleo",
    },
  },

  clubProfile: {
    // Cabecera
    womensClub: "Club femenino",
    founded: (year) => `Fundado en ${year}`,
    reputationShort: "REP",
    reputationTitle: "Reputación",

    tabsLabel: "Secciones del club",
    tabs: { overview: "Resumen", squad: "Plantilla", staff: "Personal", stadium: "Estadio" },
    squadLocked: "Termina de editar para abrir la plantilla",
    staffLocked: "Termina de editar para abrir el personal",

    facilities: "Instalaciones",

    // Afición
    supporters: "Afición",
    supporterMix: "Tipos de aficionados",
    percent: (value) => `${percents.format(value)} %`,
    mixTooltip: (kind, percent) => `${kind} · ${percent}`,

    // Finanzas
    finances: "Finanzas",
    balance: "Saldo",
    transferBudget: "Presupuesto de fichajes",
    wageBudget: "Presupuesto salarial (gasto)",
    totalWageBudget: "Presupuesto salarial total",
    ticketPrice: "Precio medio de la entrada",
    perWeek: "por semana",
    noFinances: "FM solo guarda las finanzas de los clubes de las ligas en juego.",
    freeze: "Congelar el dinero",
    freezeNote: "El saldo no baja mientras la aplicación esté abierta y conectada; los ingresos siguen contando",

    // Estadio
    stadium: "Estadio",
    capacity: "Aforo",
    seating: "Con asientos",
    used: "En uso",
    usedAll: "Todo",
    usedTitle: "La parte del aforo que el juego deja usar cuando la limita; 0 significa todo",
    expansion: "Ampliable hasta",
    noStadium: "No se ha podido leer el estadio de este club.",
    stadiumName: "Nombre",
    rename: "Cambiar nombre",
    renameTitle: "Da al estadio otro nombre; se escribe en el acto",
    renameInfoLabel: "¿Cómo funciona el cambio de nombre?",
    renameInfo:
      "El juego no guarda los nombres de los estadios en las partidas: los toma de su base de datos cada vez que carga " +
      "una. Por eso FMLibreEditor recuerda el nuevo nombre para esta partida y lo vuelve a poner en pocos segundos " +
      "cada vez que el juego la carga, mientras la aplicación esté abierta y conectada. Si el juego carga la partida " +
      "con la aplicación cerrada, muestra su propio nombre hasta que la aplicación vuelva a conectarse. Para volver al " +
      "nombre anterior, deshaz el cambio en Cambios o vuelve a ponérselo al estadio.",
    saveName: "Guardar",
    renaming: "Guardando…",
    cancelRename: "Cancelar",
    nameLength: (bytes, min, max) =>
      min <= 1
        ? `${bytes} de ${max} caracteres como mucho (una letra con tilde cuenta como dos)`
        : `${bytes} caracteres: de ${min} a ${max}, para que quepa donde el juego guarda el nombre (una letra con tilde cuenta como dos)`,
    nameShared: (holders) =>
      `${holders} cosas del juego comparten este nombre, así que no se puede cambiar solo para el estadio`,

    // Datos del club
    info: "Datos del club",
    seasonTickets: "Abonos de temporada",
    socialMedia: "Seguidores en redes sociales",
  },

  clubStaff: {
    loading: "Leyendo el personal…",
    empty: "El juego no guarda personal de este club: los clubes de ligas que no se juegan en esta partida no tienen.",
    count: (total, staying) => {
      const all = entityCount("staff", total);
      return staying === 0 ? all : `${all} · ${staying === 1 ? "1 se queda" : `${format(staying)} se quedan`} si se rescinde al resto`;
    },

    actionsLabel: "Acciones sobre todo el personal",
    releaseAll: (count) => (count === 0 ? "Rescindir a todo el personal" : `Rescindir a todo el personal (${format(count)})`),
    releaseAllTitle: "Rescindir a todo el personal del club, salvo a ti y a la directiva; pregunta antes",
    releaseNone: "No se puede rescindir a nadie del personal de este club",
    hint: "Todos salvo tú y la directiva dejan el club al momento. Deshacer también está en la vista Cambios.",
    released: (count) => (count === 1 ? "1 empleado rescindido" : `${format(count)} empleados rescindidos`),
    refused: (name, reason) => `${name}: ${reason}`,
    undo: "Deshacer",
    undoTitle: "Devolver al club a los empleados rescindidos, con sus contratos",

    tableLabel: "Personal del club",
    staysColumn: "Se queda",
    stays: {
      you: "Tú",
      board: "La directiva",
      player: "También jugador",
      held: "El club lo tiene en otro puesto",
      other: "No se puede rescindir",
    },

    title: "Rescindir a todo el personal",
    from: "Club",
    leaving: (count) => (count === 1 ? "1 deja el club" : `${format(count)} dejan el club`),
    staying: (count) => (count === 1 ? "1 se queda" : `${format(count)} se quedan`),
    more: (count) => `y ${format(count)} más`,
    doesHeading: "Qué hace",
    does: [
      "Cada uno deja el personal del club al momento y su contrato termina: sin empleo, como los empleados sin club del propio juego",
      "Nadie cobra nada",
      "Un puesto de mánager o de director de fútbol queda vacío, para que el club lo cubra",
      "Se quedan: tú, la directiva y quienes el editor no puede rescindir",
      "Aparece en Cambios, donde deshacerla los devuelve a todos con los mismos contratos",
    ],
    dialogHint: "Nada cambia en el juego hasta que pulsas Rescindir a todos.",
    release: "Rescindir a todos",
    releasing: "Rescindiendo…",
    cancel: "Cancelar",

    moveAll: "Traspasar a todo el personal",
    moveAllTitle: "Traspasar a otro club a todo el personal del club, salvo a ti y a la directiva; pregunta antes",
    moveNone: "No se puede traspasar a nadie del personal de este club",
    moved: (count, club) =>
      count === 1 ? `1 empleado traspasado a ${club}` : `${format(count)} empleados traspasados a ${club}`,
    undoMoveTitle: "Devolver a este club al personal traspasado, con sus contratos",
    moveTitle: "Traspasar a todo el personal",
    moveSearch: "Buscar el club al que traspasar al personal",
    movePick: "Elige el club al que se traspasa al personal.",
    movePlanning: "Calculando a quién se puede traspasar…",
    movePlan: (count, club) =>
      count === 1 ? `1 empleado se traspasa a ${club}` : `${format(count)} empleados se traspasan a ${club}`,
    moveNobody: (club) => `Nadie del personal de este club se puede traspasar a ${club}.`,
    moveStays: {
      managerTaken: (club) => `${club} ya tiene mánager`,
      directorTaken: (club) => `${club} ya tiene director de fútbol`,
      yourClub: (club) => `Diriges ${club}`,
      other: "No se puede traspasar",
    },
    moveDoes: [
      "Cada uno se une al nuevo club donde está su puesto: el departamento médico, técnico o de ojeo",
      "Mismo salario y fin de contrato; cada contrato lleva la fecha del día del juego",
      "Un mánager o un director de fútbol solo se une si el puesto del nuevo club está vacío; un puesto que queda aquí " +
        "queda vacío, para que el club lo cubra",
      "Se quedan: tú, la directiva y quienes el editor no puede traspasar",
      "Aparece en Cambios, donde deshacerlo los devuelve a todos a este club",
    ],
    moveHint: "Nada cambia en el juego hasta que pulsas Traspasar a todos.",
    move: "Traspasar a todos",
    moving: "Traspasando…",
  },

  clubList: {
    nav: "Clubes",
    count: (total) => entityCount("club", total),
    search: "Buscar clubes por nombre o UID",
    summary: (total, shown) =>
      total > shown
        ? `${entityCount("club", total)} · se muestran los ${shown} primeros por reputación`
        : entityCount("club", total),
    empty: (query, filtered) => {
      if (query === "") {
        return filtered ? "Ningún club coincide con este filtro." : "No se han encontrado clubes.";
      }
      return filtered
        ? `Ningún club coincide con «${query}» con este filtro.`
        : `Ningún club coincide con «${query}».`;
    },
    women: "Femenino",
    columns: {
      name: "Nombre",
      nation: "País",
      league: "Liga",
      reputation: "Reputación",
      founded: "Fundación",
      uid: "UID",
    },
    filters: {
      kind: "Clubes que mostrar",
      all: "Todos los clubes",
      men: "Clubes masculinos",
      women: "Clubes femeninos",
      nation: "País",
      league: "Liga",
      anyLeague: "Cualquier liga",
      leagueTitle: "La liga en la que juega el primer equipo esta temporada",
      reputation: "Reputación",
      reputationTitle: "De 0 a 10.000, como la guarda el juego",
      minReputation: "Reputación mínima",
      maxReputation: "Reputación máxima",
    },
  },
  /** The Clubs tab's national teams: each nation's men's and women's team, its senior team's squad and reputation. */
  national: {
    /** The button of the Clubs tab's switch that lists them, and the palette's command to go there. */
    nav: "Selecciones",
    switchLabel: "Clubes o selecciones",
    search: "Buscar selecciones por nombre, código o UID",
    summary: (total, shown) =>
      total > shown ? `Selecciones: ${format(total)} · se muestran las ${shown} primeras por reputación` : `Selecciones: ${format(total)}`,
    /** The message under an empty table; `filtered` is whether a filter is in effect. */
    empty: (query, filtered) => {
      if (query === "") {
        return filtered ? "Ninguna selección coincide con este filtro." : "No se han encontrado selecciones.";
      }
      return filtered ? `Ninguna selección coincide con «${query}» con este filtro.` : `Ninguna selección coincide con «${query}».`;
    },
    /** The small tag on a women's team. */
    women: "Femenino",
    columns: {
      name: "País",
      code: "Código",
      reputation: "Reputación",
      players: "Jugadores",
      uid: "UID",
    },
    filters: {
      /** The label of the select of which teams to show. */
      kind: "Selecciones que mostrar",
      all: "Todas las selecciones",
      men: "Selecciones masculinas",
      women: "Selecciones femeninas",
    },
    /** In the header of a profile, by the name. */
    womensTeam: "Selección femenina",
    mensTeam: "Selección masculina",
    reputationShort: "REP",
    reputationTitle: "Reputación del primer equipo, de 0 a 10.000",
    teamKinds: { 0: "Primer equipo", 9: "Sub-23", 10: "Sub-21", 18: "Sub-20", 11: "Sub-19", 12: "Sub-18" },
    teamType: (kind) => `Tipo ${kind}`,
    teamsLabel: "Equipos de esta selección",
    teamReputation: (team) => `Reputación (${team})`,
    teamReputationTitle: "Reputación de este equipo, de 0 a 10.000",
    squadHeading: (team, count) => `${team}: ${format(count)} ${count === 1 ? "jugador" : "jugadores"}`,
    squadLabel: (team) => `Jugadores de la selección: ${team}`,
    squadNote: "Los jugadores que el juego enumera para este equipo, en su orden. Aquí no se editan las convocatorias, los capitanes ni el contrato del seleccionador.",
    details: {
      nation: "País",
      founded: "Federación fundada en",
      continent: "Continente",
      staff: (count) => `Personal de la federación (${format(count)})`,
      noStaff: "No se encontró personal de la federación.",
      job: "Puesto en la selección",
      team: "Equipo",
      staffNote: "Leído del juego; aquí no se edita. El puesto es el de cada uno en la selección, no el de un club.",
    },
    actionsHint: "Las acciones afectan a todos los jugadores que enumera el primer equipo. Deshacer también está en la vista Cambios.",
    noTeams: "El juego no tiene equipos para esta selección, así que no hay plantilla ni reputación que mostrar.",
    reading: "Leyendo la plantilla…",
    noPlayers: "El juego no enumera jugadores para este equipo.",
    /** Where the tab cannot show national teams: why, for a version of the game the editor has not been checked with. */
    unavailableTitle: "Las selecciones no están disponibles en esta versión del juego",
    unavailableBuild: "Todavía nadie ha encontrado dónde guarda esta versión del juego sus selecciones, así que el editor no muestra ninguna en lugar de leer la memoria equivocada.",
    unavailableUnreadable: "El editor ha mirado donde espera las selecciones en esta versión del juego, pero lo que ha encontrado no parece del juego, así que no muestra ninguna.",
  },

  leaguePrizes: {
    title: "Premios de la liga",
    league: (league) => `Lo que paga ${league} esta temporada`,
    reading: "Leyendo del juego los premios de la liga… La primera vez puede tardar medio minuto o más.",
    readAgain: "Leer de nuevo",
    readAgainTitle: "Volver a leer los importes del juego: una fase empezada desde entonces puede pagar también",
    paysNothing: "La liga del club no paga premios por posición final ni por partido esta temporada.",
    stageStarted: "Fase en juego",
    stageFuture: "Fase aún no empezada",
    alike: (count) => `Los mismos importes en ${format(count)} grupos o fases`,
    byPosition: "Por posición final",
    place: (place) => `${format(place)}.º`,
    perMatch: "Por partido",
    win: "Por victoria",
    draw: "Por empate",
    loss: "Por derrota",
    noList: "Nada por posición final.",
    noPerMatch: "Nada por partido.",
    note: "Lo que pagan las rondas eliminatorias, como el ganador y el perdedor de una final, y la prima de participación aún no se leen.",
    unavailableBuild: "Nadie ha comprobado aún dónde guarda los premios esta versión del juego, así que el editor no muestra ninguno en lugar de leer la memoria equivocada.",
    unavailableUnreadable: "El editor buscó los premios donde los espera en esta versión del juego, pero lo que encontró no se lee como los del juego, así que no muestra ninguno.",
    edit: "Cambiar importes",
    editTitle: "Cambiar lo que paga esta fase de la liga, a todos sus clubes",
    save: "Guardar importes",
    saving: "Guardando…",
    cancel: "Cancelar",
    everyClub: (league) =>
      `Esto cambia lo que ${league} paga a todos sus clubes, no solo a este. El juego lo guarda en la partida, pero solo esta temporada: la siguiente la prepara otra vez con sus propios importes. Deshacer en Cambios devuelve los importes de antes.`,
    infoLabel: "Cuánto dura un cambio de los premios",
    invalid: (most) => `Escribe un importe entero de 0 a ${most}.`,
    allNothing: "Una fase que no paga nada deja de aparecer: deja al menos un importe por encima de cero.",
    placeField: (place) => `Premio de la liga por el ${format(place)}.º puesto`,
    changedIn: (league, groups) =>
      groups > 1 ? `Para todos los clubes de ${league}, en ${format(groups)} grupos` : `Para todos los clubes de ${league}`,
  },

  sponsorships: {
    title: "Patrocinios",
    reading: "Leyendo los patrocinios del club…",
    none: "El club no tiene patrocinios.",
    perSeason: "Por temporada",
    total: "Valor total",
    term: "Duración",
    years: (count) => (count === 1 ? "1 año" : `${format(count)} años`),
    unnamed: (kind) => `Tipo ${format(kind)}`,
    unnamedTitle: "Este tipo de acuerdo aún no se ha asociado con un nombre de la pantalla del juego",
    ended: "Terminado",
    endedTitle: "Terminó antes de la fecha del juego: la pantalla de patrocinios del juego ya no lo muestra",
    falls: (percent) => `Baja un ${format(percent)} % si el club desciende`,
    rises: (percent) => `Sube un ${format(percent)} % si el club asciende a la máxima categoría`,
    note: "Solo lectura. Son los importes que el juego guarda para cada acuerdo. Su pantalla de patrocinios muestra los acuerdos que no han terminado.",
    unavailableBuild: "Nadie ha comprobado todavía dónde guarda esta versión del juego los patrocinios, así que el editor no los muestra en lugar de leer la memoria equivocada.",
    unavailableUnreadable: "El editor buscó los patrocinios donde los espera en esta versión del juego, pero lo que encontró no parece del juego, así que no los muestra.",
  },

  competitions: {
    nav: "Competiciones",
    search: "Buscar competiciones por nombre, país o UID",
    summary: (total, shown) =>
      total > shown ? `${format(shown)} de ${format(total)} competiciones` : `${format(total)} competiciones`,
    empty: (query, filtered) => {
      if (query === "") {
        return filtered ? "Ninguna competición de este país tiene reglas de plantilla." : "No se han encontrado competiciones con reglas de plantilla.";
      }
      return filtered ? `Ninguna competición de este país coincide con «${query}».` : `Ninguna competición coincide con «${query}».`;
    },
    reading: "Leyendo las reglas de plantilla de las competiciones desde el juego… Tardará unos segundos.",
    readAgain: "Leer de nuevo",
    readAgainTitle: "Volver a leer las reglas del juego",
    listNote: "Solo se muestran las competiciones que el juego disputa en esta partida.",
    unavailableTitle: "No hay reglas de plantilla que mostrar",
    unavailableBuild: "Nadie ha comprobado todavía dónde guarda esta versión del juego las reglas de plantilla de las competiciones, así que el editor no muestra ninguna en lugar de leer la memoria equivocada.",
    unavailableUnreadable: "El editor buscó las reglas de plantilla donde las espera en esta versión del juego, pero lo que encontró no parece del juego, así que no muestra ninguna.",
    columns: {
      name: "Competición",
      nation: "País",
      level: "Nivel",
      rules: "Reglas",
      uid: "UID",
    },
    level: (level) => format(level),
    rulesCount: (current, next) =>
      next === null || next === current ? format(current) : `${format(current)} · ${format(next)}`,
    rulesCountTitle: "Reglas de plantilla esta temporada y, si tiene otro número, la próxima",
    international: "Internacional",
    filters: {
      nation: "País",
      allNations: "Todos los países",
    },
    title: "Reglas de plantilla",
    intro: "Cuántos jugadores de cada tipo puede inscribir una plantilla, o alinear un equipo en un partido, en esta competición. Qué cuenta como extranjero o formado en casa lo decide el propio juego.",
    seasons: { current: "Esta temporada", next: "Próxima temporada" },
    began: (year) => `empezó en ${year}`,
    begins: (year) => `empieza en ${year}`,
    noRules: "Sin reglas de plantilla.",
    noNext: "El juego no tiene reglas para la próxima temporada.",
    noneGiven: "El juego no da a esta competición ninguna regla de plantilla, así que aquí no hay nada que cambiar.",
    ruleColumns: {
      rule: "Regla",
      where: "Se cuenta en",
      limit: "Límite",
      value: "Jugadores",
    },
    atMost: "Como máximo",
    atLeast: "Como mínimo",
    scopes: {
      squad: "Plantilla",
      matchSquad: "Convocatoria",
      eleven: "Once",
      startingEleven: "Once inicial",
      bench: "Banquillo",
    },
    who: {
      squadSize: "Jugadores en la plantilla",
      foreign: "Jugadores extranjeros",
      foreignExceptAsian: "Jugadores extranjeros, salvo asiáticos",
      foreignGoalkeepers: "Porteros extranjeros",
      nonEu: "Jugadores no comunitarios",
      domestic: "Jugadores nacionales",
      domesticGoalkeepers: "Porteros nacionales",
      goalkeepers: "Porteros",
      outfield: "Jugadores de campo",
      nonHomegrown: "Jugadores no formados en casa",
      youthContract: "Jugadores con contrato juvenil",
      fullTime: "Jugadores con contrato a tiempo completo",
      amateur: "Jugadores aficionados",
      youthOrAmateur: "Jugadores juveniles o aficionados",
      trialists: "Jugadores a prueba",
      loans: "Jugadores cedidos",
      internationals: "Jugadores internacionales",
      otherTeam: "Jugadores inscritos en otro equipo",
      firstTeam: "Jugadores inscritos en el primer equipo",
      over: (age) => `Jugadores de más de ${format(age)} años`,
      under: (age) => `Jugadores de menos de ${format(age)} años`,
      domesticUnder: (age) => `Jugadores nacionales de menos de ${format(age)} años`,
      foreignOver: (age) => `Jugadores extranjeros de más de ${format(age)} años`,
      goalkeepersOver: (age) => `Porteros de más de ${format(age)} años`,
      outfieldOver: (age) => `Jugadores de campo de más de ${format(age)} años`,
      homegrown: (from, fromAge, toAge) => {
        const ages = `formados entre los ${format(fromAge)} y los ${format(toAge)} años`;
        if (from === "club") {
          return `Formados en el club (${ages})`;
        }
        return from === "nation" ? `Formados en el país (${ages})` : `Formados en el club o en el país (${ages})`;
      },
      homegrownUnder: (age, fromAge, toAge) =>
        `Menores de ${format(age)} años formados en el país (formados entre los ${format(fromAge)} y los ${format(toAge)} años)`,
    },
    unnamedKind: (kind) => `Regla de tipo ${format(kind)}`,
    gameKey: (key) => `Nombre de esta regla en el juego: ${key}`,
    teamsFrom: (competition) => `Equipos de ${competition}`,
    teamsFromUnknown: "Equipos de otra división",
    condition: (code) => `Condicional (${code})`,
    conditionTitle: "El juego aplica esta regla bajo una condición propia que el editor aún no explica.",
    years: (from, to) => {
      if (from !== null && to !== null) {
        return from === to ? `${from}` : `${from}–${to}`;
      }
      return from !== null ? `desde ${from}` : `hasta ${to}`;
    },
    yearsTitle: "Las temporadas para las que las reglas del país dan esta regla, según el año en que empieza cada temporada",
    leftAlone: "Se deja como está",
    notSavedTitle:
      "La partida no guarda esa regla, así que un cambio desaparecería al cargarla: el editor la deja como está",
    notACountTitle: "Es una cantidad de dinero, no un número de jugadores: el editor la deja como está.",
    noneChangeable: "Estas reglas aún no se pueden cambiar, en ninguna fecha: el editor solo cambia una regla si la encuentra también en las reglas que guarda la partida, para que el cambio siga ahí al cargarla, y no ha encontrado ahí las de esta competición. Por ahora ocurre con las ligas femeninas, la Major League Soccer y algunas copas.",
    unsavedNote: "El juego no guarda las reglas de esta competición en ninguna partida: las crea él mismo cada vez que carga una, y de nuevo en cada temporada. Por eso el editor mantiene un cambio aquí: lo escribe en el juego en marcha, lo recuerda para esta carrera y lo vuelve a escribir cada vez que se conecta o vuelve a leer los datos. Después de cargar una partida, conecta el editor (o pulsa Recargar datos) una vez para que el cambio vuelva. Deshacer en Cambios lo suelta.",
    heldTag: "Mantenida",
    heldTitle: (original) =>
      `El editor mantiene este número y lo reescribe cada vez que lee el juego; el del juego es ${format(original)}`,
    savedDiffers: (value) => `Las reglas de la partida tienen ${format(value)}`,
    savedDiffersTitle:
      "El juego se rige por la lista y la crea con las reglas de la partida al cargarla; un cambio aquí fija ambas",
    edit: "Cambiar reglas",
    editTitle: "Cambiar los números de las reglas de plantilla de esta competición",
    save: "Guardar reglas",
    saving: "Guardando…",
    cancel: "Cancelar",
    invalid: (most) => `Introduce un número entero de 0 a ${format(most)}.`,
    shared: (names) => `Estas reglas son también las de ${names}: un cambio vale para ellas también.`,
    currentNote: (turn) =>
      `Un cambio aquí vale para el resto de esta temporada${turn === null ? "" : `, que cambia el ${turn}`}. El juego cuenta las plantillas con él al instante; sus propias pantallas lo muestran cuando pasa un día.`,
    nextNote: (turn) =>
      `Un cambio aquí pasa a ser la regla de esta temporada cuando cambia la temporada${turn === null ? "" : ` (el ${turn})`}, y se mantiene en las siguientes salvo que el juego tenga reglas propias para una temporada posterior. La página Próxima temporada del juego lo muestra al instante.`,
    lasts: "Un cambio se escribe en la lista por la que se rige el juego y en las reglas del país que guarda la partida, así que sigue ahí al cargar la partida. Un cambio en una regla de esta temporada termina al cambiar de temporada: las reglas de la próxima ocupan su lugar. Deshacer en Cambios devuelve el número anterior.",
    infoLabel: "Cuánto dura un cambio de una regla de plantilla",
    ruleField: (season, rule) => `Regla de plantilla, ${season.toLowerCase()}: ${rule}`,
    alsoFor: (count) =>
      count === 1 ? "También para 1 competición más con las mismas reglas" : `También para ${format(count)} competiciones más con las mismas reglas`,
  },
  app: {
    stage: "beta",
    settingsLabel: "Ajustes",
    languageLabel: "Idioma",
    currencyLabel: "Moneda",

    noteEditable:
      "Los cambios solo llegan al juego cuando los aplicas. Haz antes una copia de seguridad de tu partida.",
    noteReadOnly: "Solo lectura: Windows no ha permitido a FMLibreEditor escribir en el juego.",
    noteUnknownBuild: "Solo lectura: esta versión del juego es nueva para FMLibreEditor.",
    noteNotConnected: "Nada cambia en el juego hasta que editas y aplicas.",

    notConnected: "Sin conexión",
    previewTag: "vista previa en el navegador · datos de ejemplo",
    noDate: "Sin fecha del juego",
    noDateTitle:
      "No se pudo leer la fecha del juego: sin edades, y los filtros de edad no encuentran a nadie. Busca actualizaciones.",
    reload: "Recargar datos",
    refresh: "Actualizar",
    detecting: "Buscando Football Manager…",
    connecting: "Leyendo jugadores, personal y clubes…",
    reloading: "Recargando jugadores, personal y clubes…",

    saveChanged: {
      title: "La partida del juego ha cambiado",
      text:
        "El juego ha cargado una partida, o ha vuelto a su menú principal, desde que FMLibreEditor lo leyó. Hasta que " +
        "se recarguen los datos, no cambia nada en el juego ni mantiene nada congelado: lo que muestra puede ser de " +
        "otra partida.",
    },

    refrozen: {
      title: "Congelado de nuevo desde la última vez",
      waitingTitle: "Lo congelado espera por ahora",
      players: (names) => `Atributos: ${names}`,
      staff: (names) => `Atributos del personal: ${names}`,
      clubs: (names) => `Dinero: ${names}`,
      fitness: (names) => `Energía y ritmo: ${names}`,
      positions: (names) => `Posiciones: ${names}`,
      stadiums: (names) => `Nombres de estadio: ${names}`,
      more: (count) => `y ${format(count)} más`,
      waiting: (count) =>
        `${count === 1 ? "1 sigue recordado" : `${format(count)} siguen recordados`}, pero no se congelan ahora: ` +
        "FMLibreEditor aún no puede escribir en esta versión del juego.",
      dismiss: "Cerrar",
    },

    freezeInfo: {
      label: "¿Cómo funciona congelar?",
      note:
        "Congelar no cambia el juego para siempre: cada 2 segundos, FMLibreEditor devuelve lo que el juego quitó. Por " +
        "eso solo funciona mientras la aplicación está abierta y conectada; si la cierras, el juego vuelve a cambiarlos. " +
        "La aplicación recuerda lo congelado en esta partida y lo vuelve a congelar la próxima vez que se conecte a ella.",
    },

    connect: {
      title: "Conectar con Football Manager 27",
      intro:
        "FMLibreEditor lee la memoria del juego mientras se ejecuta. Inicia el juego y carga una partida; después, " +
        "conecta.",
      notRunning: "Football Manager 27 no se está ejecutando.",
      openFailed: (error) => `No se ha podido abrir el juego: ${error}`,
      game: "Juego",
      gameData: "Datos del juego",
      loaded: "Cargados",
      stillLoading: "Aún cargando; espera al menú principal",
      process: "Proceso",
      pid: (pid) => `pid ${pid}`,
      several: "Hay varias copias del juego en ejecución; se usa la primera.",
      button: "Conectar y leer jugadores, personal y clubes",

      bridge: {
        title: "El puente (macOS)",
        intro:
          "macOS no deja que ninguna aplicación entre en la memoria de otra, así que es FM27 quien tiene que " +
          "entregar la suya. Lo hace en cuanto carga el puente de FMLibreEditor: una pequeña biblioteca que no " +
          "intercepta ni cambia nada en el juego y solo le da su memoria a esta aplicación. Una opción de " +
          "lanzamiento en Steam hace que FM27 la cargue.",
        library: "Puente",
        installed: "Instalado",
        missing: "No instalado",
        launchOption: "Opción de lanzamiento",
        set: "Configurada en Steam",
        notSet: "Sin configurar",
        ready:
          "Listo. Inicia FM27 desde Steam (ciérralo y vuelve a iniciarlo si está abierto), carga una partida y " +
          "conecta.",
        steamRunning:
          "Steam está abierto y, mientras lo está, conserva las opciones de lanzamiento. Cierra Steam para que la " +
          "opción de lanzamiento se configure por ti, o introdúcela tú en Steam.",
        setUp: "Instalar el puente",
        remove: "Quitar el puente",
        manual:
          "O, en Steam, haz clic derecho en Football Manager 27 › Propiedades › General › Opciones de lanzamiento, " +
          "e introduce:",
        copy: "Copiar",
        copied: "Copiado",
      },
    },
  },

  graphics: {
    reading: "Leyendo los paquetes gráficos…",
    summary: ({ clubLogos, flags, faces }) =>
      `Gráficos: ${format(clubLogos)} ${clubLogos === 1 ? "escudo" : "escudos"} · ` +
      `${format(flags)} ${flags === 1 ? "bandera" : "banderas"} · ${format(faces)} ${faces === 1 ? "cara" : "caras"}`,
    none: "No se han encontrado paquetes gráficos",
    noneHint: "Los paquetes de escudos y caras van en la carpeta de gráficos de FM27.",
  },

  compatibility: {
    unknownBuild: (game) => `FMLibreEditor aún no se ha probado con ${game}`,
    unknownBuildText:
      "Probablemente el juego se ha actualizado. FMLibreEditor ha encontrado los datos del juego y los ha comprobado, " +
      "pero no escribe en una versión con la que no se ha probado hasta que tú lo permitas. Una nueva versión de " +
      "FMLibreEditor que la conozca suele salir en pocos días.",
    failedTitle: "Algunos datos del juego no han superado las comprobaciones",
    reloadHint: "Si una partida aún se estaba cargando, «Recargar datos» vuelve a comprobarlo.",
    noDate: "La fecha del juego no ha superado las comprobaciones, así que no se muestran las edades.",
    failed: (names) => `Quedan en solo lectura: ${names}.`,
    failedCheck: (name, fit, sampled) => `${name} (${format(fit)} de ${format(sampled)} encajan)`,
    join: (names) =>
      names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`,
    allow: "Editar de todos modos",
    allowTitle:
      "Activa la edición hasta que la aplicación se cierre o se vuelva a conectar. Haz antes una copia de tu partida.",
  },

  diagnostics: {
    copy: "Copiar diagnóstico",
    copyTitle:
      "Copia lo que la aplicación ha encontrado en el juego, para un informe de error; no contiene nombres ni rutas",
    copied: "Copiado",
    failed: (reason) => `No se ha podido copiar el diagnóstico: ${reason}`,
  },

  checks: {
    gameDate: "la fecha del juego",
    players: "los datos de los jugadores",
    positions: "las posiciones",
    attributes: "los atributos",
    personality: "la personalidad",
    liveValues: "la energía, el ritmo de competición, el cansancio y la moral",
    contracts: "los contratos",
    teams: "los equipos",
    staff: "el personal",
    clubs: "los clubes",
    cohesion: "la cohesión con los clubes",
    tactics: "la familiaridad táctica",
  },

  update: {
    available: (version) => `FMLibreEditor ${version} ya está disponible`,
    youHave: (version) => `Tienes la versión ${version}.`,
    download: "Descargar",
    install: "Actualizar",
    installTitle: "Descargar e instalar la nueva versión; la aplicación se cierra y vuelve a abrirse con ella",
    preparing: "Preparando…",
    downloading: (percent) => (percent === null ? "Descargando…" : `Descargando… ${percent} %`),
    installing: "Instalando: FMLibreEditor se cerrará y volverá a abrirse con la nueva versión.",
    installFailed: (reason) => `No se ha podido actualizar: ${reason}. Descárgala desde su página.`,
    notInstallable: "Esta versión no se puede instalar desde aquí. Descárgala desde su página.",
    later: "Más tarde",
    check: "Buscar actualizaciones",
    checking: "Buscando actualizaciones…",
    upToDate: "Tienes la última versión.",
    failed: "No se ha podido comprobar si hay actualizaciones.",
  },

  star: {
    title: "¿Te gusta FMLibreEditor?",
    text: "Una estrella en GitHub le ayuda a llegar a más jugadores y a crecer más rápido.",
    star: "Dar una estrella en GitHub",
    dismiss: "No, gracias",
  },

  edit: {
    unknownNation: "País desconocido",
    unknownCity: "Ciudad desconocida",
    edit: "Editar",
    editTitle: "Cambiar los valores de este perfil en el juego",
    startFailed: (reason) => `No se ha podido empezar a editar: ${reason}`,
    positionRating: (position) => `Valoración de ${position}`,
    was: (value) => `antes: ${value}`,
    invalid: (min, max) => `Introduce un número entero de ${min} a ${max}`,
    invalidDate: (from, to) => `Introduce una fecha del ${from} al ${to}`,
    invalidMoney: (from, to) => `Introduce un importe entero de ${from} a ${to}`,
    invalidPercentage: (from, to) => `Introduce un porcentaje entero de ${from} a ${to}`,
    percent: "%",
    yes: "Sí",
    no: "No",
    none: "ninguno",

    // El pie
    footer: "Editando",
    changes: changeCount,
    invalidCount: (count) => (count === 1 ? "1 no válido" : `${count} no válidos`),
    review: "Revisar",
    reviewList: "Cambios por aplicar",
    discard: "Descartar",
    apply: "Aplicar",
    applying: "Aplicando…",
    applyBlocked: "Corrige antes los valores no válidos",
    done: "Hecho",
    confirmDiscard: (count) => `¿Descartar ${changes(count)}?`,
    keepEditing: "Seguir editando",

    // Tras aplicar
    applied: (count) =>
      count === 0
        ? "No se ha aplicado ningún cambio"
        : count === 1
          ? "1 cambio aplicado"
          : `${format(count)} cambios aplicados`,
    nothingToChange: "Nada que cambiar: el juego ya tiene estos valores.",
    refused: (label, reason) => `${label}: ${reason}`,
    rereadFailed: (reason) => `No se han podido volver a leer los valores: ${reason}`,
    dismiss: "Cerrar",
  },

  changes: {
    nav: "Cambios",
    title: "Cambios",
    hint:
      "Los más recientes primero. La aplicación guarda los cambios de cada carrera, así que se vuelven a mostrar tras reiniciarla. Un cambio solo se puede deshacer mientras el juego conserve el valor que escribió.",
    /** Under the hint, when the list holds changes from earlier sessions: how many, and how many of them the game did not hold. */
    earlierNote: (count, missing) =>
      `${changeCount(count)} de sesiones anteriores` + (missing > 0 ? `, ${format(missing)} de ellos no estaban en el juego cuando se leyeron los datos` : "") + ". Los traspasos, curaciones, vínculos, cláusulas y nombres entre ellos se conservan como historial, sin Deshacer.",
    /** The small tag after the name of an earlier change, and its hover text. */
    earlierTag: "Anterior",
    earlierTitle: "Escrito antes de la última conexión de la aplicación y guardado en el historial de esta carrera",
    /** Under the status of an earlier change: whether the game held its value when the data was last read. */
    inGame: "En el juego",
    inGameTitle: "El juego tenía este valor cuando se leyeron los datos por última vez",
    notInGame: "No está en el juego",
    notInGameTitle:
      "No estaba en el juego en la última lectura: no se guardó tras el cambio, o el juego lo ha cambiado después",
    /** In the place of Undo for an earlier change that cannot be undone from here, and its hover text. */
    historyOnly: "Historial",
    historyOnlyTitle: "Hecho antes de la última conexión de la aplicación: deshacerlo requería la memoria del juego tal como estaba entonces",
    /** Under a mass edit: how many of its earlier changes the game did not hold. */
    batchNotInGame: (count) => `${format(count)} no están en el juego`,
    /** Empties the list and the history of the career; the question that asks first, and its two answers. */
    clearHistory: "Borrar historial",
    clearHistoryTitle: "Vacía esta lista y olvida el historial de esta carrera; los cambios siguen en el juego",
    confirmClear: "¿Borrar el historial de esta carrera? Los cambios siguen en el juego, pero ya no se podrán deshacer desde aquí.",
    keepHistory: "Conservar",
    clearConfirm: "Borrar",
    continueHint: "El juego muestra un cambio cuando avanza: pulsa Continuar en el juego.",
    swappedWith: (name) => `Intercambiado por ${name}`,
    released: (name) => `Contrato rescindido: ${name}`,
    fee: (amount) => `Traspaso: ${amount}`,
    arranged: (date) => `El juego hace el movimiento el ${date}`,
    arrangedLoan: (day, until) => `El juego hace la cesión el ${day}, hasta el ${until}`,
    optionRemoved: (amount) => `Opción de compra (${amount}) eliminada`,
    healed: (count) => (count === 1 ? "1 lesión curada" : `${format(count)} lesiones curadas`),
    lifted: (count) => (count === 1 ? "1 sanción levantada" : `${format(count)} sanciones levantadas`),
    keptPlaying: (date) => (date === null ? "Seguirá jugando" : `Retirada del ${date} evitada`),
    count: (total, undone) => {
      const count = changeCount(total);
      if (undone === 0) {
        return count;
      }
      return `${count} · ${undone === 1 ? "1 deshecho" : `${format(undone)} deshechos`}`;
    },
    empty:
      "Aún no hay cambios. Abre un jugador, un miembro del personal o un club y elige Editar, o usa Edición " +
      "masiva en una lista.",
    columns: {
      time: "Hora",
      name: "Nombre",
      field: "Campo",
      change: "Cambio",
      status: "Estado",
    },
    kinds: { player: "Jugador", staff: "Personal", club: "Club", nationalTeam: "Selección", competition: "Competición" },
    stored: (change) => `valor interno ${change}`,
    undone: (time) => `Deshecho a las ${time}`,
    undo: "Deshacer",
    undoTitle: (label) => `Volver a escribir en el juego el valor anterior de ${label}`,
    batch: "Edición masiva",
    batchCount: (total, remaining) =>
      remaining === 0 ? `${changes(total)} · todos deshechos` : `${changes(total)} · ${format(remaining)} sin deshacer`,
    showChanges: "Mostrar cambios",
    hideChanges: "Ocultar cambios",
    undoBatch: "Deshacer edición masiva",
    undoBatchTitle: (remaining) =>
      "Volver a escribir en el juego los valores anteriores de esta edición masiva " +
      (remaining === 1 ? "(1 aún vigente)" : `(${format(remaining)} aún vigentes)`),

    // Páginas
    pages: "Páginas de la lista",
    batchPages: "Páginas de los cambios de esta edición masiva",
    previous: "Anterior",
    next: "Siguiente",
    range: (first, last, total) => `${format(first)}–${format(last)} de ${format(total)}`,

    // Search and filters
    /** The search box: what it looks through. Its name for assistive technology is the same. */
    searchPlaceholder: "Buscar cambios por nombre, UID, campo o club",
    /** The name of the three buttons that choose which sessions' changes are listed, for assistive technology. */
    sessionGroup: "Sesión",
    sessions: { all: "Todos", this: "Esta sesión", earlier: "Sesiones anteriores" },
    /** The check boxes: only changes still in place, and only earlier ones the game did not hold; their hover text. */
    notUndone: "No deshechos",
    notUndoneTitle: "Solo los cambios que siguen en vigor",
    notInGameFilterTitle: "Solo los cambios anteriores que el juego no tenía cuando se leyeron los datos por última vez",
    /** Takes the search text and every choice away. */
    clearFilter: "Quitar filtro",
    /** The line beside the title while a search or a filter is on: `matching` of the `total` changes, `undone` of those undone. */
    filteredCount: (matching, total, undone) => {
      const count = `${format(matching)} de ${changeCount(total)}`;
      return undone === 0 ? count : `${count} · ${undone === 1 ? "1 deshecho" : `${format(undone)} deshechos`}`;
    },
    /** Under a mass edit while a search or a filter is on: how many of its changes they leave. */
    batchMatching: (matching, total) => `${format(matching)} de ${format(total)} ${matching === 1 ? "coincide" : "coinciden"}`,
    /** In the place of the list when the search and the filters leave no change. */
    noMatches: "Ningún cambio coincide con la búsqueda y los filtros.",
  },

  export: {
    button: "Exportar",
    buttonTitle: {
      player: "Escribir los jugadores que muestra la lista en un archivo CSV o JSON",
      staff: "Escribir el personal que muestra la lista en un archivo CSV o JSON",
      club: "Escribir los clubes que muestra la lista en un archivo CSV o JSON",
    },
    title: { player: "Exportar jugadores", staff: "Exportar personal", club: "Exportar clubes" },
    scope: (entity, count) =>
      count === 0
        ? `Ningún ${nouns[entity].one} coincide con la búsqueda y los filtros.`
        : `${entityCount(entity, count)}: lo que seleccionan la búsqueda y los filtros de la lista, en su orden.`,
    formatLabel: "Formato",
    formats: {
      csv: "CSV, separado por comas",
      csvSemicolon: "CSV, separado por punto y coma",
      json: "JSON",
    },
    formatHints: {
      csv: "Para la mayoría de hojas de cálculo y scripts",
      csvSemicolon: "Para Excel donde los decimales se escriben con coma: en español, turco o alemán, por ejemplo",
      json: {
        player: "Para scripts: las posiciones, los atributos y la personalidad como objetos propios",
        staff: "Para scripts: los atributos, la personalidad y el contrato como objetos propios",
        club: "Para scripts: la afición, las instalaciones, el estadio y las finanzas como objetos propios",
      },
    },
    contents: {
      player:
        "De cada jugador: habilidades, posiciones y valoraciones por posición, atributos en la escala de 1 a 20 " +
        "(también los ocultos), personalidad, reputación, partidos internacionales, y contrato con sus cláusulas, " +
        "con la fecha del juego. El dinero va en libras, como lo guarda el juego. No cambia nada en el juego.",
      staff:
        "De cada empleado: puesto y club, habilidades, atributos en la escala de 1 a 20, personalidad, reputación, y " +
        "contrato (salario y fechas), con la fecha del juego. El dinero va en libras, como lo guarda el juego. No cambia " +
        "nada en el juego.",
      club:
        "De cada club: país, liga, reputación, año de fundación, abonados, seguidores en redes sociales, composición y rasgos de " +
        "la afición, instalaciones, estadio y finanzas (saldo, presupuesto de fichajes, gasto y presupuesto salarial " +
        "por semana y precio de la entrada), con la fecha del juego. FM guarda las finanzas solo de los clubes de " +
        "las ligas en juego. El dinero va en libras, como lo guarda el juego. No cambia nada en el juego.",
    },
    export: "Exportar",
    exporting: "Exportando…",
    done: (entity, count, file) =>
      `${entityCount(entity, count)} ${count === 1 ? "exportado" : "exportados"} a ${file}`,
    folder: (folder) => `en ${folder}`,
    skipped: (entity, count) =>
      count === 1
        ? `${entityCount(entity, count)} cambió en el juego mientras se leía, y se dejó fuera.`
        : `${entityCount(entity, count)} cambiaron en el juego mientras se leían, y se dejaron fuera.`,
    open: "Abrir",
    openTitle: "Abrir el archivo con la aplicación que tu sistema usa para él",
    show: "Mostrar en la carpeta",
    showTitle: "Mostrar el archivo en su carpeta",
    close: "Cerrar",

    /** The export of the Changes view: a CSV file of the changes its search and filters show. */
    changes: {
      buttonTitle: "Escribir los cambios que muestra la lista en un archivo CSV",
      title: "Exportar cambios",
      /** What the export covers: everything the list's search and filters select, or, with none on, the whole history. */
      scope: (count, filtering) =>
        count === 0
          ? "Ningún cambio coincide con la búsqueda y los filtros."
          : filtering
            ? `${changeCount(count)}: lo que seleccionan la búsqueda y los filtros, del más reciente al más antiguo.`
            : `${changeCount(count)}: todo el historial de esta carrera, del más reciente al más antiguo.`,
      contents:
        "De cada cambio: la hora (local, con su desfase respecto a UTC), el nombre y el UID, el campo, su valor " +
        "anterior y el nuevo tal como los guarda el juego y tal como se muestran aquí, las notas que la lista pone " +
        "debajo, la edición masiva de la que formaba parte, cuándo se deshizo y si es de una sesión anterior y " +
        "está en el juego. No cambia nada en el juego.",
      done: (count, file) => `${changeCount(count)} ${count === 1 ? "exportado" : "exportados"} a ${file}`,
    },
  },

  massEdit: {
    button: "Edición masiva",
    buttonTitle: "Cambiar valores de todo lo que muestra la lista, con una vista previa antes",
    title: {
      player: "Edición masiva de jugadores",
      staff: "Edición masiva de personal",
      club: "Edición masiva de clubes",
    },

    // A qué se aplica
    scope: (entity, total) =>
      total === 1
        ? `El ${nouns[entity].one} que muestra ahora la lista (búsqueda y filtros)`
        : `Los ${entityCount(entity, total)} que muestra ahora la lista (búsqueda y filtros)`,
    scopeAll: (shown) => `Son todas las coincidencias, no solo las ${format(shown)} primeras filas en pantalla.`,
    scopeNone: (entity) =>
      `Ningún ${nouns[entity].one} coincide con la búsqueda y los filtros, así que no hay nada que cambiar.`,
    scopeTooMany: (entity, total, limit) =>
      `Los ${entityCount(entity, total)} que muestra la lista son más de los que admite una edición masiva ` +
      `(${format(limit)}). Acota antes la búsqueda o los filtros.`,
    loadingFields: "Leyendo los campos…",
    fieldsFailed: (reason) => `No se han podido leer los campos: ${reason}`,

    // Los campos que cambiar
    groups: {
      ability: "Habilidad",
      technical: "Atributos técnicos",
      mental: "Atributos mentales",
      physical: "Atributos físicos",
      goalkeeping: "Atributos de portero",
      hidden: "Atributos ocultos",
      feet: "Pies",
      coaching: "Atributos de entrenamiento",
      knowledge: "Atributos de conocimiento",
      medical: "Atributos médicos",
      positions: "Posiciones",
      personality: "Personalidad",
      reputation: "Reputación",
      international: "Internacional",
      contract: "Contrato",
      facilities: "Instalaciones",
      finances: "Finanzas",
      stadium: "Estadio",
      traits: "Características",
      health: "Médico",
      other: "Otros",
    },
    fieldsLabel: "Campos que cambiar",
    row: (position) => `Cambio ${position}`,
    field: "Campo",
    operation: "Operación",
    operations: { set: "Fijar en", add: "Sumar", scale: "Escalar al %", addYears: "Sumar años" },
    values: { set: "Valor", add: "Cantidad", scale: "Porcentaje", addYears: "Años" },
    addTitle: "Se suma a cada valor tal como se muestra; un número negativo resta",
    addPointsTitle: "Puntos porcentuales sumados a cada valor (70 % más 10 es 80 %); un número negativo resta",
    rangeHint: (min, max) => `${format(min)}–${format(max)}`,
    amountHint: (max) => `±${format(max)}`,
    ofCurrent: "% del valor actual",
    percentTitle:
      "Un porcentaje del valor actual: 100 lo mantiene, 110 lo sube una décima parte, 50 lo reduce a la mitad",
    addYearsTitle:
      "Años sumados a cada fecha; un número negativo la lleva atrás, y el 29 de febrero puede pasar a ser el 28",
    years: "años",
    invalidAdd: (min, max) => `Introduce un número entero de ${format(min)} a ${format(max)}`,
    invalidPercent: (min, max) => `Introduce un porcentaje entero de ${min} a ${max}`,
    invalidYears: (min: number, max: number) => `Introduce un número entero de años de ${format(min)} a ${format(max)}`,
    dateSetOnly: "Una fecha solo se puede fijar o mover por años",
    yearsDateOnly: "Solo una fecha se puede mover por años",
    addField: "Añadir un campo",
    addFieldFull: (max) => `Una edición masiva cambia hasta ${max} campos`,
    remove: "Quitar este campo",
    removeLast: "Una edición masiva necesita al menos un campo",

    // La vista previa
    preview: "Vista previa",
    previewing: "Generando la vista previa…",
    previewBlocked: "Rellena cada campo con un valor válido para ver la vista previa",
    summary: (entity, preview) =>
      [
        preview.changes === 0
          ? "Ningún cambio"
          : `${changes(preview.changes)} en ${format(preview.targets - preview.unchanged)} de ` +
            entityCount(entity, preview.targets),
        preview.unchanged > 0 &&
          (preview.unchanged === 1
            ? "1 ya tiene estos valores"
            : `${format(preview.unchanged)} ya tienen estos valores`),
        preview.skippedCount > 0 && valuesLeftAlone(preview.skippedCount),
      ]
        .filter(Boolean)
        .join(" · "),
    tableLabel: "Cambios que haría la edición masiva",
    columns: { name: "Nombre", field: "Campo", change: "Cambio", reason: "Motivo" },
    more: (count) => `y ${format(count)} más`,
    skippedHeading: valuesLeftAlone,
    skippedLabel: "Valores que la edición masiva deja sin tocar",

    // Aplicar y deshacer
    apply: "Aplicar",
    applying: "Aplicando…",
    applyTitle: (count) => `Escribir ${changes(count)} en el juego`,
    applyFirst: "Genera antes la vista previa de la edición masiva",
    applyNothing: "La vista previa no tiene cambios que escribir",
    hint: "Nada cambia en el juego hasta que aplicas.",
    applied: (count) =>
      count === 0
        ? "No se ha escrito ningún cambio"
        : count === 1
          ? "1 cambio aplicado"
          : `${format(count)} cambios aplicados`,
    failure: (name, label, reason) => `${name} · ${label}: ${reason}`,
    undo: "Deshacer esta edición masiva",
    undoing: "Deshaciendo…",
    undoTitle: "Volver a escribir en el juego los valores anteriores de esta edición masiva",
    undone: (count) =>
      count === 0
        ? "No se ha deshecho nada"
        : count === 1
          ? "1 cambio deshecho"
          : `${format(count)} cambios deshechos`,
    undoFailure: (who, reason) => `${who}: ${reason}`,
    changeNumber: (id) => `Cambio ${id}`,
    close: "Cerrar",
  },

  comparison: {
    compare: "Comparar",
    add: "Añadir a la comparación",
    remove: "Quitar de la comparación",
    full: (max) => `Una comparación admite hasta ${max} jugadores. Quita uno para añadir a este jugador.`,

    // La bandeja bajo la lista de jugadores
    trayLabel: "Jugadores que comparar",
    removePlayer: (name) => `Quitar de la comparación: ${name}`,
    clear: "Vaciar",
    open: (count) => `Comparar (${count})`,

    // El diálogo
    title: "Comparación",
    hint: "Se resalta el mejor valor de cada fila: el más alto o, donde más bajo es mejor, el más bajo.",
    tooFew: "Añade al menos dos jugadores para compararlos.",
    loading: "Cargando los jugadores…",
    tableLabel: "Valores de los jugadores comparados",
    highest: "el más alto",
    lowest: "el más bajo",
    profile: "Perfil",
    close: "Cerrar",
  },

  move: {
    button: "Traspasar",
    buttonTitle: "Traspasar a este jugador a otro club en el juego, por un precio si quieres",

    // El diálogo
    title: "Traspaso",
    from: "Origen",
    to: "Destino",

    modeLabel: "Traspaso, cesión, mover ahora o intercambio",
    modeMove: "Mover ahora",
    modeSwap: "Intercambiar por un jugador",
    modeArrange: "Traspaso",
    arrangeNote:
      "El juego hace el traspaso en su siguiente día, como hace los suyos: su historial conserva los partidos de esta " +
      "temporada con su antiguo club, anota el nuevo club con el precio, y el juego paga el precio.",
    moveNote:
      "El editor lo mueve al instante. El historial del juego no lo recoge: esta temporada aparece con el nuevo club, " +
      "sin precio.",
    arrangeUnavailable:
      "Esta versión del juego, o este sistema, no deja que el editor prepare un traspaso para que lo haga el juego: " +
      "Mover ahora lo mueve al instante.",
    arrangeChecking: "Comprobando el traspaso… la primera vez, encontrar los traspasos del juego tarda unos segundos.",
    movesOn: (date) => `El juego hace el movimiento el ${date}`,
    arrangeFee: (amount) => `Precio ${amount}, que paga el juego ese día`,
    arrangeContract: (wage, expires) => `Contrato: ${wage} a la semana hasta el ${expires}`,
    arrangeDoes: [
      "Acordado ahora: el juego hace el movimiento cuando llega a su siguiente día",
      "Su historial conserva los partidos de esta temporada con su antiguo club y anota el nuevo club con el precio",
      "El juego paga el precio ese día, como paga sus propios traspasos",
      "Contrato con el nuevo club desde ese día; el salario y el fin de contrato solo cambian si fijas otros nuevos",
      "Aparece en Cambios, donde un solo Deshacer lo anula hasta ese día",
    ],
    arrangeButton: "Preparar traspaso",

    modeLoan: "Cesión",
    loanNote: "El juego hace la cesión en su próximo día, como las suyas; después vuelve a su club.",
    loanChecking: "Comprobando la cesión…",
    loanOn: (date: string) => `El juego hace la cesión el ${date}`,
    loanUntil: (date: string) => `La cesión dura hasta el ${date}`,
    loanWage: (money: string, share: number) => `El club paga ${money} a la semana (${format(share)} % de su salario)`,
    loanMonthlyFee: (money: string) => `Cuota mensual ${money}`,
    loanOption: (money: string) => `Opción de compra por ${money}`,
    loanDoes: [
      "Acordada ahora: el juego hace la cesión cuando llega a su próximo día",
      "Su historial recoge la cesión, y vuelve a su club el día siguiente al último",
      "El club paga su parte del salario y la cuota mensual, si la pones",
      "Con opción, el club que lo recibe puede ficharlo por su importe al acabar la cesión",
    ],
    loanDoesHeading: "Qué hace la cesión",
    loanHint: "Nada cambia en el juego hasta que pulsas Preparar cesión.",
    loanButton: "Preparar cesión",
    loanLastDay: "Último día de la cesión",
    loanLastDayHint: "Al día siguiente vuelve a su propio club",
    loanShare: "Parte del salario que paga",
    loanShareHint: "Lo que paga el club al que va; el resto, el suyo",
    loanShareInvalid: "Introduce un número entero de 0 a 100",
    loanMonthly: "Cuota mensual",
    loanOptionFee: "Opción de compra",
    loanOptionFeeHint: "Al acabar la cesión, el club que lo recibe puede ficharlo por este importe; vacío: sin opción",

    // El club
    searchLabel: "Buscar el club al que traspasar",
    resultsLabel: "Clubes encontrados",
    searching: "Buscando clubes…",
    searchFailed: (reason) => `No se han podido buscar los clubes: ${reason}`,
    more: (count) => `y ${format(count)} más; escribe para acotar la búsqueda`,
    change: "Elegir otro club",

    // El precio
    feeHeading: "Precio",
    fee: "Precio del traspaso",
    feeHint: "Déjalo vacío para un traspaso gratuito",
    feeInvalid: (max) => `Introduce un importe entero, de 0 a ${max}`,
    pays: (club, fee, balance, budget) =>
      `${club} paga ${fee}: saldo ${balance}${budget === null ? "" : `, presupuesto de fichajes ${budget}`}`,
    receives: (club, fee, balance) => `${club} recibe ${fee}: saldo ${balance}`,
    noFinances: (club) => `${club} no tiene finanzas en el juego: su dinero no cambia`,

    // El contrato
    wageInvalid: "Introduce un importe entero, 0 o más",
    expiresInvalid: "Introduce una fecha",

    // El traspaso
    chooseClub: "Elige el club al que traspasar al jugador.",
    fixTerms: "Corrige antes el precio o los valores del contrato.",
    checking: "Comprobando el traspaso…",
    route: (from, to) => `${from} → ${to}`,
    doesHeading: "Qué hace el traspaso",
    does: [
      "Se une al primer equipo del nuevo club",
      "Contrato con fecha del día del juego; se le quita el dorsal",
      "Sale de las listas de transferibles y cedibles",
      "El salario y el fin de contrato solo cambian si fijas otros nuevos",
      "El precio sale del saldo y del presupuesto de fichajes del comprador, y entra en el saldo del vendedor",
      "Cualquier capitanía en el club anterior queda vacante",
      "El historial de traspasos del juego aún no lo recoge",
      "Aparece en Cambios, donde deshacerlo revierte de una vez el traspaso y el precio",
    ],

    // Un club con la plantilla llena: el recuadro que sustituye al rechazo y ofrece hacer sitio
    noRoom: (club) => `${club} no tiene sitio en su plantilla.`,
    noRoomInfoLabel: "¿Por qué?",
    noRoomInfo:
      "El editor amplía una lista de plantilla llena donde puede, pero esta no puede ampliarla: tiene que salir un " +
      "jugador para hacer sitio.",
    noRoomNeed: (player) => `Para que llegue ${player}, tiene que salir un jugador de la plantilla.`,
    releaseChoice: "Rescindir:",
    releasePickLabel: "Jugador cuyo contrato se rescinde",
    releaseOutcome: "→ queda sin club",
    injuredTag: "lesionado",
    captainTag: "capitán",
    swapChoice: "Convertir en intercambio:",
    swapChoiceOutcome: (club) => `este jugador pasa a ${club}`,
    moveAndRelease: (name) => `Traspasar y rescindir: ${name}`,
    makeRoomDoes: [
      "Se une al primer equipo del nuevo club, en el lugar del jugador rescindido",
      "El jugador rescindido sale de todos los equipos de ese club y su contrato termina: es agente libre",
      "Contrato con fecha del día del juego; se le quita el dorsal",
      "Sale de las listas de transferibles y cedibles",
      "El salario y el fin de contrato solo cambian si fijas otros nuevos",
      "El precio sale del saldo y del presupuesto de fichajes del comprador, y entra en el saldo del vendedor",
      "Cualquier capitanía que uno u otro tuviera en el club que deja queda vacante",
      "El historial de traspasos del juego aún no lo recoge",
      "Aparece en Cambios como un solo cambio; deshacerlo revierte de una vez el traspaso, la rescisión y el precio",
    ],

    // El intercambio
    swapTitle: "Intercambiar por un jugador",
    swapWith: "Intercambiar por",
    playerSearchLabel: "Buscar el jugador por el que intercambiar",
    playerSearch: "Buscar jugadores de este club por nombre",
    playersLabel: "Jugadores encontrados",
    playersSearching: "Buscando jugadores…",
    playersSearchFailed: (reason) => `No se han podido buscar los jugadores: ${reason}`,
    playersEmpty: (query) =>
      query === "" ? "Este club no tiene jugadores." : `Ningún jugador de este club coincide con «${query}».`,
    changePlayer: "Elegir otro jugador",

    swapContract: "Cada jugador conserva su contrato; los salarios y los fines de contrato no cambian.",
    // Mover a un miembro del personal
    staffButtonTitle: "Mover a este miembro del personal a otro club en el juego",
    staffChooseClub: "Elige el club al que mover a este miembro del personal.",
    staffContract: "Conserva el puesto, el salario y el fin de contrato; el contrato lleva la fecha del día del juego.",
    staffJob: "Puesto",
    staffJobChoose: "Elige un puesto…",
    staffJobKept: (job) => `${job} (lo conserva)`,
    staffNewJob:
      "Ocupa el nuevo puesto y conserva el salario y el fin de contrato; el contrato lleva la fecha del día del juego.",
    staffDoes: [
      "Se une al nuevo club donde está su puesto: el departamento médico, técnico o de ojeo, o como director de " +
        "fútbol o mánager, que un club que ya tiene uno no acepta",
      "Mismo salario y fin de contrato; el contrato lleva la fecha del día del juego",
      "Un mánager que deja un equipo deja vacío su sitio, para que el club lo cubra; de la directiva se encarga el juego",
      "Aparece en Cambios, donde se puede deshacer",
    ],
    staffSignButtonTitle: "Fichar a este miembro del personal, que no tiene club, por un club en el juego",
    staffSignTitle: "Fichar a un miembro del personal",
    staffSignChooseClub: "Elige el club por el que ficharlo.",
    staffSignChooseJob: "Elige el puesto que ocupará en el club.",
    staffSignTerms:
      "Déjalos vacíos para el salario del miembro del personal del club con el puesto más parecido y un contrato " +
      "hasta el final de la próxima temporada.",
    staffSignRoute: (to) => `Sin club → ${to}`,
    staffSignContract: (wage, expires) => `Nuevo contrato: ${wage} por semana hasta el ${expires}`,
    staffSignDoes: [
      "Se une al club donde está su puesto: su departamento, que se amplía si está lleno, o como director de " +
        "fútbol o mánager, si no tiene uno",
      "Un contrato nuevo desde la fecha del juego, en uno de los huecos libres de contratos del propio juego, como " +
        "hace el juego",
      "Copia el contrato del miembro del personal del club con el mismo puesto (si no, del mismo departamento, o de " +
        "cualquiera) más cercano en capacidad",
      "Tu salario y fin de contrato, o el salario de ese contrato y el final de la próxima temporada; sin cláusulas " +
        "ni primas",
      "Aparece en Cambios, donde un solo deshacer lo revierte todo",
    ],
    swapChooseClub: "Elige el club del jugador por el que intercambiar.",
    swapChoosePlayer: "Elige el jugador por el que intercambiar.",
    swapChecking: "Comprobando el intercambio…",
    swapRoute: (player, from, to, other) => `${player}: ${from} → ${to}\n${other}: ${to} → ${from}`,
    swapDoesHeading: "Qué hace el intercambio",
    swapDoes: [
      "Cada uno se une al primer equipo del club del otro",
      "Contratos con fecha del día del juego; se les quitan los dorsales",
      "Ambos salen de las listas de transferibles y cedibles",
      "Cualquier capitanía en sus clubes anteriores queda vacante",
      "No se paga ningún precio; la trayectoria no se actualiza",
      "Aparece en Cambios como un solo cambio, que deshace los dos movimientos",
    ],

    // Fichar a un agente libre
    signButtonTitle: "Fichar a este agente libre por un club en el juego",
    signTitle: "Fichar a un agente libre",
    signChooseClub: "Elige el club por el que fichará el jugador.",
    signChecking: "Comprobando el fichaje…",
    signTerms:
      "Si los dejas vacíos, el salario es el del jugador del club con la habilidad más cercana a la suya, y el " +
      "contrato dura hasta el final de la próxima temporada.",
    signRoute: (to) => `Agente libre → ${to}`,
    signContract: (wage, expires, status) => `Nuevo contrato: ${wage} a la semana hasta el ${expires}, ${status}`,
    signDoesHeading: "Qué hace el fichaje",
    signDoes: [
      "Se une al primer equipo del club; una lista de plantilla llena se amplía",
      "Un contrato nuevo con fecha del día del juego, en uno de los huecos libres de contrato del propio juego, como los hace el juego",
      "Basado en el contrato del jugador del club con la habilidad más cercana: el mismo tipo de contrato y estatus",
      "Tu salario y fin de contrato, o el salario de ese jugador y el final de la próxima temporada",
      "Sin dorsal, prima de fidelidad, cláusulas ni primas",
      "El historial de traspasos del juego aún no lo recoge",
      "Aparece en Cambios, donde deshacerlo lo revierte todo",
    ],
    signHint: "Nada cambia en el juego hasta que pulsas Fichar.",
    sign: "Fichar",
    signing: "Fichando…",

    // El pie
    hint: "Nada cambia en el juego hasta que pulsas Traspasar.",
    arrangeHint: "Nada cambia en el juego hasta que pulsas Preparar traspaso.",
    moveNowHint: "Nada cambia en el juego hasta que pulsas Mover ahora.",
    move: "Traspasar",
    moving: "Traspasando…",
    cancel: "Cancelar",
    swapHint: "Nada cambia en el juego hasta que pulsas Intercambiar.",
    swap: "Intercambiar",
    swapping: "Intercambiando…",
  },

  ties: {
    heading: "Nacionalidad y formación local",
    nationalities: "Nacionalidades secundarias",
    trainedInNation: "Formado en el país",
    trainedAtClub: "Formado en el club",
    workPermit: "Sin permiso de trabajo en",
    none: "Ninguna",
    rules: {
      1: "Formado localmente 15-21",
      2: "Formado localmente 0-21",
      5: "Formado localmente 15-21 (sin cesiones)",
      10: "Formado localmente 0-19 (1 año)",
    },
    rule: (code) => `Regla de formación local ${format(code)}`,

    // El botón y su diálogo
    change: "Cambiar",
    changeTitle: "Cambiar las nacionalidades secundarias y la formación local de este jugador en el juego",
    title: "Nacionalidad y formación local",
    hint: "Cada cambio se escribe en el juego al momento y aparece en Cambios, donde se puede deshacer.",
    full:
      "El juego hizo la lista de este jugador justo del tamaño de lo que contiene: se puede cambiar o quitar una " +
      "nacionalidad o una formación, pero no añadir.",
    nationOf: (name) => `País en lugar de ${name}`,
    ruleOf: (name) => `Regla de formación local para ${name}`,
    remove: "Quitar",
    removeTitle: (name) => `Quitar ${name}`,
    addNationality: "Añadir una nacionalidad…",
    addNation: "Añadir un país…",
    addPermit: "Añadir un país sin permiso…",
    daysLeft: (days) => `quedan ${format(days)} días`,
    permitInfoLabel: "¿Para qué sirve?",
    permitInfo:
      "El juego deja a los jugadores de la Unión Europea que estaban en Inglaterra o Escocia antes del Brexit jugar " +
      "allí sin permiso de trabajo durante un número de días. Un jugador al que se lo des tampoco necesita permiso de " +
      "trabajo para jugar en ese país, durante los mismos días que les quedan a ellos (diez años si nadie en la partida " +
      "lo tiene).",
    newRule: "Regla de formación local del nuevo país",
    add: "Añadir",
    changeClub: "Cambiar club",
    changeClubTitle: (name) => `Que se haya formado en otro club en lugar de ${name}`,
    clubInsteadOf: (name) => `Club en lugar de ${name}`,
    addClub: "Añadir un club…",
    addClubTitle: "Que se haya formado en un club más",
    newClub: "Nuevo club",
    pickAnother: "Elegir otro",
    newClubRule: "Regla de formación local del nuevo club",
    cancel: "Cancelar",
    working: "Escribiendo en el juego…",
    close: "Cerrar",
  },

  clauses: {
    change: "Cambiar",
    changeTitle: "Cambia en el juego las primas y cláusulas de este jugador",
    title: "Primas y cláusulas",
    hint: "Cada cambio se escribe en el juego al momento y aparece en Cambios, donde se puede deshacer.",
    full:
      "El juego hizo la lista de este contrato justo del tamaño de lo que contiene: se puede cambiar o quitar una " +
      "prima o cláusula, pero no añadir una cláusula de rescisión.",
    amountOf: (name) => `Importe de ${name}`,
    conditionOf: (name) => `Condición de ${name}`,
    save: "Guardar",
    remove: "Quitar",
    removeTitle: (name) => `Quitar ${name}`,
    addRelease: "Añadir una cláusula de rescisión",
    releaseAmount: "Importe de la nueva cláusula de rescisión",
    add: "Añadir",
    outOfRange: (max) => `Escribe un número entero de 0 a ${max}.`,
    working: "Escribiendo en el juego…",
    close: "Cerrar",
  },

  release: {
    button: "Rescindir",
    buttonTitle: "Rescindir el contrato de este jugador con su club en el juego: pasa a ser agente libre",
    staffButtonTitle: "Rescindir el contrato de este empleado con su club en el juego: se queda sin club",

    // El diálogo
    title: "Rescisión",
    from: "Sale de",
    checking: "Comprobando la rescisión…",
    ready: (club) => `${club} → agente libre`,
    staffReady: (club) => `${club} → sin empleo`,
    doesHeading: "Qué hace la rescisión",
    does: [
      "Sale de todos los equipos del club y su contrato termina: es agente libre y cualquier club puede ficharlo",
      "Nadie cobra nada",
      "Cualquier capitanía en el club queda vacante",
      "El historial de traspasos del juego no lo recoge",
      "Aparece en Cambios, donde deshacerla devuelve al jugador con el mismo contrato",
    ],
    staffDoes: [
      "Deja el personal del club al momento y su contrato termina: sin empleo, como los empleados sin club del propio juego",
      "Nadie cobra nada",
      "Un puesto de mánager o de director de fútbol queda vacío, para que el club lo cubra",
      "Aparece en Cambios, donde deshacerla lo devuelve con el mismo contrato",
    ],

    // El pie
    hint: "Nada cambia en el juego hasta que pulsas Rescindir.",
    release: "Rescindir",
    releasing: "Rescindiendo…",
    cancel: "Cancelar",
  },

  rename: {
    button: "Renombrar",
    buttonTitle: "Cambiar los nombres de este jugador en el juego",

    // El diálogo
    title: "Renombrar",
    loading: "Leyendo los nombres…",
    first: "Nombre",
    last: "Apellido",
    common: "Nombre común",
    commonHint:
      "El nombre que el juego muestra en lugar del nombre y el apellido, como Pedri o Vinícius Júnior. Déjalo vacío para no poner ninguno",
    full: "Nombre completo",
    fullHint: "El nombre entero, tal como lo da el perfil. Déjalo vacío para no poner ninguno",
    none: "Ninguno",
    required: "No puede estar vacío",
    tooLong: (max: number) => `Demasiado largo: como máximo ${max} bytes`,
    noRoom:
      "El juego no tiene sitio ahora mismo para otro nombre nuevo de este tipo: guarda la partida, vuelve a cargarla e inténtalo de nuevo",
    unavailable: "El editor no puede cambiar nombres en esta versión del juego",
    doesHeading: "Qué hace",
    does: [
      "El juego muestra el nombre nuevo cuando pulsas Continuar en el juego",
      "El nombre se mantiene al guardar la partida",
      "Un nombre, apellido o nombre común nuevo entra en las tablas de nombres del juego, donde el juego lo usa solo para este jugador",
      "Aparece en Cambios, una línea por nombre, donde Deshacer devuelve el nombre anterior",
    ],

    // El pie
    hint: "Nada cambia en el juego hasta que pulses Renombrar.",
    rename: "Renombrar",
    renaming: "Renombrando…",
    cancel: "Cancelar",
  },

  permanent: {
    title: "Hacer la cesión definitiva",
    stays: "Se queda en",
    leaves: "Deja",
    checking: "Comprobando…",
    doesHeading: "Qué hace",
    does: [
      "Se queda donde juega, ahora con contrato con ese club desde hoy y con las condiciones de arriba",
      "Conserva allí su dorsal y su estatus en la plantilla",
      "Deja todos los equipos de su club, y la cesión termina",
      "El historial de traspasos del juego no lo muestra",
      "Figura en Cambios como un traspaso; deshacerlo una vez devuelve la cesión",
    ],
    /** The fee, filled in from the loan's option to buy. */
    optionFee: (money) => `Rellenado con la opción de compra de la cesión: ${money}`,
    hint: "Nada cambia en el juego hasta que pulsas Hacer definitiva.",
    confirm: "Hacer definitiva",
    confirming: "Haciéndola definitiva…",
    cancel: "Cancelar",
  },

  recall: {
    title: "Repescar de la cesión",
    from: "Cedido a",
    to: "Vuelve a",
    doesHeading: "Qué hace la repesca",
    does: (parent) => [
      "Hoy pasa a ser el último día de la cesión: al acabar el día, el juego la termina por sí mismo",
      `Avanza un día en el juego y estará de vuelta en ${parent}`,
      "Hasta entonces figura en Cambios, donde deshacerlo devuelve el fin anterior de la cesión",
    ],
    termsHeading: "En el juego",
    notRecallable: (parent) => `La cesión no permite que ${parent} lo repesque`,
    notTerminable: "La cesión no se puede rescindir",
    worksAnyway: "Aquí la repesca funciona igual: no usa la del juego, cambia el último día de la cesión",
    dropsOption: (club, amount) =>
      `Se elimina la opción de compra de ${club} por ${amount}: si no, al acabar la cesión el juego podría vendérselo a ${club}`,
    hint: "Nada cambia en el juego hasta que pulsas Repescar.",
    confirm: "Repescar",
    confirming: "Repescando…",
    cancel: "Cancelar",
  },

  batchTraits: {
    title: "Características del equipo",
    addMode: "+ Añadir a la plantilla",
    removeMode: "- Quitar de la plantilla",
    addHint: "Aplica las características marcadas a los jugadores del equipo que no las tengan. Las características existentes no se tocan.",
    removeHint: "Quita las características marcadas a los jugadores del equipo que las tengan. Las demás características no se tocan.",
    noneSelected: "Ninguna característica seleccionada en este modo",
    selectedCount: (count: number) => `${format(count)} seleccionada${count === 1 ? "" : "s"}`,
    deselectAll: "Desmarcar todo",
    oppositeModeNote: "Marcada en el otro modo",
    applyNote: (players: number) => `Se aplicará a ${format(players)} jugadores · Se puede deshacer con 1 clic`,
    emptySquad: (players: number) => `Plantilla de ${format(players)} jugadores`,
    cancel: "Cancelar",
    apply: "Aplicar",
    applying: "Aplicando…",
  },

  squad: {
    teamsLabel: "Equipo",
    teams: {
      first: "Primer equipo",
      b: "Equipo B",
      age: (limit) => `Sub-${limit}`,
      other: (place) => `Equipo ${place}`,
    },
    noTeams: "Este club no tiene equipos.",
    loading: "Leyendo la plantilla…",
    empty: "No hay jugadores en este equipo.",

    // Sobre la tabla
    players: (count) => entityCount("player", count),
    averageAge: (age) => `edad media ${age}`,
    captains: (captain, viceCaptain) => `Capitán: ${captain} · Vicecapitán: ${viceCaptain}`,

    // Las acciones sobre todo el equipo
    actionsLabel: "Acciones sobre todo el equipo",
    healAll: (injured) =>
      injured === 0
        ? "Curar a todos"
        : `Curar a todos (${injured === 1 ? "1 lesionado" : `${format(injured)} lesionados`})`,
    healAllTitle: "Curar todas las lesiones de todos los jugadores de este equipo",
    healNone: "Nadie en este equipo está lesionado",
    liftAll: (banned) =>
      banned === 0
        ? "Levantar sanciones"
        : `Levantar sanciones (${banned === 1 ? "1 sancionado" : `${format(banned)} sancionados`})`,
    liftAllTitle: "Levantar todas las sanciones de todos los jugadores de este equipo",
    liftNone: "Nadie en este equipo está sancionado",
    inspireAll: "Motivar a todos",
    inspireAllTitle: "Poner la moral de todos los jugadores en 20, la más alta, y quitar sus motivos de descontento",
    maxCohesion: "Máxima cohesión",
    maxCohesionTitle:
      "Poner en 100, la más alta, la cohesión con el club de todos los jugadores; el juego la muestra cuando avanza",
    cohesionNone:
      "No se puede leer: esta versión del juego no se ha comprobado, o ningún jugador tiene cohesión con el club",
    cohesionWithout: (count: number) =>
      count === 1
        ? "1 jugador aún no tiene cohesión con el club"
        : `${format(count)} jugadores aún no tienen cohesión con el club`,
    maxTactics: "Táctica al máximo",
    maxTacticsTitle:
      "Que cada jugador conozca al máximo la táctica del equipo; baja en unas seis semanas, como el entrenamiento",
    tacticsNone:
      "No se puede leer: esta versión del juego no se ha comprobado, o el equipo no juega una táctica que elijas tú",
    tacticsUntrained: (count: number) =>
      count === 1
        ? "1 jugador no entrena (por ejemplo, por lesión): su historial de entrenamiento se queda como está"
        : `${format(count)} jugadores no entrenan (por ejemplo, por lesión): su historial de entrenamiento se queda como está`,
    refreshAll: "Recuperar a todos",
    refreshAllTitle:
      "Poner la energía y el ritmo de competición de todos los jugadores al 100 % y dejarlos descansados (fatiga -500)",
    batchTraits: "Características del lote",
    batchTraitsTitle: "Añade o quita características a los jugadores de este equipo",
    maxAll: "Atributos al máximo",
    maxAllTitle:
      "Poner cada atributo de cada jugador en su mejor valor: 20, y 1 para la propensión a lesiones y el juego sucio",
    atItsBest: "Equipo al máximo",
    atItsBestTitle:
      "Curar, motivar y recuperar a todos, máxima cohesión y táctica al máximo con una pulsación; un «Deshacer» lo revierte",
    atItsBestSkipped: (step, reason) => `Se omitió «${step}»: ${reason}`,
    destroy: "Equipo por los suelos",
    destroyTitle:
      "Llevar a lo peor la moral, la forma, la cohesión y el conocimiento táctico de cada jugador; pregunta antes",
    destroySteps: {
      demoralize: "Moral y felicidad",
      exhaust: "Energía y ritmo",
      minCohesion: "Cohesión",
      minTactics: "Táctica",
    },
    moreActions: "Más acciones",
    moreActionsTitle: "Las acciones sobre todo el equipo, una a una",
    destroyDialog: {
      title: "¿Dejar el equipo por los suelos?",
      doesHeading: "Para cada jugador de la lista, también los cedidos",
      does: [
        "Moral a 1, la más baja; felicidad y felicidad con los minutos a -100",
        "Energía al 0 %, ritmo de competición al 35 % y fatiga a 1000",
        "Cohesión con el club a 1, para quienes la tienen",
        "Cuánto conoce la táctica, al mínimo, si eliges tú la táctica del equipo",
      ],
      keeps: "Ningún valor mejora. Los atributos, las lesiones y las sanciones se quedan como están.",
      ownClub: "Es un equipo de tu propio club.",
      hint: "Un solo «Deshacer» lo revierte todo, antes de que el juego avance.",
      cancel: "Cancelar",
    },
    hint:
      "Las acciones abarcan a todos los jugadores de la lista, también a los cedidos. Se pueden deshacer también " +
      "en Cambios.",

    // Congelar todo el equipo
    freezeLabel: "Congelar todo el equipo",
    freezeAttributes: "Congelar los atributos",
    freezeAttributesTitle:
      "Los atributos de todos los jugadores de este equipo no empeoran con la aplicación abierta y conectada",
    freezeFitness: "Congelar energía y ritmo",
    freezeFitnessTitle:
      "La energía y el ritmo de competición de todos no bajan con la aplicación conectada; pulsa antes Recuperar a todos",
    freezePositions: "Congelar posiciones",
    freezePositionsTitle:
      "Las valoraciones por posición de todos los jugadores se quedan como están con la aplicación abierta y conectada",
    frozenCount: (frozen, total) => `${format(frozen)} de ${format(total)}`,
    freezeHint:
      "Congelar abarca a todos los jugadores de la lista y acompaña a cada uno vaya donde vaya. La aplicación lo " +
      "recuerda para esta partida.",
    frozeAttributes: (count) =>
      count === 0
        ? "Sus atributos ya estaban congelados"
        : `Se congelaron los atributos de ${entityCount("player", count)}`,
    unfrozeAttributes: (count) => `Se descongelaron los atributos de ${entityCount("player", count)}`,
    frozeFitness: (count) =>
      count === 0
        ? "Su energía y su ritmo ya estaban congelados"
        : `Se congelaron la energía y el ritmo de ${entityCount("player", count)}`,
    unfrozeFitness: (count) => `Se descongelaron la energía y el ritmo de ${entityCount("player", count)}`,
    frozePositions: (count) =>
      count === 0
        ? "Sus posiciones ya estaban congeladas"
        : `Se congelaron las posiciones de ${entityCount("player", count)}`,
    unfrozePositions: (count) => `Se descongelaron las posiciones de ${entityCount("player", count)}`,

    // Lo que hizo una acción
    written: (count) =>
      count === 0
        ? "No se ha escrito ningún cambio"
        : count === 1
          ? "1 cambio escrito"
          : `${format(count)} cambios escritos`,
    refused: (name, reason) => `${name}: ${reason}`,
    undo: "Deshacer",
    undoTitle: "Volver a escribir en el juego los valores anteriores de estos cambios",

    // Capitanes
    captainShort: "C",
    viceCaptainShort: "VC",
    menuLabel: (name) => `Capitanía de ${name}`,
    menuTitle: "Capitanía",
    makeCaptain: "Nombrar capitán",
    makeViceCaptain: "Nombrar vicecapitán",
    nowCaptain: (name) => `${name} es ahora el capitán`,
    nowViceCaptain: (name) => `${name} es ahora el vicecapitán`,
    noCaptain: "Ahora nadie es capitán",
    noViceCaptain: "Ahora nadie es vicecapitán",

    // La tabla
    tableLabel: (team) => `Jugadores del equipo: ${team}`,
    openProfile: "Abrir el perfil",
    columns: {
      name: "Nombre",
      position: "Pos.",
      age: "Edad",
      currentAbility: "HA",
      potentialAbility: "HP",
      condition: "Energía",
      matchSharpness: "Ritmo",
      jadedness: "Fatiga",
      morale: "Moral",
      cohesion: "Cohesión",
      tactics: "Táctica",
      actions: "Capitanía",
    },
    sortBy: (by) => `Ordenar por ${by}`,
    sortNames: {
      name: "nombre",
      position: "posición",
      age: "edad",
      currentAbility: "habilidad actual",
      potentialAbility: "habilidad potencial",
      condition: "energía",
      matchSharpness: "ritmo de competición",
      jadedness: "fatiga",
      morale: "moral",
      cohesion: "cohesión",
      tactics: "familiaridad táctica",
    },

    // Las etiquetas tras un nombre
    injured: "Lesionado",
    injuredTitle: (count) => (count === 1 ? "1 lesión" : `${format(count)} lesiones`),
    banned: "Sancionado",
    bannedTitle: (count) => (count === 1 ? "1 sanción" : `${format(count)} sanciones`),
    unrest: "Malestar",
    unrestTitle: (count) =>
      count === 1
        ? "1 compañero está descontento con él; «Quitar todo», en su perfil, lo resuelve cuando el juego avanza"
        : `${format(count)} compañeros están descontentos con él; «Quitar todo», en su perfil, lo resuelve cuando el juego avanza`,
    onLoan: "Cedido",
    onLoanTitle: "Cedido a otro club",
    loanee: "En préstamo",
    loaneeTitle: "Aquí cedido por otro club",
    elsewhere: "En otro equipo",
    elsewhereTitle: "Juega en otro equipo del club",
    frozen: "Congelado",
    frozenTitle: (attributes, fitness, positions) => {
      const frozen = [
        ...(attributes ? ["sus atributos"] : []),
        ...(fitness ? ["su energía", "su ritmo"] : []),
        ...(positions ? ["sus posiciones"] : []),
      ];
      const last = frozen.pop() ?? "";
      const listed = frozen.length > 0 ? `${frozen.join(", ")} y ${last}` : last;
      // Feminine only when his positions alone are frozen.
      const ending = attributes || fitness ? "congelados" : "congeladas";
      return `${listed.charAt(0).toUpperCase()}${listed.slice(1)} están ${ending}`;
    },
  },

  game: {
    name: "Football Manager",
    storefronts: {
      gamePass: "Game Pass",
      steam: "Steam",
      epic: "Epic Games",
      unknown: "Tienda desconocida",
    },
    steamBuild: (id) => `(compilación ${id})`,
  },

  scouting: {
    nav: "Ojeo",
    reading: "Leyendo tu club…",
    refresh: "Actualizar",
    refreshTitle: "Volver a leer el club del juego",
    searching: "Buscando…",
    none: "—",
    perWeek: "/sem",
    openProfile: "Abrir el perfil",
    freeAgent: "Agente libre",
    loan: "Cedido",
    header: {
      transferBudget: "Presupuesto de fichajes",
      wageRoom: "Margen salarial",
      wageBudget: "Presupuesto salarial",
      squad: "Plantilla",
      averageAge: "Edad media",
      players: (count) => (count === 1 ? "1 jugador" : `${format(count)} jugadores`),
    },
    tabs: {
      label: "Secciones del ojeo",
      recommend: "Consejos de fichajes",
      opportunities: "Oportunidades",
      similar: "Jugadores parecidos",
      depth: "Fondo de plantilla",
      departures: "Jugadores a dejar salir",
      youth: "Promoción de la cantera",
    },
    status: {
      missing: "Falta",
      thin: "Justo",
      fine: "Bien",
      crowded: "Saturado",
    },
    lines: {
      goalkeeper: "Portero",
      centreBack: "Central",
      fullBack: "Lateral",
      wingBack: "Carrilero",
      defensiveMidfield: "Mediocentro defensivo",
      centralMidfield: "Centrocampista",
      attackingMidfield: "Mediapunta",
      wide: "Banda",
      striker: "Delantero",
    },
    depthLines: {
      gk: "Porteros",
      dc: "Centrales",
      rightBack: "Laterales derechos",
      leftBack: "Laterales izquierdos",
      dm: "Mediocentros defensivos",
      mc: "Centrocampistas",
      rightWing: "Extremos derechos",
      leftWing: "Extremos izquierdos",
      amc: "Mediapuntas",
      st: "Delanteros",
    },
    positionTip: (line, count, target, status) =>
      `${line}: ${format(count)} en la plantilla (lo habitual es ${format(target)}) — ${status}`,
    brief: {
      heading: "¿Qué buscas?",
      pitch: "Posición",
      legend: "Los puntos muestran cómo está la plantilla en cada línea.",
      inPossession: "Con balón",
      outOfPossession: "Sin balón",
      anyRole: "Cualquiera — el mejor rol para cada jugador",
      purpose: "Para",
      filters: "Filtros",
      minAge: "Edad mín.",
      maxAge: "Edad máx.",
      maxFee: "Traspaso máx.",
      minProbability: "Probabilidad",
      anyProbability: "Cualquiera",
      noFreeAgents: "Sin agentes libres",
    },
    purposes: {
      firstTeam: "Once titular",
      rotation: "Rotación",
      future: "Futuro",
      any: "Todos",
    },
    purposeTips: {
      firstTeam: "Mejor que tu mejor jugador en esta posición",
      rotation: "Tan bueno como tu segunda opción, a un precio razonable",
      future: "21 años o menos, con margen de mejora",
      any: "Todos los que encajan",
    },
    ask: {
      before: "Consejos para ",
      after: "",
      anyRole: "mejor rol para cada jugador",
    },
    own: {
      heading: "En tu plantilla",
      empty: "Nadie de tu plantilla juega aquí.",
      position: "Posición",
    },
    summary: (candidates, eligible, shown, purpose) =>
      `${format(candidates)} jugadores pueden jugar aquí · ${format(eligible)} encajan en ${purpose} · ${format(shown)} recomendados`,
    how: {
      label: "¿Cómo se hace esta lista?",
      note: (rule, count) =>
        `Jugadores con valoración 10 o más en esta posición (no de tu club ni de otros mánagers humanos) que ${rule}. Se muestran los ${count} mejores por adecuación (70 %) y probabilidad (30 %); Rotación pesa ambas por igual y Futuro cuenta también el potencial. Pulsa el título de una columna para ordenar.`,
    },
    purposeRules: {
      firstTeam: "encajan en la posición mejor que tu mejor jugador ahí",
      rotation: "encajan al menos tan bien como tu segunda opción",
      future: "tienen 21 años o menos y margen de mejora (potencial al menos 15 por encima de su habilidad)",
      any: "encajan",
    },
    sortBy: (by) => `Ordenar por ${by}`,
    sortNames: {
      rank: "el orden del ojeador",
      name: "nombre",
      age: "edad",
      ca: "habilidad actual",
      pa: "habilidad potencial",
      fit: "adecuación",
      probability: "probabilidad",
      fee: "traspaso",
      similarity: "parecido",
    },
    backToScoutOrder: "Volver al orden del ojeador",
    showMore: (count) => `Mostrar ${format(count)} más`,
    playsFor: (club) => `juega en ${club}`,
    empty: "Sin consejos para esta posición con estos ajustes. Prueba con el objetivo Todos o con filtros más amplios.",
    columns: {
      rank: "#",
      ca: "HA",
      pa: "HP",
      player: "Jugador",
      age: "Edad",
      fit: "Adecuación",
      role: "Rol",
      probability: "Probabilidad",
      fee: "Traspaso est.",
      wage: "Salario",
      note: "Nota del ojeador",
      money: "Traspaso",
      value: "Valor",
    },
    probabilityInfo:
      "Qué probabilidad hay de que el jugador fiche por tu club: una estimación a partir de su valor, su contrato, su club y su reputación.",
    probabilityInfoLabel: "¿Qué es la probabilidad?",
    fitTitle: (inPossession, outOfPossession, position) =>
      [
        inPossession !== null && `Con balón: ${inPossession}`,
        outOfPossession !== null && `Sin balón: ${outOfPossession}`,
        `Posición: ${position}`,
      ]
        .filter(Boolean)
        .join("\n"),
    note: "La adecuación usa los pesos de atributos propios del editor para cada rol; los traspasos, los salarios y las probabilidades son estimaciones.",
    depth: {
      summary: (size, age, level) =>
        `${format(size)} jugadores${age === null ? "" : ` · edad media ${age}`} · habilidad media del mejor once ${level}`,
      weak: "Por debajo del nivel de la plantilla",
      ageing: "Veterano",
      cover: (names) => `También puede jugar aquí: ${names}`,
      advice: "Pedir consejo",
      adviceTitle: "Consejos de fichajes para esta línea",
      empty: "Nadie",
      ability: "Habilidad actual",
      more: (count: number) => `+${format(count)} más`,
      columns: {
        line: "Línea",
        status: "Estado",
        count: "Jugadores",
        players: "De mejor a peor (habilidad)",
        cover: "También puede jugar aquí",
        age: "Edad media",
      },
      countTitle: (count, target) =>
        `${format(count)} jugadores cuya mejor posición está en esta línea; una plantilla suele tener ${format(target)}`,
      statusHelp: {
        missing: "Nadie juega aquí.",
        thin: "Menos de los que suele tener una plantilla; los que pueden cubrir cuentan la mitad.",
        fine: "Más o menos los que suele tener una plantilla.",
        crowded: "Dos o más jugadores por encima de lo habitual.",
      },
      attention: "A revisar:",
      allFine: "Todas las líneas parecen equilibradas.",
      views: { label: "Mostrar la plantilla como", pitch: "Campo", table: "Tabla" },
      pitchLabel: "La plantilla en el campo, línea por línea",
      coverCount: (count) => `${format(count)} pueden cubrirla`,
      adviceFor: (position) => `Consejos de fichajes para ${position}`,
    },
    departures: {
      intro: "Jugadores que tu ojeador dejaría salir, los más urgentes primero.",
      filter: "Consejo",
      all: "Todos",
      empty: "Ahora mismo tu ojeador no dejaría salir a nadie.",
      sortNames: {
        rank: "el orden del ojeador",
        name: "nombre",
        age: "edad",
        ca: "habilidad actual",
        pa: "habilidad potencial",
        value: "valor",
        wage: "salario",
        contract: "fin de contrato",
      },
      columns: {
        player: "Jugador",
        age: "Edad",
        ability: "Habilidad",
        value: "Valor",
        wage: "Salario",
        contract: "Contrato hasta",
        advice: "Consejo",
        reasons: "Motivos",
      },
      actions: { sell: "Vender", loan: "Ceder", release: "Rescindir" },
      rank: (line, rank) => `${line} · ${rank}.º`,
    },
    actions: {
      column: "Acciones",
      compare: "Comparar con tu plantilla",
      compareLabel: (name) => `Comparar a ${name} con tu plantilla`,
      similar: "Buscar jugadores parecidos",
      similarLabel: (name) => `Buscar jugadores como ${name}`,
      report: "Informe del ojeador",
      reportLabel: (name) => `Informe del ojeador sobre ${name}`,
      replacement: "Buscar un sustituto",
      replacementLabel: (name) => `Buscar un sustituto para ${name}`,
      replacementTitle: "Jugadores como él, que podrían ocupar su puesto",
    },
    why: {
      freeAgent: () => "Agente libre",
      expiring: (value) => `Su contrato termina en ${value} días`,
      releaseClause: (value, against) =>
        against === null
          ? `Cláusula de rescisión de ${value}`
          : `Cláusula de rescisión de ${value} (valor ${against})`,
      unhappy: (value) => (value === "1" ? "Descontento en su club" : `Descontento en su club (${value} motivos)`),
      inTheRed: (value) => `Su club está en números rojos (${value})`,
      listed: () => "En la lista de transferibles",
      loanListed: () => "En la lista de cedibles",
      wonderkid: (value) => `Potencial ${value}`,
    },
    verdicts: {
      better: "Mejor que tu n.º 1",
      close: "Cerca de tu n.º 1",
      below: "Por debajo de tu n.º 1",
      none: "Nadie de tu plantilla juega aquí",
    },
    chances: { likely: "Probablemente fiche", possible: "Podría fichar", hard: "Difícil de fichar" },
    opportunities: {
      kindsLabel: "Listas de oportunidades",
      kinds: {
        bosman: "Bosman",
        releaseClause: "Cláusulas de rescisión",
        unhappy: "Descontentos",
        inTheRed: "Clubes en números rojos",
        listed: "Lista de transferibles",
        loanListed: "Lista de cedibles",
        wonderkid: "Promesas",
      } satisfies Record<OpportunityKind, string>,
      hints: {
        bosman: "Agentes libres y contratos que terminan en menos de seis meses",
        releaseClause: "Cláusula de rescisión por debajo de su valor",
        unhappy: "Descontento en su club",
        inTheRed: "Su club necesita el dinero",
        listed: "Su club lo vendería",
        loanListed: "Su club lo cedería",
        wonderkid: "19 años o menos, con un gran futuro",
      } satisfies Record<OpportunityKind, string>,
      countLabel: "Jugadores de esta lista",
      count: (count, more) => (more ? `${format(count)}+` : format(count)),
      position: "Posición",
      anyPosition: "Cualquier posición",
      maxAge: "Edad máx.",
      maxFee: "Traspaso máx.",
      betterOnly: "Mejores que mi n.º 1",
      betterOnlyTitle: "Solo jugadores que encajan en su posición mejor que tu mejor jugador ahí",
      summary: (kind, lowest, highest, pool) =>
        `${kind} · jugadores de habilidad ${lowest}–${highest}, en torno al nivel de tu plantilla · ${pool} revisados`,
      how: {
        label: "¿Cómo se hacen estas listas?",
        note: "Jugadores cerca del nivel de tu mejor once (de 30 por debajo a 45 por encima), no de tu club ni de otros mánagers humanos, cada uno medido en su mejor posición o en la que elijas. Cada lista se ordena por adecuación y probabilidad juntas.",
      },
      empty: "Nadie en esta lista con estos filtros.",
      emptyWonderkids: "Ninguna promesa con estos filtros.",
      better: "Mejor que tu n.º 1 aquí",
      columns: { position: "Pos", why: "Motivo" },
    },
    similar: {
      intro: "Elige un jugador para encontrar otros como él: se comparan los atributos que su posición necesita.",
      search: "Jugador con el que comparar",
      searchPlaceholder: "Busca un jugador por nombre…",
      noMatch: "No hay ningún jugador con ese nombre.",
      quickPicks: "O empieza con uno de tus jugadores:",
      change: "Elegir otro jugador",
      reference: "Jugadores como",
      position: "Comparar en",
      cheaper: "Más baratos",
      cheaperTitle: "Solo jugadores que valen menos que él",
      younger: "Más jóvenes",
      youngerTitle: "Solo jugadores más jóvenes que él",
      maxFee: "Traspaso máx.",
      value: "Valor",
      notForSale: "No está en venta",
      doesNotPlay: (position) => `No juega de ${position}: solo se comparan sus atributos.`,
      summary: (candidates, shown, position) =>
        `${candidates} jugadores juegan de ${position} · los ${shown} más parecidos`,
      how: {
        label: "¿Cómo se mide el parecido?",
        note: "El ojeador compara los atributos en los que se apoyan los roles de la posición, sobre todo los clave. Dónde es fuerte un jugador y dónde es débil cuenta más que su nivel, así que uno más barato o más joven puede parecerse mucho.",
      },
      empty: "Nadie parecido con estos ajustes.",
      columns: { similarity: "Parecido", value: "Valor" },
      similarityTitle: (value) => `${format(value)} % de parecido`,
    },
    compare: {
      title: "Comparar con tu plantilla",
      hint: (position, name) => `Frente a ${name}, tu mejor jugador de ${position}. Primero, los atributos clave del rol.`,
      noStarter: "Nadie de tu plantilla juega en esta posición.",
      starter: "Tu n.º 1",
      candidate: "Candidato",
      inPossession: "Con balón",
      outOfPossession: "Sin balón",
      add: "Añadir un jugador",
      addNone: "Elige de la lista…",
      remove: (name) => `Quitar a ${name} de la comparación`,
      removeShort: "Quitar",
      scoutView: "La visión del ojeador",
      rows: {
        fit: "Adecuación",
        position: (position) => `Como ${position}`,
        roleRating: (role) => `Como ${role}`,
        probability: "Probabilidad",
        fee: "Traspaso est.",
        wage: "Salario",
        contract: "Contrato hasta",
        verdict: "Veredicto",
      },
      ownPlayer: "Tu jugador",
      roleAttributes: (roles) => `Atributos del rol: ${roles}`,
      keyAttribute: "Atributo clave del rol",
      versus: (difference) => `${difference} frente a tu n.º 1`,
      best: "el mejor",
      age: (age) => `${format(age)} años`,
      allAttributes: "Todos los atributos",
      loading: "Leyendo a los jugadores…",
      close: "Cerrar",
    },
    report: {
      title: (name) => `Informe del ojeador: ${name}`,
      hint: "Guárdalo como imagen o cópialo para compartirlo.",
      making: "Redactando el informe…",
      failed: (reason) => `No se pudo hacer el informe: ${reason}`,
      alt: (name) => `El informe del ojeador sobre ${name}`,
      save: "Guardar como imagen",
      savePdf: "Guardar como PDF",
      saving: "Guardando…",
      copy: "Copiar imagen",
      copied: "Copiado al portapapeles.",
      copyFailed: (reason) => `No se pudo copiar la imagen: ${reason}`,
      similar: "Buscar jugadores parecidos",
      saved: (file) => `Guardado como ${file}.`,
      open: "Abrir",
      show: "Mostrar en la carpeta",
      close: "Cerrar",
      heading: "Informe del ojeador",
      age: (age) => `${format(age)} años`,
      freeAgent: "Agente libre",
      contract: "contrato hasta",
      fit: "Adecuación",
      probability: "Probabilidad",
      fee: "Traspaso est.",
      abilities: "HA / HP",
      value: "Valor",
      role: "Rol",
      strengths: "Puntos fuertes",
      weaknesses: "Puntos débiles",
      profile: "Carácter",
      note: "Nota del ojeador",
      similarity: (value) => `${format(value)} % de parecido`,
      footer: "Informe del ojeador de FMLibreEditor · los traspasos, salarios y probabilidades son estimaciones",
      traits: {
        consistent: "Regular",
        inconsistent: "Irregular",
        bigGames: "Jugador de grandes partidos",
        nervous: "Nervioso en los grandes partidos",
        injuryProne: "Propenso a las lesiones",
        robust: "Rara vez se lesiona",
        versatile: "Polivalente",
        professional: "Profesional ejemplar",
        ambitious: "Ambicioso",
        loyal: "Leal",
        hotHeaded: "Impulsivo",
      },
    },
    /** "Promoción de la cantera": the players the game made at a club's youth intakes, by the day they joined it, and their edits. */
    youth: {
      intro: "Los jugadores que el juego creó en las promociones de la cantera del club y que siguen en él, por el día en que llegaron.",
      otherClub: "Ver otro club",
      searchLabel: "Club que ver",
      mine: "Volver a mi club",
      intakesLabel: "Promociones de la cantera",
      /** A day nothing says. */
      noDay: "Día desconocido",
      /** `best` is a name and the potential in brackets. */
      summary: (count, average, best) =>
        `${count === 1 ? "1 jugador" : `${format(count)} jugadores`} · potencial medio ${average} · el mejor: ${best}`,
      lent: (count) => (count === 1 ? "1 cedido" : `${format(count)} cedidos`),
      how: {
        label: "¿Cómo se hace esta lista?",
        note: "Jugadores creados por el juego que llegaron a este club con 17 años o menos y no se formaron en ningún otro, por el día en que llegaron. Se incluyen los cedidos; los vendidos o dejados marchar, no.",
      },
      unmarked:
        "El editor no sabe cómo marca esta versión del juego a los jugadores que crea: también aparecen los jóvenes del propio club que vienen de la base de datos del juego.",
      empty: (club) => `${club} no tiene ahora jugadores de promociones de la cantera.`,
      emptyHint: "Los jugadores de una promoción aparecen aquí mientras estén en el club. Mira otro club para ver su cantera.",
      columns: {
        player: "Jugador",
        position: "Pos.",
        born: "Nacimiento",
        nation: "Nacionalidad",
        city: "Ciudad de nacimiento",
        ca: "HA",
        pa: "HP",
        actions: "Editar",
      },
      age: (age) => `${format(age)} años`,
      joinedAt: (age) => `llegó con ${format(age)}`,
      onLoan: (club) => `Cedido en ${club}`,
      youthContract: "Contrato juvenil",
      edit: (name) => `Editar a ${name}`,
      editor: {
        label: (name) => `Editando a ${name}`,
        reading: "Leyendo sus valores…",
        dateOfBirth: "Fecha de nacimiento",
        nation: "Nacionalidad",
        city: "Ciudad de nacimiento",
        /** The city select of a player without a city: the game keeps none for him, and the editor sets none. */
        noCity: "Ninguna en el juego",
        /** Above the cities of the nation picked: they are the ones people of the save were born in. */
        cityHint: "Ciudades donde nacieron personas de esta partida",
        ca: "Habilidad actual",
        pa: "Habilidad potencial",
        save: "Guardar",
        saving: "Guardando…",
        cancel: "Cancelar",
        profile: "Perfil completo",
        profileTitle: "Posiciones, atributos y el resto, en el perfil del jugador",
        nothing: "Nada que guardar: no se cambió ningún valor.",
        saved: (count) => (count === 1 ? "1 cambio guardado." : `${format(count)} cambios guardados.`),
        failed: (field, reason) => `${field}: ${reason}`,
        invalid: (field) => `${field}: no es un valor que pueda tomar.`,
      },
      loading: "Leyendo las promociones de la cantera…",
      failed: (reason) => `No se pudieron leer las promociones de la cantera: ${reason}`,
    },
    roles: {
      bgk: "Portero con juego de pies",
      ngk: "Portero sin complicaciones",
      sk: "Portero cierre",
      lhk: "Portero de línea de gol",
      cb: "Central",
      bcb: "Central con toque",
      ncb: "Central defensivo",
      acb: "Central avanzado",
      ocb: "Central con proyección ofensiva",
      scb: "Central contundente",
      ccb: "Central de cobertura",
      wcb: "Central lateral",
      fb: "Lateral",
      ifb: "Lateral por dentro",
      pfb: "Lateral presionante",
      hfb: "Lateral de contención",
      wb: "Lateral ofensivo",
      iwb: "Carrilero por dentro",
      pwb: "Lateral ofensivo creador",
      awb: "Lateral ofensivo avanzado",
      hwb: "Carrilero de contención",
      dm: "Mediocentro",
      hb: "Medio cierre",
      ddm: "Mediocentro retrasado",
      pdm: "Mediocentro defensivo presionante",
      wdm: "Mediocentro de amplia cobertura",
      bbm: "Centrocampista todoterreno",
      bbp: "Organizador todoterreno",
      dlp: "Pivote organizador",
      cm: "Centrocampista central",
      pcm: "Mediocampista presionante",
      scm: "Mediocampista de contención",
      chm: "Centrocampista interior",
      wcm: "Mediocampista de banda",
      ap: "Organizador adelantado",
      am: "Mediapunta",
      oam: "Mediapunta central iniciador",
      w: "Extremo",
      if: "Delantero por dentro",
      iw: "Extremo por dentro",
      pw: "Extremo organizador",
      wfd: "Delantero escorado",
      tw: "Extremo marcador",
      iow: "Extremo por dentro con salida",
      wow: "Extremo de salida",
      cfd: "Delantero centro",
      dlf: "Delantero de apoyo",
      chf: "Delantero buscaespacios",
      p: "Ariete",
      tcf: "Delantero centro marcador",
      ocf: "Delantero centro de enlace",
      gk: "Portero",
      wm: "Centrocampista de banda",
    },
    reasons: {
      listed: () => "En la lista de traspasos",
      freeAgent: () => "Agente libre",
      expiring: (value) => `Su contrato termina en ${value} días`,
      releaseClause: (value) => `Cláusula de rescisión de ${value}`,
      fringe: () => "No es habitual en su club",
      keyPlayer: () => "Jugador clave de su club",
      unwanted: () => "No entra en los planes de su club",
      overBudget: (value) => `${value} por encima de tu presupuesto`,
      stretch: (value) => `Algo por encima del presupuesto (+${value})`,
      wageHigh: (value) => `Su salario supera tu margen en ${value}/sem`,
      biggerClub: () => "Juega en un club más grande",
      smallerClub: () => "Juega en un club más pequeño",
      reputationGap: () => "Un nombre demasiado grande para tu club",
      ambitious: () => "Ambicioso: agradecería el salto",
      notForSale: () => "No está en venta",
    },
    departureReasons: {
      surplus: (value) => `Línea saturada (${value} jugadores)`,
      belowLevel: () => "Por debajo del nivel de la plantilla",
      ageing: (value) => `Se hace mayor (${value})`,
      expiring: (value) => `Su contrato termina en ${value} días`,
      highWage: (value) => `Salario alto para su papel (${value}/sem)`,
      unhappy: () => "Descontento",
      lowMorale: () => "Moral baja",
      blocked: () => "Necesita minutos para crecer",
      unwanted: () => "Estatus: no entra en los planes",
      listed: () => "Ya está en la lista de traspasos",
    },
  },

  /** Recipes (`RecipeMenu`): see `en.ts`. */
  recipes: {
    button: "Recetas",
    buttonTitle: "Conjuntos de cambios ya preparados, con vista previa",
    names: {
      wonderkid: "Convertir en promesa",
      injuryProof: "A prueba de lesiones",
      longCareer: "Alargar su carrera",
      richClub: "Hacer rico al club",
      topFacilities: "Instalaciones al máximo",
    },
    notes: {
      wonderkid:
        "Hasta 21 años: habilidad potencial de 180 como mínimo, habilidad y atributos acordes a su edad. Los " +
        "valores más altos se quedan.",
      injuryProof:
        "Propensión a lesiones a 1, recuperación física a 20, resistencia a 15 como mínimo, lesiones curadas.",
      longCareer:
        "Sin retirada prevista, contrato de al menos tres años más, recuperación física a 20, profesionalidad a 18 " +
        "como mínimo.",
      richClub: "Saldo, presupuesto de fichajes y presupuestos salariales al nivel de los clubes más ricos.",
      topFacilities: "Las cinco instalaciones a 20.",
    },
    tooOld: (oldest: number) => `Para jugadores de ${oldest} años o menos`,
    command: (recipe: string) => `Receta: ${recipe}`,
    working: "Calculando los cambios…",
    summary: (changes: number, kept: number, left: number) =>
      [
        changeCount(changes),
        kept > 0 && (kept === 1 ? "1 valor ya es igual de bueno" : `${format(kept)} valores ya son igual de buenos`),
        left > 0 && valuesLeftAlone(left),
      ]
        .filter(Boolean)
        .join(" · "),
    tableLabel: "Cambios que haría la receta",
    keptHeading: (count: number) =>
      count === 1
        ? "1 valor se queda como está: ya es igual de bueno"
        : `${format(count)} valores se quedan como están: ya son igual de buenos`,
    keptLabel: "Valores que ya son igual de buenos",
    valueColumn: "Valor",
    leftLabel: "Lo que la receta deja sin tocar",
    undo: "Deshacer esta receta",
    undoTitle: "Volver a escribir en el juego todo lo que cambió esta receta",
  },

  /** A player's development: the Development tab of his profile, the note under his abilities, the squad's arrows (see en.ts). */
  progress: {
    tabsLabel: "Secciones del perfil del jugador",
    tabs: { overview: "Perfil", progress: "Progresión" },
    lockedWhileEdited: "Termina de editar para abrir esta pestaña",
    openTab: "Abrir la pestaña Progresión",
    loading: "Leyendo los registros…",
    failed: (reason: string) => `No se pudieron leer los registros: ${reason}`,
    since: (date: string) => `desde el ${date}`,
    change: (from: string, to: string, date: string) => `${from} → ${to} desde el ${date}`,
    rangeLabel: "Periodo",
    ranges: { quarter: "3 meses", year: "1 año", all: "Todo" },
    recorded: (count: number, first: string) => `Registros: ${count} · el primero, el ${first}`,
    abilityTitle: "Habilidad",
    valueTitle: "Valor",
    attributesTitle: "Atributos que han cambiado",
    noAttributeChanges: (date: string) => `Ningún atributo ha cambiado desde el ${date}.`,
    emptyTitle: "Todavía no hay con qué comparar",
    emptyText:
      "La aplicación anota las habilidades, el valor y los atributos de todos los jugadores más o menos una vez por semana del juego, cada vez que lee los datos del juego. Sigue jugando, vuelve a leer los datos y aquí verás cómo progresa este jugador.",
    offTitle: "No hay registros para esta partida",
    offText:
      "La aplicación guarda registros en las partidas en las que controlas a un entrenador y en las versiones del juego cuyos datos superan sus comprobaciones.",
  },

  /** The command palette and the names of the keys in the keyboard shortcuts (see en.ts). */
  palette: {
    button: "Buscar",
    title: "Buscar o ejecutar un comando",
    placeholder: "Buscar jugadores, personal, clubes y comandos",
    placeholderCommands: "Buscar comandos",
    commands: "Comandos",
    goTo: (list: string) => `Ir a ${list}`,
    searchList: "Buscar en esta lista",
    editProfile: "Editar este perfil",
    doneEditing: "Terminar de editar este perfil",
    applyChanges: "Aplicar los cambios de este perfil",
    showAll: (count: number, list: string) => `Ver los ${format(count)} resultados en ${list}`,
    searching: "Buscando…",
    empty: (query: string) => `Nada coincide con «${query}».`,
    notConnected: "Conéctate al juego para buscar sus jugadores, su personal y sus clubes.",
    failed: (reason: string) => `La búsqueda ha fallado: ${reason}`,
    hintMove: "Moverse",
    hintOpen: "Abrir",
    hintClose: "Cerrar",
    keys: { ctrl: "Ctrl", shift: "Mayús", enter: "Intro", escape: "Esc" },
  },

  /** "My club", the page the app opens on (see en.ts). */
  home: {
    nav: "Mi club",
    loading: "Buscando tu club…",
    failed: (reason: string) => `No se ha podido buscar tu club: ${reason}`,
    manager: (name: string) => `Mánager: ${name}`,
    following: "Un club que sigues",
    clubsLabel: "Tus clubes",
    openProfile: "Perfil del club",
    openProfileTitle: "Abrir este club en la pestaña Clubes: instalaciones, finanzas, estadio y más",
    noClubTitle: "No diriges ningún club en esta partida",
    noClubText:
      "Elige un club para seguirlo aquí: su plantilla, quién necesita atención y las acciones sobre todo el equipo.",
    chooseAnother: "Elegir otro club",
    searchLabel: "Club que seguir",
    squad: "Plantilla",
    cards: {
      label: "Quién necesita atención",
      lowMorale: "Moral baja",
      tired: "Cansados",
      contracts: "Contratos que terminan",
      injuredHint: "Jugadores con una lesión",
      bannedHint: "Jugadores con una sanción",
      lowMoraleHint: (below: string) => `Jugadores con la moral por debajo de ${below}`,
      tiredHint: (below: string) => `Jugadores con la energía por debajo de ${below}`,
      unrestHint: "Jugadores con los que algunos compañeros están descontentos",
      contractsHint: (months: number) => `Jugadores cuyo contrato termina en menos de ${months} meses`,
      none: "Ninguno",
      more: (count: number) => `y ${format(count)} más`,
    },
  },

  /** What's new: what a version brings (see en.ts). */
  whatsNew: {
    title: (version: string) => `Novedades de la versión ${version}`,
    updated: "FMLibreEditor se ha actualizado.",
    version: (version: string) => `Versión ${version}`,
    thanks: (names: string) => `Gracias a ${names}.`,
    allChanges: "Todos los cambios",
    allChangesTitle: "Abrir en GitHub las notas completas de esta versión",
    close: "Entendido",
    link: "Novedades",
    command: "Novedades de esta versión",
    versions: {
      "0.5.5": [
        {
          title: "FM 27.1.1.",
          text: "La actualización del 24 de noviembre ya se reconoce en Game Pass, Steam y Mac, y todo funciona en ella como antes. Cuando salga una actualización futura, la aplicación seguirá leyendo las finanzas de los clubes y la táctica en uso hasta que llegue una versión que la conozca.",
        },
        {
          title: "Pestaña Competiciones.",
          text: "Consulta y cambia las normas de plantilla de cada competición, como cuántos jugadores extranjeros puede inscribir una plantilla, para esta temporada y la siguiente por separado. En Windows y en Mac con Apple silicon.",
        },
        {
          title: "Cesiones.",
          text: "La nueva opción Cesión del diálogo Traspaso prepara una cesión para el día siguiente del juego, dentro o fuera de un periodo de traspasos. Tú eliges su último día, la parte del sueldo que paga el otro club, una cuota mensual y, si quieres, una opción de compra. En Windows y en Mac con Apple silicon.",
        },
        {
          title: "Recetas.",
          text: "Conjuntos de cambios listos para un jugador o un club: Convertir en promesa, A prueba de lesiones, Alargar su carrera, Hacer rico al club e Instalaciones al máximo. Cada una muestra lo que cambiará antes de escribir nada, y un solo Deshacer la revierte.",
        },
        {
          title: "Progresión.",
          text: "La aplicación guarda un registro semanal de cada jugador cuando lee el juego, y el perfil del jugador lo muestra en la nueva pestaña Progresión: su habilidad, potencial, valor y atributos a lo largo de tu carrera.",
        },
        {
          title: "Filiales.",
          text: "La pestaña Plantilla de un club muestra sus filiales después de sus propios equipos, como el Castilla del Real Madrid, y las acciones de equipo también funcionan en ellos.",
        },
        {
          title: "Notas más cortas.",
          text: "Las notas de los botones ocupan una línea cada una, en un recuadro pequeño en lugar de una franja larga que cruza la ventana.",
        },
      ],
      "0.5.4": [
        {
          title: "Traspasos en el historial del jugador.",
          text: "Traspaso, ahora la primera opción al mover a un jugador, deja el traspaso preparado para el día siguiente del juego. El juego lo hace como uno de los suyos: paga el importe y anota el traspaso en el historial de su carrera, con los partidos de esta temporada en su antiguo club en una fila aparte. Mover ahora sigue moviéndolo al instante.",
        },
        {
          title: "Equipo al máximo, y por los suelos.",
          text: "En la pestaña Plantilla de un club, un solo clic cura, motiva y recupera a todo el equipo y lleva su cohesión y su táctica al máximo; Equipo por los suelos, tras una pregunta, hace lo contrario. Un solo Deshacer revierte cualquiera de los dos, y las acciones sueltas están en Más acciones.",
        },
        {
          title: "Características del lote.",
          text: "En la pestaña Plantilla de un club, dentro de Más acciones, Características del lote da a todos los jugadores del equipo las características que elijas, o se las quita, y deja las demás como están. Un solo Deshacer lo revierte.",
        },
        {
          title: "Traspasar a todo el personal.",
          text: "La pestaña Personal de un club traspasa a todo su personal a otro club de una vez, cada uno en el mismo puesto, y un solo Deshacer los trae a todos de vuelta.",
        },
        {
          title: "Selecciones.",
          text: "La plantilla absoluta de una selección tiene Curar a todos, Motivar a todos y Recuperar a todos, y su tabla muestra la energía, el ritmo de competición y la moral.",
        },
        {
          title: "Patrocinios.",
          text: "Las finanzas de un club muestran sus patrocinios, solo para consultar: lo que paga cada uno por temporada y en total, su duración y lo que cambia con un descenso. Por ahora en Game Pass 0.9.2524.0.",
        },
        {
          title: "Corrección.",
          text: "En algunas partidas la comprobación del personal fallaba aunque el personal se leía bien, lo que lo dejaba en solo lectura e impedía curar, Máxima cohesión y Táctica al máximo. Ahora pasa.",
        },
      ],
      "0.5.3": [
        {
          title: "La actualización de FM27 del 17 de noviembre.",
          text: "En Windows y macOS, Game Pass 0.9.2524.0 y la build 26620374 de Steam son versiones conocidas, y las finanzas de los clubes y la táctica de tu equipo se vuelven a leer donde la actualización las movió.",
        },
        {
          title: "Selecciones.",
          text: "El selector sobre la lista de clubes muestra las selecciones masculinas y femeninas de cada país: la plantilla de una selección, sus categorías inferiores (Sub-21, Sub-20 y las demás) con las suyas, y la reputación de cada una, que puedes editar.",
        },
        {
          title: "Premios de la liga.",
          text: "La vista general de un club muestra lo que paga su liga esta temporada, por posición final y por partido, y los importes se pueden cambiar para todos los clubes de la liga hasta que acabe la temporada.",
        },
        {
          title: "Corrección.",
          text: "Una partida cuyos juveniles nacieron después de 2020 ya no falla la comprobación que hace el editor antes de escribir.",
        },
      ],
      "0.5.2": [
        {
          title: "Mi club.",
          text: "La aplicación se abre con el club que diriges: a quién hay que mirar, su dinero y las acciones de la plantilla, todo en un sitio. Si no tienes club propio, puedes seguir uno.",
        },
        {
          title: "Paleta de comandos.",
          text: "Ctrl+K (⌘K en Mac) encuentra un jugador, un miembro del personal, un club o un comando, y con los atajos te mueves entre las pestañas.",
        },
        {
          title: "Ojeo.",
          text: "Oportunidades en el mercado, jugadores parecidos a uno que dejarías marchar, una comparación con tu n.º 1 en su posición, informes de ojeadores para guardar como imagen o PDF, la plantilla sobre el campo y las promociones de la cantera.",
        },
        {
          title: "Renombrar a un jugador.",
          text: "Nombre, apellido, nombre común y nombre completo. El juego conserva el nuevo nombre en sus partidas.",
        },
        {
          title: "Contratos y personal.",
          text: "Amplía un contrato cinco años con un clic, o suma años a muchos con una edición masiva. Rescinde a un miembro del personal, o a todo el personal de un club, y recupéralos con un solo Deshacer.",
        },
        {
          title: "Táctica al máximo.",
          text: "En la pestaña Plantilla de un club, sube la familiaridad táctica del equipo al máximo. Los motivos de descontento ahora se expresan como los expresa el juego.",
        },
        {
          title: "Tus cambios se conservan.",
          text: "Los cambios de cada carrera siguen en la pestaña Cambios tras reiniciar, y puedes buscarlos, filtrarlos y exportarlos.",
        },
        {
          title: "Filtros de clubes.",
          text: "País, liga y reputación. Edición masiva y Exportar toman los clubes que muestra la lista.",
        },
        {
          title: "Ruso y japonés.",
          text: "Dos idiomas más. La actualización de Steam del 12 de noviembre también es ya una versión conocida.",
        },
      ],
    } as Record<string, { title: string; text: string }[]>,
  },

  errors,
};
