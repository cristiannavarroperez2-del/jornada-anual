/*
 * Motor de cálculo de la jornada anual.
 *
 * Funciones puras (sin acceso al DOM ni al almacenamiento) para que puedan
 * probarse en Node con `node --test`. Todas las fechas se manejan como texto
 * ISO (AAAA-MM-DD) y se calculan en UTC para evitar saltos de horario de verano.
 */
(function (raiz) {
  'use strict';

  // ---------------------------------------------------------------- Categorías

  var CATEGORIAS = [
    { id: 'laborable', nombre: 'Día laborable' },
    { id: 'sabado', nombre: 'Sábado' },
    { id: 'domingo', nombre: 'Domingo' },
    { id: 'descanso', nombre: 'Descanso semanal' },
    { id: 'festivo_nacional', nombre: 'Festivo nacional' },
    { id: 'festivo_autonomico', nombre: 'Festivo autonómico' },
    { id: 'festivo_local', nombre: 'Festivo local' },
    { id: 'vacaciones', nombre: 'Vacaciones' },
    { id: 'permiso', nombre: 'Permiso u otro día libre' },
    { id: 'trabajado', nombre: 'Trabajado excepcionalmente' }
  ];
  var NOMBRE_CAT = {};
  CATEGORIAS.forEach(function (c) { NOMBRE_CAT[c.id] = c.nombre; });

  var TIPO_A_CAT = { N: 'festivo_nacional', A: 'festivo_autonomico', L: 'festivo_local' };
  var CAT_A_TIPO = { festivo_nacional: 'N', festivo_autonomico: 'A', festivo_local: 'L' };
  var NOMBRE_TIPO = { N: 'Nacional', A: 'Autonómico', L: 'Local' };
  var PRIORIDAD_TIPO = { N: 3, A: 2, L: 1 };
  // Categorías en las que se trabaja y que, por tanto, tienen horas previstas.
  var CAT_TRABAJO = { laborable: true, trabajado: true };
  // Categorías de ausencia que pueden ocupar solo una parte de la jornada.
  var CAT_AUSENCIA = { vacaciones: true, permiso: true };

  function esFestivo(cat) { return !!CAT_A_TIPO[cat]; }

  // -------------------------------------------------------------------- Fechas

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DIA_MS = 86400000;

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function iso(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function partes(f) { return { y: +f.slice(0, 4), m: +f.slice(5, 7), d: +f.slice(8, 10) }; }
  function aUTC(f) { var p = partes(f); return Date.UTC(p.y, p.m - 1, p.d); }
  function desdeUTC(ms) {
    var d = new Date(ms);
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  function diaSemana(f) { return new Date(aUTC(f)).getUTCDay(); }
  function sumarDias(f, n) { return desdeUTC(aUTC(f) + n * DIA_MS); }
  function esBisiesto(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function diasEnMes(y, m) { return [31, esBisiesto(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }

  function esFechaValida(f) {
    if (typeof f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
    var p = partes(f);
    return p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= diasEnMes(p.y, p.m);
  }

  function diasDelAnio(y) {
    var r = [];
    for (var m = 1; m <= 12; m++) {
      for (var d = 1, n = diasEnMes(y, m); d <= n; d++) r.push(iso(y, m, d));
    }
    return r;
  }

  function rangoFechas(a, b) {
    if (a > b) { var t = a; a = b; b = t; }
    var r = [];
    for (var f = a; f <= b; f = sumarDias(f, 1)) r.push(f);
    return r;
  }

  // Fecha local del dispositivo (no UTC), en ISO.
  function hoyISO(fecha) {
    var d = fecha || new Date();
    return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function fechaLarga(f) {
    var p = partes(f);
    return DIAS[diaSemana(f)] + ', ' + p.d + ' de ' + MESES[p.m - 1] + ' de ' + p.y;
  }
  function fechaCorta(f) { var p = partes(f); return pad(p.d) + '/' + pad(p.m) + '/' + p.y; }

  // Acepta AAAA-MM-DD, DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA y AAAAMMDD.
  function normalizarFecha(txt) {
    if (txt == null) return null;
    var s = String(txt).trim();
    var m, f = null;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) f = iso(+m[1], +m[2], +m[3]);
    else if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))) f = iso(+m[3], +m[2], +m[1]);
    else if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) f = iso(+m[1], +m[2], +m[3]);
    return f && esFechaValida(f) ? f : null;
  }

  // --------------------------------------------------------------------- Horas

  // Acepta "8", "7,5", "7.5", "7:30", "7h30", "7h". Devuelve null si no es válido.
  function parseHoras(v) {
    if (v == null) return null;
    if (typeof v === 'number') return isFinite(v) && v >= 0 ? v : null;
    var s = String(v).trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return null;
    var m = s.match(/^(\d{1,3})(?::|h)(\d{1,2})(?:m|min)?$/);
    if (m) return +m[2] < 60 ? +m[1] + +m[2] / 60 : null;
    m = s.match(/^(\d{1,4})(?:[.,](\d+))?h?$/);
    if (m) return parseFloat(m[1] + '.' + (m[2] || '0'));
    return null;
  }

  function minutosReloj(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
    if (!m || +m[1] > 24 || +m[2] > 59 || (+m[1] === 24 && +m[2] > 0)) return null;
    return +m[1] * 60 + +m[2];
  }

  function redondear(n) { return Math.round(n * 100) / 100; }

  var FORMATO = (typeof Intl !== 'undefined') ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }) : null;
  function formatoNumero(n) {
    var v = redondear(n);
    if (v === 0) v = 0; // evita "-0"
    return FORMATO ? FORMATO.format(v) : String(v).replace('.', ',');
  }
  function formatoHoras(h) { return formatoNumero(h) + ' h'; }
  function formatoSigno(h) {
    var v = redondear(h);
    return (v > 0 ? '+' : v < 0 ? '−' : '') + formatoNumero(Math.abs(v)) + ' h';
  }
  // 7.5 -> "7 h 30 min"
  function formatoHM(h) {
    var t = Math.round(Math.abs(h) * 60);
    var hh = Math.floor(t / 60), mm = t % 60;
    return (h < 0 && t ? '−' : '') + hh + ' h' + (mm ? ' ' + pad(mm) + ' min' : '');
  }

  // ------------------------------------------------------------------ Jornada

  // Horas previstas por día de la semana (índice 0 = domingo).
  function jornadaEfectiva(cfg) {
    if (cfg.modoJornada === 'semanal') {
      var dias = cfg.diasSemanales || [];
      var n = dias.filter(Boolean).length;
      var h = n ? (+cfg.horasSemanales || 0) / n : 0;
      return [0, 1, 2, 3, 4, 5, 6].map(function (i) { return dias[i] ? h : 0; });
    }
    return [0, 1, 2, 3, 4, 5, 6].map(function (i) {
      var v = +(cfg.jornada || [])[i];
      return isFinite(v) && v > 0 ? v : 0;
    });
  }

  // ------------------------------------------------------------------ Festivos

  function claveMunicipio(ccaa, municipio) {
    var m = String(municipio || '').trim().toLowerCase();
    if (m.normalize) m = m.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return ccaa + '|' + m;
  }

  // Festivos oficiales del territorio. Sin comunidad elegida, solo los comunes a todas.
  function festivosOficiales(F, anio, opciones) {
    opciones = opciones || {};
    var porAnio = F && F.datos && F.datos[anio];
    if (!porAnio) return [];
    var ccaa = opciones.ccaa;
    var filas;
    if (ccaa && porAnio[ccaa]) {
      filas = porAnio[ccaa];
    } else {
      var regs = Object.keys(porAnio);
      filas = porAnio[regs[0]].filter(function (fila) {
        return regs.every(function (r) {
          return porAnio[r].some(function (o) { return o[0] === fila[0] && o[1] === fila[1]; });
        });
      });
    }
    var aplicar = opciones.aplicarTraslados !== false;
    var res = filas.map(function (f) {
      var o = { fecha: f[0], nombre: f[1], tipo: f[2], origen: 'oficial', clave: f[0] + '|' + f[1] };
      if (f[3]) {
        o.trasladoDesde = f[3];
        if (!aplicar) { o.fecha = f[3]; o.trasladoNoAplicado = true; }
      }
      return o;
    });
    if (ccaa === 'CN' && opciones.isla && F.insulares && F.insulares[anio] && F.insulares[anio][opciones.isla]) {
      var ins = F.insulares[anio][opciones.isla];
      res.push({ fecha: ins[0], nombre: ins[1] + ' (fiesta insular)', tipo: 'A', origen: 'oficial', insular: true, clave: ins[0] + '|' + ins[1] });
    }
    if (ccaa && opciones.municipio && F.locales && F.locales[anio]) {
      var loc = F.locales[anio][claveMunicipio(ccaa, opciones.municipio)];
      (loc || []).forEach(function (l) {
        res.push({ fecha: l[0], nombre: l[1], tipo: 'L', origen: 'oficial', clave: l[0] + '|' + l[1], fuente: l[2] || '' });
      });
    }
    return res;
  }

  // Estado de verificación de los festivos del año y territorio.
  function estadoFestivos(F, anio, ccaa, isla, municipio) {
    var fuente = F && F.fuentes && F.fuentes[anio];
    var porAnio = F && F.datos && F.datos[anio];
    if (!porAnio || !fuente) return { estado: 'sin_datos', fuente: null, notas: [] };
    if (!ccaa) return { estado: 'sin_region', fuente: fuente, notas: [] };
    var notas = [];
    if (F.notas && F.notas[anio] && F.notas[anio][ccaa]) notas.push(F.notas[anio][ccaa]);
    if (F.notas && F.notas.todos && F.notas.todos[ccaa]) notas.push(F.notas.todos[ccaa]);
    var res = {
      estado: (F.estados && F.estados[anio] && F.estados[anio][ccaa]) || fuente.estado,
      fuente: fuente,
      norma: (F.normas && F.normas[anio] && F.normas[anio][ccaa]) || '',
      notas: notas,
      insular: null,
      localesVerificados: !!(municipio && F.locales && F.locales[anio] && F.locales[anio][claveMunicipio(ccaa, municipio)])
    };
    if (ccaa === 'CN') {
      res.insular = !isla ? 'sin_isla' : (F.insulares && F.insulares[anio] && F.insulares[anio][isla]) ? 'ok' : 'falta';
    }
    return res;
  }

  // Une festivos oficiales y del usuario. Los ocultos se marcan (no se borran).
  function combinarFestivos(oficiales, usuario, ocultos) {
    var oc = {};
    (ocultos || []).forEach(function (k) { oc[k] = true; });
    var lista = oficiales.map(function (f) {
      var o = Object.assign({}, f);
      o.oculto = !!oc[f.clave];
      return o;
    });
    (usuario || []).forEach(function (f) {
      lista.push(Object.assign({ origen: 'manual' }, f, { clave: 'u:' + f.id, oculto: false }));
    });
    lista.sort(function (a, b) {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
      return PRIORIDAD_TIPO[b.tipo] - PRIORIDAD_TIPO[a.tipo];
    });
    return lista;
  }

  // Mapa fecha -> festivos visibles de esa fecha, el de mayor rango primero.
  function mapaFestivos(lista) {
    var m = {};
    lista.forEach(function (f) {
      if (f.oculto) return;
      (m[f.fecha] = m[f.fecha] || []).push(f);
    });
    Object.keys(m).forEach(function (k) {
      m[k].sort(function (a, b) { return PRIORIDAD_TIPO[b.tipo] - PRIORIDAD_TIPO[a.tipo]; });
    });
    return m;
  }

  // ---------------------------------------------------------------------- Días

  // ctx: { jornada: [7 números], horasExcepcional, dias: {fecha: {cat, horas, nota}}, festivos: mapa }
  function infoDia(f, ctx) {
    var dow = diaSemana(f);
    var hj = +ctx.jornada[dow] || 0;
    var catBase = hj > 0 ? 'laborable' : dow === 6 ? 'sabado' : dow === 0 ? 'domingo' : 'descanso';
    var fest = (ctx.festivos && ctx.festivos[f]) || null;
    var catAuto = fest ? TIPO_A_CAT[fest[0].tipo] : catBase;
    var ov = (ctx.dias && ctx.dias[f]) || null;
    var cat = (ov && ov.cat) || catAuto;
    var horasPers = !!(ov && typeof ov.horas === 'number' && isFinite(ov.horas));
    var horas = 0;
    // Ausencia del día completo, salvo que se indiquen menos horas que la jornada:
    // entonces el resto del día se trabaja y solo se descuenta esa parte.
    var ausencia = 0, fraccion = 0;
    if (CAT_TRABAJO[cat]) {
      if (horasPers) horas = ov.horas;
      else horas = hj > 0 ? hj : (+ctx.horasExcepcional || 0);
    } else if (CAT_AUSENCIA[cat]) {
      fraccion = 1;
      if (hj > 0) {
        var pedidas = ov && typeof ov.horasAusencia === 'number' && isFinite(ov.horasAusencia) && ov.horasAusencia > 0 ? ov.horasAusencia : hj;
        ausencia = Math.min(pedidas, hj);
        fraccion = ausencia / hj;
        horas = hj - ausencia;
      }
    }
    return {
      fecha: f,
      dow: dow,
      horasJornada: hj,
      catBase: catBase,
      catAuto: catAuto,
      cat: cat,
      festivos: fest,
      manual: !!(ov && ov.cat),
      horasPersonalizadas: horasPers,
      horasPlan: horas,
      horasAusencia: ausencia,
      fraccionAusencia: fraccion,
      ausenciaParcial: fraccion > 0 && fraccion < 1,
      nota: (ov && ov.nota) || ''
    };
  }

  // Aplica una categoría a varias fechas y devuelve el nuevo objeto `dias`.
  // cat === null: quita la categoría manual; cat === 'restablecer': borra todo el día.
  function aplicarCategoria(dias, fechas, cat, ctx) {
    var res = Object.assign({}, dias);
    fechas.forEach(function (f) {
      var prev = Object.assign({}, res[f] || {});
      if (cat === 'restablecer') { delete res[f]; return; }
      if (cat === null) delete prev.cat;
      else {
        var auto = infoDia(f, Object.assign({}, ctx, { dias: {} })).catAuto;
        if (cat === auto) delete prev.cat; else prev.cat = cat;
      }
      // Las horas de una ausencia parcial solo tienen sentido en vacaciones o permisos.
      if (!CAT_AUSENCIA[prev.cat]) delete prev.horasAusencia;
      if (Object.keys(prev).length) res[f] = prev; else delete res[f];
    });
    return res;
  }

  // Selección de fechas de un rango según las opciones del usuario.
  function planificarRango(desde, hasta, ctx, opciones) {
    opciones = opciones || {};
    var fechas = rangoFechas(desde, hasta);
    var elegidas = [], omitidasFestivo = 0, omitidasNoJornada = 0, enJornada = 0;
    fechas.forEach(function (f) {
      var d = infoDia(f, ctx);
      if (opciones.respetarFestivos && d.festivos) { omitidasFestivo++; return; }
      if (opciones.soloJornada && d.horasJornada === 0) { omitidasNoJornada++; return; }
      elegidas.push(f);
      if (d.horasJornada > 0) enJornada++;
    });
    return { fechas: elegidas, total: fechas.length, omitidasFestivo: omitidasFestivo, omitidasNoJornada: omitidasNoJornada, enJornada: enJornada };
  }

  // ----------------------------------------------------------------- Registros

  function horasEfectivas(r) {
    if (typeof r.efectivasManual === 'number' && isFinite(r.efectivasManual)) return Math.max(0, r.efectivasManual);
    var a = minutosReloj(r.entrada), b = minutosReloj(r.salida);
    if (a == null || b == null) return 0;
    var dur = b - a;
    if (dur < 0) dur += 1440; // turno que termina después de medianoche
    dur -= Math.max(0, +r.pausa || 0);
    return Math.max(0, dur) / 60;
  }

  // Calcula horas efectivas y extraordinarias de cada registro.
  // Las extras automáticas son lo que supera la jornada prevista del día,
  // repartido en orden de entrada cuando hay varios tramos el mismo día.
  function procesarRegistros(registros, planDe) {
    var orden = (registros || []).slice().sort(function (a, b) {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
      return (a.entrada || '') < (b.entrada || '') ? -1 : (a.entrada || '') > (b.entrada || '') ? 1 : 0;
    });
    var acumulado = {};
    return orden.map(function (r) {
      var ef = horasEfectivas(r);
      var previas = acumulado[r.fecha] || 0;
      var plan = planDe ? planDe(r.fecha) : 0;
      var extraAuto = Math.max(0, ef - Math.max(0, plan - previas));
      acumulado[r.fecha] = previas + ef;
      var manual = typeof r.extra === 'number' && isFinite(r.extra) ? r.extra : null;
      return Object.assign({}, r, {
        horasEfectivas: ef,
        extraAuto: extraAuto,
        horasExtra: manual != null ? manual : extraAuto,
        planDia: plan
      });
    });
  }

  // ---------------------------------------------------------------- Cálculo anual

  // opciones: { registros, hoy, vacacionesDias, vacacionesTipo, horasConvenio, objetivo }
  function calcularAnio(anio, ctx, opciones) {
    opciones = opciones || {};
    var hoy = opciones.hoy || hoyISO();
    var dias = diasDelAnio(anio).map(function (f) { return infoDia(f, ctx); });
    var porFecha = {};
    dias.forEach(function (d) { porFecha[d.fecha] = d; });

    var r = {
      anio: anio,
      totalDias: dias.length,
      sabados: 0,
      domingos: 0,
      diasJornada: 0,
      horasTeoricas: 0,
      festivosLab: { N: 0, A: 0, L: 0, total: 0 },
      festivosNoLab: 0,
      festivosTotal: 0,
      vacacionesLab: 0,
      vacacionesNat: 0,
      permisosLab: 0,
      permisosTotal: 0,
      vacacionesHoras: 0,
      permisosHoras: 0,
      otrosNoTrab: 0,
      diasTrabajadoExc: 0,
      diasExcepcionales: 0,
      horasExcepcionales: 0,
      ajusteHoras: 0,
      diasEfectivos: 0,
      horasNetas: 0,
      desc: { festivos: 0, vacaciones: 0, permisos: 0, otros: 0, total: 0 },
      planHastaHoy: 0,
      diasManuales: 0
    };
    var meses = [];
    for (var i = 0; i < 12; i++) {
      meses.push({ mes: i + 1, diasJornada: 0, horasTeoricas: 0, diasEfectivos: 0, horasPlan: 0, horasRegistradas: 0, extras: 0, festivosLab: 0, vacacionesLab: 0, permisosLab: 0 });
    }

    dias.forEach(function (d) {
      var M = meses[partes(d.fecha).m - 1];
      var hj = d.horasJornada;
      if (d.dow === 6) r.sabados++;
      if (d.dow === 0) r.domingos++;
      if (d.manual) r.diasManuales++;
      if (hj > 0) { r.diasJornada++; r.horasTeoricas += hj; M.diasJornada++; M.horasTeoricas += hj; }
      if (esFestivo(d.cat)) {
        r.festivosTotal++;
        if (hj > 0) { r.festivosLab[CAT_A_TIPO[d.cat]]++; r.festivosLab.total++; r.desc.festivos += hj; M.festivosLab++; }
        else r.festivosNoLab++;
      } else if (d.cat === 'vacaciones') {
        // Un día de vacaciones de solo unas horas cuenta en proporción a la jornada.
        r.vacacionesNat += d.fraccionAusencia;
        if (hj > 0) {
          r.vacacionesLab += d.fraccionAusencia;
          r.vacacionesHoras += d.horasAusencia;
          r.desc.vacaciones += d.horasAusencia;
          M.vacacionesLab += d.fraccionAusencia;
        }
      } else if (d.cat === 'permiso') {
        r.permisosTotal += d.fraccionAusencia;
        if (hj > 0) {
          r.permisosLab += d.fraccionAusencia;
          r.permisosHoras += d.horasAusencia;
          r.desc.permisos += d.horasAusencia;
          M.permisosLab += d.fraccionAusencia;
        }
      } else if (!CAT_TRABAJO[d.cat] && hj > 0) {
        // Día de jornada marcado a mano como sábado, domingo o descanso.
        r.otrosNoTrab++;
        r.desc.otros += hj;
      }
      if (d.cat === 'trabajado') r.diasTrabajadoExc++;
      if (CAT_TRABAJO[d.cat] && hj > 0) r.ajusteHoras += d.horasPlan - hj;
      if (d.horasPlan > 0) {
        r.diasEfectivos++;
        r.horasNetas += d.horasPlan;
        M.diasEfectivos++;
        M.horasPlan += d.horasPlan;
        if (hj === 0) { r.diasExcepcionales++; r.horasExcepcionales += d.horasPlan; }
        if (d.fecha <= hoy) r.planHastaHoy += d.horasPlan;
      }
    });
    r.desc.total = r.desc.festivos + r.desc.vacaciones + r.desc.permisos + r.desc.otros;
    // Los días parciales dejan decimales: se redondean para evitar restos como 0,30000000004.
    var r4 = function (n) { return Math.round(n * 1e4) / 1e4; };
    ['vacacionesLab', 'vacacionesNat', 'permisosLab', 'permisosTotal'].forEach(function (k) { r[k] = r4(r[k]); });
    meses.forEach(function (m) { m.vacacionesLab = r4(m.vacacionesLab); m.permisosLab = r4(m.permisosLab); });

    // Registros de horas trabajadas.
    var regs = procesarRegistros((opciones.registros || []).filter(function (x) { return x.fecha && x.fecha.slice(0, 4) === String(anio); }),
      function (f) { return porFecha[f] ? porFecha[f].horasPlan : 0; });
    var regPorFecha = {};
    r.registradas = 0; r.extras = 0; r.registradasHastaHoy = 0;
    regs.forEach(function (x) {
      r.registradas += x.horasEfectivas;
      r.extras += x.horasExtra;
      if (x.fecha <= hoy) r.registradasHastaHoy += x.horasEfectivas;
      var M = meses[partes(x.fecha).m - 1];
      M.horasRegistradas += x.horasEfectivas;
      M.extras += x.horasExtra;
      var e = regPorFecha[x.fecha] || (regPorFecha[x.fecha] = { horas: 0, extras: 0, n: 0 });
      e.horas += x.horasEfectivas; e.extras += x.horasExtra; e.n++;
    });
    r.diasRegistrados = Object.keys(regPorFecha).length;

    // Vacaciones.
    var tipoVac = opciones.vacacionesTipo === 'naturales' ? 'naturales' : 'laborables';
    var usadas = tipoVac === 'naturales' ? r.vacacionesNat : r.vacacionesLab;
    var derecho = +opciones.vacacionesDias || 0;
    r.vacaciones = { tipo: tipoVac, derecho: derecho, usadas: usadas, restantes: Math.round((derecho - usadas) * 1e4) / 1e4, horas: r.vacacionesHoras };

    // Objetivos.
    var conv = typeof opciones.horasConvenio === 'number' && isFinite(opciones.horasConvenio) && opciones.horasConvenio > 0 ? opciones.horasConvenio : null;
    r.convenio = conv;
    r.difCalendarioConvenio = conv != null ? r.horasNetas - conv : null;
    r.pendientesCalendario = r.horasNetas - r.registradas;
    r.pendientesConvenio = conv != null ? conv - r.registradas : null;
    r.objetivoTipo = opciones.objetivo === 'convenio' && conv != null ? 'convenio' : 'calendario';
    r.objetivo = r.objetivoTipo === 'convenio' ? conv : r.horasNetas;
    r.pendientes = r.objetivo - r.registradas;
    r.progreso = r.objetivo > 0 ? r.registradas / r.objetivo : 0;
    // Lo previsto hasta hoy; con objetivo de convenio se reparte en proporción al calendario.
    r.esperadoHoy = r.objetivoTipo === 'convenio'
      ? (r.horasNetas > 0 ? conv * r.planHastaHoy / r.horasNetas : 0)
      : r.planHastaHoy;
    r.balanceHoy = r.registradasHastaHoy - r.esperadoHoy;
    r.hoy = hoy;

    return { resumen: r, meses: meses, dias: dias, porFecha: porFecha, registros: regs, regPorFecha: regPorFecha };
  }

  // ------------------------------------------------------------------ CSV e ICS

  function numCSV(n) { return String(redondear(n)).replace('.', ','); }
  function celdaCSV(v) {
    if (v == null) return '';
    var s = typeof v === 'number' ? numCSV(v) : String(v);
    if (/[";\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  // Punto y coma y coma decimal: es lo que espera Excel con configuración española.
  function aCSV(filas) {
    return filas.map(function (f) { return f.map(celdaCSV).join(';'); }).join('\r\n');
  }

  function parseCSV(texto) {
    texto = String(texto || '').replace(/^﻿/, '');
    var primera = texto.split(/\r?\n/)[0] || '';
    var sep = primera.indexOf(';') >= 0 ? ';' : primera.indexOf('\t') >= 0 ? '\t' : ',';
    var filas = [], fila = [], celda = '', comillas = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (comillas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { celda += '"'; i++; } else comillas = false;
        } else celda += c;
      } else if (c === '"') comillas = true;
      else if (c === sep) { fila.push(celda); celda = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        fila.push(celda); filas.push(fila); fila = []; celda = '';
      } else celda += c;
    }
    if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
    return filas.filter(function (f) { return f.some(function (c) { return String(c).trim() !== ''; }); });
  }

  function normalizarTipo(t) {
    var s = String(t || '').trim().toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (s === 'n' || s.indexOf('nacional') === 0 || s === 'estatal') return 'N';
    if (s === 'a' || s.indexOf('autonom') === 0 || s === 'regional' || s === 'insular' || s === 'autonomica') return 'A';
    return 'L';
  }

  function desescaparICS(s) {
    return s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
  }

  function parseICS(texto) {
    var lineas = String(texto).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    var festivos = [], errores = [], ev = null;
    lineas.forEach(function (l) {
      if (/^BEGIN:VEVENT/i.test(l)) ev = {};
      else if (/^END:VEVENT/i.test(l)) {
        if (ev && ev.inicio) {
          var fin = ev.fin && ev.fin > ev.inicio ? sumarDias(ev.fin, -1) : ev.inicio;
          rangoFechas(ev.inicio, fin).forEach(function (f) {
            festivos.push({ fecha: f, nombre: ev.nombre || 'Festivo', tipo: 'L' });
          });
        } else errores.push('Evento sin fecha de inicio');
        ev = null;
      } else if (ev) {
        var m = l.match(/^(DTSTART|DTEND)[^:]*:(\d{8})/i);
        if (m) {
          var f = normalizarFecha(m[2]);
          if (/^DTSTART/i.test(m[1])) ev.inicio = f; else ev.fin = f;
        } else if ((m = l.match(/^SUMMARY[^:]*:(.*)$/i))) ev.nombre = desescaparICS(m[1]);
      }
    });
    return { festivos: festivos, errores: errores };
  }

  // Interpreta festivos en JSON, CSV (fecha;nombre;tipo;traslado) o ICS.
  function parseFestivos(texto) {
    texto = String(texto || '').replace(/^﻿/, '').trim();
    if (!texto) return { festivos: [], errores: ['No hay contenido que importar.'] };
    if (/BEGIN:VCALENDAR/i.test(texto)) return parseICS(texto);
    var festivos = [], errores = [];
    if (texto[0] === '[' || texto[0] === '{') {
      var obj;
      try { obj = JSON.parse(texto); } catch (e) { return { festivos: [], errores: ['El JSON no es válido: ' + e.message] }; }
      var arr = Array.isArray(obj) ? obj : (obj.festivos || obj.holidays || []);
      arr.forEach(function (x, i) {
        var f = normalizarFecha(x.fecha || x.date);
        if (!f) { errores.push('Elemento ' + (i + 1) + ': fecha no válida'); return; }
        var o = { fecha: f, nombre: String(x.nombre || x.localName || x.name || 'Festivo').trim(), tipo: normalizarTipo(x.tipo || x.type) };
        var t = normalizarFecha(x.trasladoDesde);
        if (t) o.trasladoDesde = t;
        festivos.push(o);
      });
      return { festivos: festivos, errores: errores };
    }
    parseCSV(texto).forEach(function (fila, i) {
      var f = normalizarFecha(fila[0]);
      if (!f) {
        if (i > 0 || !/fecha|date/i.test(fila[0])) errores.push('Línea ' + (i + 1) + ': fecha no válida ("' + fila[0] + '")');
        return;
      }
      var o = { fecha: f, nombre: String(fila[1] || 'Festivo').trim() || 'Festivo', tipo: normalizarTipo(fila[2]) };
      var t = normalizarFecha(fila[3]);
      if (t) o.trasladoDesde = t;
      festivos.push(o);
    });
    return { festivos: festivos, errores: errores };
  }

  // ------------------------------------------------------------ Estado y copias

  var ID_APP = 'calculadora-jornada-anual';

  function configInicial(anio) {
    return {
      pais: 'ES',
      ccaa: '',
      provincia: '',
      municipio: '',
      isla: '',
      anio: anio,
      modoJornada: 'diaria',
      jornada: [0, 8, 8, 8, 8, 7, 0],
      horasSemanales: 39,
      diasSemanales: [false, true, true, true, true, true, false],
      horasExcepcional: 8,
      vacacionesDias: 22,
      vacacionesTipo: 'laborables',
      horasConvenio: null,
      objetivo: 'calendario',
      aplicarTraslados: true,
      entradaHabitual: '08:00',
      salidaHabitual: '16:30',
      pausaHabitual: 30,
      tema: 'auto'
    };
  }

  function estadoInicial(anio) {
    return { app: ID_APP, version: 1, config: configInicial(anio), anios: {} };
  }

  function datosAnioVacio() {
    return { dias: {}, festivosUsuario: [], festivosOcultos: [], registros: [] };
  }

  function numeroEn(v, min, max, defecto) {
    var n = typeof v === 'number' ? v : parseHoras(v);
    return n != null && isFinite(n) && n >= min && n <= max ? n : defecto;
  }

  var CATS_VALIDAS = {};
  CATEGORIAS.forEach(function (c) { CATS_VALIDAS[c.id] = true; });

  // Valida y completa un estado (de localStorage o de una copia importada).
  function normalizarEstado(obj, anioActual) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new Error('El archivo no contiene una copia de seguridad de esta aplicación.');
    }
    if (obj.app && obj.app !== ID_APP) throw new Error('El archivo pertenece a otra aplicación ("' + obj.app + '").');
    if (!obj.config && !obj.anios) throw new Error('El archivo no contiene configuración ni datos de calendario.');

    var base = configInicial(anioActual);
    var c = Object.assign({}, base, obj.config || {});
    c.anio = Math.round(numeroEn(c.anio, 1900, 2200, anioActual));
    c.jornada = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return numeroEn((c.jornada || [])[i], 0, 24, 0); });
    c.diasSemanales = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return !!(c.diasSemanales || [])[i]; });
    c.modoJornada = c.modoJornada === 'semanal' ? 'semanal' : 'diaria';
    c.horasSemanales = numeroEn(c.horasSemanales, 0, 168, base.horasSemanales);
    c.horasExcepcional = numeroEn(c.horasExcepcional, 0, 24, base.horasExcepcional);
    c.vacacionesDias = Math.round(numeroEn(c.vacacionesDias, 0, 366, base.vacacionesDias));
    c.vacacionesTipo = c.vacacionesTipo === 'naturales' ? 'naturales' : 'laborables';
    c.horasConvenio = c.horasConvenio == null || c.horasConvenio === '' ? null : numeroEn(c.horasConvenio, 1, 8784, null);
    c.objetivo = c.objetivo === 'convenio' ? 'convenio' : 'calendario';
    c.aplicarTraslados = c.aplicarTraslados !== false;
    c.tema = ['auto', 'claro', 'oscuro'].indexOf(c.tema) >= 0 ? c.tema : 'auto';
    ['ccaa', 'provincia', 'municipio', 'isla', 'entradaHabitual', 'salidaHabitual'].forEach(function (k) { c[k] = String(c[k] || ''); });
    c.pausaHabitual = Math.round(numeroEn(c.pausaHabitual, 0, 1440, 0));
    c.pais = 'ES';

    var anios = {};
    Object.keys(obj.anios || {}).forEach(function (k) {
      if (!/^\d{4}$/.test(k)) return;
      var a = obj.anios[k] || {};
      var d = datosAnioVacio();
      Object.keys(a.dias || {}).forEach(function (f) {
        if (!esFechaValida(f) || f.slice(0, 4) !== k) return;
        var v = a.dias[f] || {}, o = {};
        if (v.cat && CATS_VALIDAS[v.cat]) o.cat = v.cat;
        var h = numeroEn(v.horas, 0, 24, null);
        if (h != null) o.horas = h;
        var ha = numeroEn(v.horasAusencia, 0.01, 24, null);
        if (ha != null && CAT_AUSENCIA[o.cat]) o.horasAusencia = ha;
        if (v.nota) o.nota = String(v.nota).slice(0, 500);
        if (Object.keys(o).length) d.dias[f] = o;
      });
      (a.festivosUsuario || []).forEach(function (x, i) {
        var f = normalizarFecha(x && x.fecha);
        if (!f) return;
        var o = { id: String(x.id || ('f' + k + '-' + i)), fecha: f, nombre: String(x.nombre || 'Festivo').slice(0, 120), tipo: normalizarTipo(x.tipo), origen: x.origen === 'importado' ? 'importado' : 'manual' };
        var t = normalizarFecha(x.trasladoDesde);
        if (t) o.trasladoDesde = t;
        d.festivosUsuario.push(o);
      });
      d.festivosOcultos = (a.festivosOcultos || []).filter(function (s) { return typeof s === 'string'; });
      (a.registros || []).forEach(function (x, i) {
        var f = normalizarFecha(x && x.fecha);
        if (!f) return;
        d.registros.push({
          id: String(x.id || ('r' + k + '-' + i)),
          fecha: f,
          entrada: minutosReloj(x.entrada) != null ? x.entrada : '',
          salida: minutosReloj(x.salida) != null ? x.salida : '',
          pausa: Math.round(numeroEn(x.pausa, 0, 1440, 0)),
          efectivasManual: numeroEn(x.efectivasManual, 0, 24, null),
          extra: numeroEn(x.extra, 0, 24, null),
          comentario: String(x.comentario || '').slice(0, 500)
        });
      });
      anios[k] = d;
    });
    var res = { app: ID_APP, version: 1, config: c, anios: anios };
    var equipo = normalizarEquipo(obj.equipo);
    if (equipo) res.equipo = equipo;
    return res;
  }

  // Datos de "Vacaciones del equipo": tabla importada, columnas elegidas y ajustes.
  function normalizarEquipo(e) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
    var col = function (v) {
      if (v === null || v === undefined || v === '') return null;
      var n = +v;
      return Math.floor(n) === n && n >= 0 && n < 1000 ? n : null;
    };
    var tabla = Array.isArray(e.tabla) ? e.tabla.slice(0, 50000).map(function (f) {
      return Array.isArray(f) ? f.slice(0, 1000).map(function (c) {
        return typeof c === 'number' && isFinite(c) ? c : c == null ? '' : String(c).slice(0, 500);
      }) : [];
    }) : null;
    var m = e.mapeo || {};
    var mapeo = {
      cabecera: col(m.cabecera) || 0,
      formato: m.formato === 'cuadrante' ? 'cuadrante' : 'filas',
      trabajador: col(m.trabajador), horas: col(m.horas), fecha: col(m.fecha),
      desde: col(m.desde), hasta: col(m.hasta), tipo: col(m.tipo),
      tipos: Array.isArray(m.tipos) ? m.tipos.slice(0, 1000).map(String) : null,
      heredarTrabajador: !!m.heredarTrabajador,
      codigoCuadrante: String(m.codigoCuadrante == null ? 'V' : m.codigoCuadrante).slice(0, 20),
      modo: m.modo === 'fecha' ? 'fecha' : 'horas'
    };
    var a = e.ajustes || {};
    var ajustes = {
      horasDia: numeroEn(a.horasDia, 0.25, 24, 8),
      jornada: [0, 1, 2, 3, 4, 5, 6].map(function (i) { return numeroEn((a.jornada || [])[i], 0, 24, i >= 1 && i <= 5 ? 8 : 0); }),
      derecho: numeroEn(a.derecho, 0, 366, 22),
      anio: /^\d{4}$/.test(String(a.anio)) ? String(a.anio) : a.anio === 'todos' ? 'todos' : 'auto'
    };
    var trabajadores = {};
    Object.keys(e.trabajadores || {}).slice(0, 10000).forEach(function (n) {
      var t = e.trabajadores[n] || {}, o = {};
      var h = numeroEn(t.horasDia, 0.25, 24, null);
      var d = numeroEn(t.derecho, 0, 366, null);
      if (h != null) o.horasDia = h;
      if (d != null) o.derecho = d;
      if (Object.keys(o).length) trabajadores[String(n).slice(0, 200)] = o;
    });
    var o = e.origen || {};
    return {
      tabla: tabla,
      origen: { nombre: String(o.nombre || '').slice(0, 200), formato: String(o.formato || '').slice(0, 20), hoja: String(o.hoja || '').slice(0, 200), fecha: String(o.fecha || '').slice(0, 40) },
      mapeo: mapeo,
      ajustes: ajustes,
      trabajadores: trabajadores
    };
  }

  // ------------------------------------------------------------------ Informes

  function filasResumenAnual(calc, cfg, etiquetas) {
    var r = calc.resumen;
    etiquetas = etiquetas || {};
    var filas = [
      ['Calculadora de jornada anual', ''],
      ['Año', r.anio],
      ['Comunidad autónoma', etiquetas.ccaa || ''],
      ['Municipio', cfg.municipio || ''],
      ['Fuente de los festivos', etiquetas.fuente || ''],
      [],
      ['Concepto', 'Valor'],
      ['1. Días del año', r.totalDias],
      ['2a. Sábados', r.sabados],
      ['2b. Domingos', r.domingos],
      ['3. Días laborables de la jornada (antes de festivos)', r.diasJornada],
      ['4. Festivos en días de trabajo', r.festivosLab.total],
      ['4a. Nacionales', r.festivosLab.N],
      ['4b. Autonómicos', r.festivosLab.A],
      ['4c. Locales', r.festivosLab.L],
      ['5. Vacaciones en días de trabajo', r.vacacionesLab],
      ['6. Permisos y otros días libres en días de trabajo', r.permisosLab + r.otrosNoTrab],
      ['7. Días laborables efectivos', r.diasEfectivos],
      ['8. Horas teóricas del año (jornada semanal)', r.horasTeoricas],
      ['9. Horas a trabajar tras festivos y vacaciones', r.horasNetas],
      ['10. Horas registradas', r.registradas],
      ['11. Horas pendientes (objetivo ' + r.objetivoTipo + ')', r.pendientes],
      ['12. Diferencia calendario - convenio', r.difCalendarioConvenio == null ? 'sin convenio' : r.difCalendarioConvenio],
      ['Horas anuales de convenio', r.convenio == null ? 'no indicado' : r.convenio],
      ['Horas extraordinarias registradas', r.extras],
      ['Vacaciones (' + r.vacaciones.tipo + ') usadas / derecho', formatoNumero(r.vacaciones.usadas) + ' / ' + r.vacaciones.derecho],
      ['Horas de vacaciones en días de trabajo', r.vacacionesHoras],
      ['Horas de permiso en días de trabajo', r.permisosHoras],
      [],
      ['Mes', 'Días efectivos', 'Horas previstas', 'Horas registradas', 'Diferencia', 'Horas extra', 'Festivos en días de trabajo', 'Vacaciones en días de trabajo', 'Permisos en días de trabajo']
    ];
    calc.meses.forEach(function (m) {
      filas.push([MESES[m.mes - 1], m.diasEfectivos, m.horasPlan, m.horasRegistradas, m.horasRegistradas - m.horasPlan, m.extras, m.festivosLab, m.vacacionesLab, m.permisosLab]);
    });
    filas.push(['Total', r.diasEfectivos, r.horasNetas, r.registradas, r.registradas - r.horasNetas, r.extras, r.festivosLab.total, r.vacacionesLab, r.permisosLab]);
    return filas;
  }

  function filasMes(calc, mes) {
    var filas = [['Fecha', 'Día', 'Categoría', 'Festivo', 'Horas previstas', 'Horas registradas', 'Diferencia', 'Horas extra', 'Nota']];
    calc.dias.forEach(function (d) {
      if (partes(d.fecha).m !== mes) return;
      var reg = calc.regPorFecha[d.fecha];
      var h = reg ? reg.horas : 0;
      filas.push([fechaCorta(d.fecha), DIAS[d.dow], NOMBRE_CAT[d.cat] + (d.ausenciaParcial ? ' (' + formatoHoras(d.horasAusencia) + ')' : ''), d.festivos ? d.festivos.map(function (x) { return x.nombre; }).join(' / ') : '',
        d.horasPlan, h, h - d.horasPlan, reg ? reg.extras : 0, d.nota]);
    });
    return filas;
  }

  var api = {
    CATEGORIAS: CATEGORIAS,
    NOMBRE_CAT: NOMBRE_CAT,
    NOMBRE_TIPO: NOMBRE_TIPO,
    TIPO_A_CAT: TIPO_A_CAT,
    CAT_AUSENCIA: CAT_AUSENCIA,
    CAT_A_TIPO: CAT_A_TIPO,
    MESES: MESES,
    DIAS: DIAS,
    esFestivo: esFestivo,
    iso: iso,
    partes: partes,
    diaSemana: diaSemana,
    sumarDias: sumarDias,
    esBisiesto: esBisiesto,
    diasEnMes: diasEnMes,
    esFechaValida: esFechaValida,
    diasDelAnio: diasDelAnio,
    rangoFechas: rangoFechas,
    hoyISO: hoyISO,
    fechaLarga: fechaLarga,
    fechaCorta: fechaCorta,
    normalizarFecha: normalizarFecha,
    parseHoras: parseHoras,
    minutosReloj: minutosReloj,
    redondear: redondear,
    formatoNumero: formatoNumero,
    formatoHoras: formatoHoras,
    formatoSigno: formatoSigno,
    formatoHM: formatoHM,
    jornadaEfectiva: jornadaEfectiva,
    claveMunicipio: claveMunicipio,
    festivosOficiales: festivosOficiales,
    estadoFestivos: estadoFestivos,
    combinarFestivos: combinarFestivos,
    mapaFestivos: mapaFestivos,
    infoDia: infoDia,
    aplicarCategoria: aplicarCategoria,
    planificarRango: planificarRango,
    horasEfectivas: horasEfectivas,
    procesarRegistros: procesarRegistros,
    calcularAnio: calcularAnio,
    aCSV: aCSV,
    parseCSV: parseCSV,
    parseICS: parseICS,
    parseFestivos: parseFestivos,
    normalizarTipo: normalizarTipo,
    ID_APP: ID_APP,
    configInicial: configInicial,
    estadoInicial: estadoInicial,
    datosAnioVacio: datosAnioVacio,
    normalizarEstado: normalizarEstado,
    normalizarEquipo: normalizarEquipo,
    filasResumenAnual: filasResumenAnual,
    filasMes: filasMes
  };
  raiz.Motor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
