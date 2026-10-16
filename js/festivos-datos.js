/*
 * Festivos oficiales nacionales y autonómicos de España.
 *
 * Tipos: N = nacional (art. 37.2 ET y art. 45 RD 2001/1983, incluidas las fiestas
 * nacionales sustituibles que la comunidad mantiene), A = autonómico (o insular),
 * L = local. El cuarto valor, si existe, es la fecha original de un festivo que
 * la comunidad traslada oficialmente (normalmente de domingo a lunes).
 *
 * 2024-2026: generado con herramientas/generar_festivos.py a partir de la librería
 * python-holidays 0.106, cuyos datos de España están comprobados con las
 * resoluciones anuales del BOE. 2027: transcrito de los decretos autonómicos
 * publicados y contrastado con la información difundida sobre el BOE-A-2026-21254
 * (BOE de 13/10/2026); pendiente de cotejo directo con el texto del BOE.
 *
 * No se inventan festivos: si un año o territorio no está aquí, la aplicación
 * avisa y permite introducirlos a mano o importarlos.
 */
(function (raiz) {
  'use strict';

  var BOE = 'https://www.boe.es/diario_boe/txt.php?id=';

  var fuentes = {
    2024: { ref: 'BOE-A-2023-22014', url: BOE + 'BOE-A-2023-22014', titulo: 'Resolución de 23 de octubre de 2023, de la Dirección General de Trabajo (fiestas laborales 2024)', estado: 'verificado' },
    2025: { ref: 'BOE-A-2024-21316', url: BOE + 'BOE-A-2024-21316', titulo: 'Resolución de 11 de octubre de 2024, de la Dirección General de Trabajo (fiestas laborales 2025)', estado: 'verificado' },
    2026: { ref: 'BOE-A-2025-21667', url: BOE + 'BOE-A-2025-21667', titulo: 'Resolución de 17 de octubre de 2025, de la Dirección General de Trabajo (fiestas laborales 2026)', estado: 'verificado' },
    2027: { ref: 'BOE-A-2026-21254', url: BOE + 'BOE-A-2026-21254', titulo: 'Resolución de 8 de octubre de 2026, de la Dirección General de Trabajo (fiestas laborales 2027), BOE de 13/10/2026', estado: 'contrastado' }
  };

  var datos = {
  2024: {
    AN: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-02-28", "Día de Andalucía", "A"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-09", "Lunes siguiente a Inmaculada Concepción", "N", "2024-12-08"], ["2024-12-25", "Natividad del Señor", "N"]],
    AR: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-23", "Día de San Jorge", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-09", "Lunes siguiente a Inmaculada Concepción", "N", "2024-12-08"], ["2024-12-25", "Natividad del Señor", "N"]],
    AS: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-09-09", "Lunes siguiente a Día de Asturias", "A", "2024-09-08"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-09", "Lunes siguiente a Inmaculada Concepción", "N", "2024-12-08"], ["2024-12-25", "Natividad del Señor", "N"]],
    CB: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-01", "Lunes de Pascua", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-07-25", "Santiago Apóstol", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
    CE: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-10", "Fiesta de Culminación del Ramadán-Eidul Fitr", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-06-13", "San Antonio", "A"], ["2024-06-17", "Fiesta del Sacrificio-Eidul Adha", "A"], ["2024-08-05", "Nuestra Señora de África", "A"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-09-02", "Día de Ceuta", "A"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
    CL: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-23", "Fiesta de Castilla y León", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-09", "Lunes siguiente a Inmaculada Concepción", "N", "2024-12-08"], ["2024-12-25", "Natividad del Señor", "N"]],
    CM: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-05-30", "Corpus Christi", "A"], ["2024-05-31", "Día de Castilla-La Mancha", "A"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
    CN: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-05-30", "Día de Canarias", "A"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
    CT: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-01", "Lunes de Pascua", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-06-24", "San Juan", "A"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-09-11", "Fiesta Nacional de Cataluña", "A"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"], ["2024-12-26", "San Esteban", "A"]],
    EX: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-02-13", "Martes de Carnaval", "A"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-09", "Lunes siguiente a Inmaculada Concepción", "N", "2024-12-08"], ["2024-12-25", "Natividad del Señor", "N"]],
    GA: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-05-17", "Día de las Letras Gallegas", "A"], ["2024-07-25", "Día Nacional de Galicia", "A"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
    IB: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-01", "Día de las Islas Baleares", "A"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-01", "Lunes de Pascua", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
    MC: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-19", "San José", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-09", "Lunes siguiente a Inmaculada Concepción", "N", "2024-12-08"], ["2024-12-25", "Natividad del Señor", "N"]],
    MD: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-05-02", "Fiesta de la Comunidad de Madrid", "A"], ["2024-07-25", "Santiago Apóstol", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
    ML: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-10", "Fiesta del Eid Fitr", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-06-17", "Fiesta del Sacrificio-Aid Al Adha", "A"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-09-17", "Día de Melilla", "L"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-09", "Lunes siguiente a Inmaculada Concepción", "N", "2024-12-08"], ["2024-12-25", "Natividad del Señor", "N"]],
    NC: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-01", "Lunes de Pascua", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-07-25", "Santiago Apóstol", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-03", "San Francisco Javier", "L"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
    PV: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-01", "Lunes de Pascua", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-07-25", "Santiago Apóstol", "N"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
    RI: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-28", "Jueves Santo", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-01", "Lunes de Pascua", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-06-10", "Lunes siguiente a Día de La Rioja", "A", "2024-06-09"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
    VC: [["2024-01-01", "Año Nuevo", "N"], ["2024-01-06", "Epifanía del Señor", "N"], ["2024-03-19", "San José", "N"], ["2024-03-29", "Viernes Santo", "N"], ["2024-04-01", "Lunes de Pascua", "A"], ["2024-05-01", "Fiesta del Trabajo", "N"], ["2024-06-24", "San Juan", "A"], ["2024-08-15", "Asunción de la Virgen", "N"], ["2024-10-09", "Día de la Comunidad Valenciana", "A"], ["2024-10-12", "Fiesta Nacional de España", "N"], ["2024-11-01", "Todos los Santos", "N"], ["2024-12-06", "Día de la Constitución Española", "N"], ["2024-12-25", "Natividad del Señor", "N"]],
  },
  2025: {
    AN: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-02-28", "Día de Andalucía", "A"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-10-13", "Lunes siguiente a Fiesta Nacional de España", "N", "2025-10-12"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    AR: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-04-23", "Día de San Jorge", "A"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-10-13", "Lunes siguiente a Fiesta Nacional de España", "N", "2025-10-12"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    AS: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-09-08", "Día de Asturias", "A"], ["2025-10-13", "Lunes siguiente a Fiesta Nacional de España", "N", "2025-10-12"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    CB: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-07-28", "Día de las Instituciones de Cantabria", "A"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-09-15", "La Bien Aparecida", "A"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    CE: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-03-31", "Fiesta de Culminación del Ramadán-Eidul Fitr", "A"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-06-06", "Fiesta del Sacrificio-Eidul Adha", "A"], ["2025-06-13", "San Antonio", "A"], ["2025-08-05", "Nuestra Señora de África", "A"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    CL: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-04-23", "Fiesta de Castilla y León", "A"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-10-13", "Lunes siguiente a Fiesta Nacional de España", "N", "2025-10-12"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    CM: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-05-31", "Día de Castilla-La Mancha", "A"], ["2025-06-19", "Corpus Christi", "A"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    CN: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-05-30", "Día de Canarias", "A"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    CT: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-04-21", "Lunes de Pascua", "A"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-06-24", "San Juan", "A"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-09-11", "Fiesta Nacional de Cataluña", "A"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"], ["2025-12-26", "San Esteban", "A"]],
    EX: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-09-08", "Día de Extremadura", "A"], ["2025-10-13", "Lunes siguiente a Fiesta Nacional de España", "N", "2025-10-12"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    GA: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-05-17", "Día de las Letras Gallegas", "A"], ["2025-07-25", "Día Nacional de Galicia", "A"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    IB: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-03-01", "Día de las Islas Baleares", "A"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"], ["2025-12-26", "San Esteban", "A"]],
    MC: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-03-19", "San José", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-06-09", "Día de la Región de Murcia", "A"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    MD: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-05-02", "Fiesta de la Comunidad de Madrid", "A"], ["2025-07-25", "Santiago Apóstol", "N"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    ML: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-03-31", "Fiesta del Eid Fitr", "A"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-06-06", "Fiesta del Sacrificio-Aid Al Adha", "A"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-09-08", "Día de Nuestra Señora la Virgen de la Victoria", "L"], ["2025-09-17", "Día de Melilla", "L"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    NC: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-04-21", "Lunes de Pascua", "A"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-07-25", "Santiago Apóstol", "N"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-03", "San Francisco Javier", "L"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    PV: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-04-21", "Lunes de Pascua", "A"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-07-25", "Santiago Apóstol", "N"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    RI: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-04-17", "Jueves Santo", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-04-21", "Lunes de Pascua", "A"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-06-09", "Día de La Rioja", "A"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
    VC: [["2025-01-01", "Año Nuevo", "N"], ["2025-01-06", "Epifanía del Señor", "N"], ["2025-03-19", "San José", "N"], ["2025-04-18", "Viernes Santo", "N"], ["2025-04-21", "Lunes de Pascua", "A"], ["2025-05-01", "Fiesta del Trabajo", "N"], ["2025-06-24", "San Juan", "A"], ["2025-08-15", "Asunción de la Virgen", "N"], ["2025-10-09", "Día de la Comunidad Valenciana", "A"], ["2025-11-01", "Todos los Santos", "N"], ["2025-12-06", "Día de la Constitución Española", "N"], ["2025-12-08", "Inmaculada Concepción", "N"], ["2025-12-25", "Natividad del Señor", "N"]],
  },
  2026: {
    AN: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-02-28", "Día de Andalucía", "A"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-11-02", "Lunes siguiente a Todos los Santos", "N", "2026-11-01"], ["2026-12-07", "Lunes siguiente a Día de la Constitución Española", "N", "2026-12-06"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    AR: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-04-23", "Día de San Jorge", "A"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-11-02", "Lunes siguiente a Todos los Santos", "N", "2026-11-01"], ["2026-12-07", "Lunes siguiente a Día de la Constitución Española", "N", "2026-12-06"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    AS: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-09-08", "Día de Asturias", "A"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-11-02", "Lunes siguiente a Todos los Santos", "N", "2026-11-01"], ["2026-12-07", "Lunes siguiente a Día de la Constitución Española", "N", "2026-12-06"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    CB: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-07-28", "Día de las Instituciones de Cantabria", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-09-15", "La Bien Aparecida", "A"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-12-07", "Lunes siguiente a Día de la Constitución Española", "N", "2026-12-06"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    CE: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-03-20", "Fiesta de Culminación del Ramadán-Eidul Fitr", "A"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-05-27", "Fiesta del Sacrificio-Eidul Adha", "A"], ["2026-06-13", "San Antonio", "A"], ["2026-08-05", "Nuestra Señora de África", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-09-02", "Día de Ceuta", "A"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    CL: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-04-23", "Fiesta de Castilla y León", "A"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-11-02", "Lunes siguiente a Todos los Santos", "N", "2026-11-01"], ["2026-12-07", "Lunes siguiente a Día de la Constitución Española", "N", "2026-12-06"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    CM: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-04-06", "Lunes de Pascua", "A"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-06-04", "Corpus Christi", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-11-02", "Lunes siguiente a Todos los Santos", "N", "2026-11-01"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    CN: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-05-30", "Día de Canarias", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-11-02", "Lunes siguiente a Todos los Santos", "N", "2026-11-01"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    CT: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-04-06", "Lunes de Pascua", "A"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-06-24", "San Juan", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-09-11", "Fiesta Nacional de Cataluña", "A"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"], ["2026-12-26", "San Esteban", "A"]],
    EX: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-09-08", "Día de Extremadura", "A"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-11-02", "Lunes siguiente a Todos los Santos", "N", "2026-11-01"], ["2026-12-07", "Lunes siguiente a Día de la Constitución Española", "N", "2026-12-06"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    GA: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-03-19", "San José", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-06-24", "San Juan", "A"], ["2026-07-25", "Día Nacional de Galicia", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    IB: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-03-02", "Lunes siguiente a Día de las Islas Baleares", "A", "2026-03-01"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-04-06", "Lunes de Pascua", "A"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"], ["2026-12-26", "San Esteban", "A"]],
    MC: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-03-19", "San José", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-06-09", "Día de la Región de Murcia", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-12-07", "Lunes siguiente a Día de la Constitución Española", "N", "2026-12-06"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    MD: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-05-02", "Fiesta de la Comunidad de Madrid", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-11-02", "Lunes siguiente a Todos los Santos", "N", "2026-11-01"], ["2026-12-07", "Lunes siguiente a Día de la Constitución Española", "N", "2026-12-06"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    ML: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-03-20", "Fiesta del Eid Fitr", "A"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-05-27", "Fiesta del Sacrificio-Aid Al Adha", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-09-08", "Día de Nuestra Señora la Virgen de la Victoria", "L"], ["2026-09-17", "Día de Melilla", "L"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-12-07", "Lunes siguiente a Día de la Constitución Española", "N", "2026-12-06"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    NC: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-03-19", "San José", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-04-06", "Lunes de Pascua", "A"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-11-02", "Lunes siguiente a Todos los Santos", "N", "2026-11-01"], ["2026-12-03", "San Francisco Javier", "L"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    PV: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-03-19", "San José", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-04-06", "Lunes de Pascua", "A"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-07-25", "Santiago Apóstol", "N"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    RI: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-04-02", "Jueves Santo", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-04-06", "Lunes de Pascua", "A"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-06-09", "Día de La Rioja", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-12-07", "Lunes siguiente a Día de la Constitución Española", "N", "2026-12-06"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
    VC: [["2026-01-01", "Año Nuevo", "N"], ["2026-01-06", "Epifanía del Señor", "N"], ["2026-03-19", "San José", "N"], ["2026-04-03", "Viernes Santo", "N"], ["2026-04-06", "Lunes de Pascua", "A"], ["2026-05-01", "Fiesta del Trabajo", "N"], ["2026-06-24", "San Juan", "A"], ["2026-08-15", "Asunción de la Virgen", "N"], ["2026-10-09", "Día de la Comunidad Valenciana", "A"], ["2026-10-12", "Fiesta Nacional de España", "N"], ["2026-12-08", "Inmaculada Concepción", "N"], ["2026-12-25", "Natividad del Señor", "N"]],
  },
  };

  // 2027: festivos comunes a toda España según la resolución del BOE.
  var C27 = [
    ['2027-01-01', 'Año Nuevo', 'N'], ['2027-01-06', 'Epifanía del Señor', 'N'],
    ['2027-03-26', 'Viernes Santo', 'N'], ['2027-05-01', 'Fiesta del Trabajo', 'N'],
    ['2027-10-12', 'Fiesta Nacional de España', 'N'], ['2027-11-01', 'Todos los Santos', 'N'],
    ['2027-12-06', 'Día de la Constitución Española', 'N'], ['2027-12-08', 'Inmaculada Concepción', 'N'],
    ['2027-12-25', 'Natividad del Señor', 'N']
  ];
  var JS27 = ['2027-03-25', 'Jueves Santo', 'N'];
  var SJ27 = ['2027-03-19', 'San José', 'N'];
  var LP27 = ['2027-03-29', 'Lunes de Pascua', 'A'];
  var AG27 = ['2027-08-16', 'Lunes siguiente a Asunción de la Virgen', 'N', '2027-08-15'];
  function con27(extra) {
    return C27.concat(extra).sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  }
  datos[2027] = {
    AN: con27([['2027-03-01', 'Lunes siguiente a Día de Andalucía', 'A', '2027-02-28'], JS27, AG27]),
    AR: con27([JS27, ['2027-04-23', 'Día de San Jorge', 'A'], AG27]),
    AS: con27([JS27, AG27, ['2027-09-08', 'Día de Asturias', 'A']]),
    CB: con27([JS27, ['2027-07-28', 'Día de las Instituciones de Cantabria', 'A'], ['2027-09-15', 'La Bien Aparecida', 'A']]),
    CE: con27([JS27]),
    CL: con27([JS27, ['2027-04-23', 'Fiesta de Castilla y León', 'A'], AG27]),
    CM: con27([JS27, ['2027-05-27', 'Corpus Christi', 'A'], ['2027-05-31', 'Día de Castilla-La Mancha', 'A']]),
    CN: con27([JS27, ['2027-05-30', 'Día de Canarias', 'A'], AG27]),
    CT: con27([LP27, ['2027-06-24', 'San Juan', 'A'], ['2027-09-11', 'Fiesta Nacional de Cataluña', 'A']]),
    EX: con27([JS27, ['2027-08-15', 'Asunción de la Virgen', 'N'], ['2027-09-08', 'Día de Extremadura', 'A']]),
    GA: con27([SJ27, JS27, ['2027-05-17', 'Día de las Letras Gallegas', 'A']]),
    IB: con27([['2027-03-01', 'Día de las Islas Baleares', 'A'], JS27, LP27]),
    MC: con27([SJ27, JS27, ['2027-06-09', 'Día de la Región de Murcia', 'A']]),
    MD: con27([SJ27, JS27, AG27]),
    ML: con27([JS27]),
    NC: con27([SJ27, JS27, LP27, ['2027-12-03', 'San Francisco Javier', 'L']]),
    PV: con27([JS27, LP27, ['2027-10-07', 'Aniversario del primer Gobierno Vasco', 'A']]),
    RI: con27([JS27, LP27, ['2027-06-09', 'Día de La Rioja', 'A']]),
    VC: con27([SJ27, LP27, ['2027-10-09', 'Día de la Comunidad Valenciana', 'A']])
  };

  // Estado por territorio cuando difiere del estado general del año.
  // verificado: comprobado con la fuente oficial; contrastado: lista completa en la
  // norma autonómica y coherente con la información del BOE; provisional: hay
  // dudas concretas; incompleto: solo festivos comunes.
  var estados = {
    2027: {
      AN: 'contrastado', AR: 'contrastado', AS: 'contrastado', CB: 'contrastado', CL: 'contrastado',
      CM: 'contrastado', CT: 'contrastado', GA: 'contrastado', IB: 'contrastado', MC: 'contrastado',
      MD: 'contrastado', NC: 'contrastado', PV: 'contrastado', RI: 'contrastado', VC: 'contrastado',
      CN: 'provisional', EX: 'provisional', CE: 'incompleto', ML: 'incompleto'
    }
  };

  // Norma autonómica de referencia (2027).
  var normas = {
    2027: {
      AN: 'Decreto 84/2026, de 29 de abril (BOJA de 5/05/2026)',
      AR: 'Decreto 163/2026, de 9 de septiembre (BOA de 18/09/2026)',
      AS: 'Decreto 7/2026, de 16 de febrero (BOPA de 26/02/2026)',
      CB: 'Orden IND/29/2026, de 6 de julio (BOC de 15/07/2026)',
      CL: 'Decreto 7/2026, de 26 de marzo (BOCYL de 30/03/2026)',
      CM: 'Decreto 34/2026, de 23 de junio (DOCM de 13/07/2026)',
      CN: 'Decreto 115/2026, de 29 de junio (BOC de 3/07/2026)',
      CT: 'Ordre EMT/52/2026, de 25 de març (DOGC)',
      EX: 'Decreto 119/2026, de 2 de junio (DOE de 8/06/2026)',
      GA: 'Decreto 68/2026, de 15 de junio (DOG de 2/07/2026)',
      IB: 'Calendario laboral general y local 2027 (BOIB de 29/09/2026)',
      MC: 'Acuerdo del Consejo de Gobierno de 9/04/2026 (BORM)',
      MD: 'Decreto 82/2026, de 30 de septiembre (BOCM de 1/10/2026)',
      NC: 'Resolución 232/2026, de 13 de mayo (BON de 28/05/2026)',
      PV: 'Decreto 90/2026, de 9 de junio (BOPV de 16/07/2026)',
      RI: 'Resolución 186/2026, de 30 de abril (BOR)',
      VC: 'Decreto 42/2026 (DOGV de 25/03/2026)'
    }
  };

  // Notas por territorio (todas las fechas) y por año.
  var notas = {
    todos: {
      CE: 'Ceuta es un municipio único: este listado ya incluye sus fiestas locales.',
      ML: 'Melilla es un municipio único: el 8 y el 17 de septiembre son sus dos fiestas locales.',
      NC: 'El 3 de diciembre (San Francisco Javier, Día de Navarra) es fiesta local en todos los municipios navarros; cada ayuntamiento fija la otra.',
      CN: 'Además, cada isla tiene su fiesta insular: elige tu isla en Configuración.',
      CT: 'En la Val d\'Aran, la Festa d\'Aran (17 de junio) sustituye a otro festivo según la orden anual: añádela a mano si trabajas allí.'
    },
    2027: {
      CN: 'Provisional: la fiesta insular de 2027 solo está comprobada para Tenerife, La Palma y Gran Canaria. El Día de Canarias (30 de mayo) cae en domingo.',
      EX: 'Provisional: el 15 de agosto cae en domingo y no se ha podido confirmar si el decreto traslada su descanso. Revísalo en el DOE.',
      CE: 'Incompleto: solo se incluyen los festivos comunes y el Jueves Santo. El calendario propio de Ceuta para 2027 no se ha podido verificar; añade el resto a mano.',
      ML: 'Incompleto: solo se incluyen los festivos comunes y el Jueves Santo. El calendario propio de Melilla para 2027 no se ha podido verificar; añade el resto a mano.'
    }
  };

  // Fiestas insulares de Canarias (forman parte del calendario autonómico de cada isla).
  var insulares = {
    2026: {
      'El Hierro': ['2026-09-24', 'Nuestra Señora de los Reyes'],
      'Fuerteventura': ['2026-09-18', 'Nuestra Señora de la Peña'],
      'Gran Canaria': ['2026-09-08', 'Nuestra Señora del Pino'],
      'La Gomera': ['2026-10-05', 'Nuestra Señora de Guadalupe'],
      'La Palma': ['2026-08-05', 'Nuestra Señora de las Nieves'],
      'Lanzarote y La Graciosa': ['2026-09-15', 'Nuestra Señora de los Volcanes'],
      'Tenerife': ['2026-02-02', 'Virgen de la Candelaria']
    },
    2027: {
      'Gran Canaria': ['2027-09-08', 'Nuestra Señora del Pino'],
      'La Palma': ['2027-08-05', 'Nuestra Señora de las Nieves'],
      'Tenerife': ['2027-02-02', 'Virgen de la Candelaria']
    }
  };
  var islas = ['El Hierro', 'Fuerteventura', 'Gran Canaria', 'La Gomera', 'La Palma', 'Lanzarote y La Graciosa', 'Tenerife'];

  // Festivos locales verificados por municipio: { año: { 'CCAA|municipio': [[fecha, nombre], ...] } }.
  // Se completan solo con datos comprobados en el boletín oficial correspondiente.
  var locales = {};

  var api = {
    version: '2026-10-13',
    fuentes: fuentes,
    datos: datos,
    estados: estados,
    normas: normas,
    notas: notas,
    insulares: insulares,
    islas: islas,
    locales: locales
  };
  raiz.FestivosOficiales = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
