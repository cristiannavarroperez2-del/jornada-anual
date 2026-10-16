/*
 * Interfaz de la Calculadora de jornada anual.
 * Depende de festivos-datos.js, regiones.js y motor.js (cargados antes).
 */
(function () {
  'use strict';

  const M = window.Motor;
  const F = window.FestivosOficiales;
  const R = window.Regiones;
  const CLAVE = 'calculadora-jornada-anual.v1';
  const EN_MARCO = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const ANIO_HOY = new Date().getFullYear();
  const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];
  const INICIAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const CAT_TRABAJO = { laborable: true, trabajado: true };
  const CAT_AUSENCIA = M.CAT_AUSENCIA;
  const TEMA_ORIGINAL = document.documentElement.getAttribute('data-theme');
  const ES_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const EN_PANTALLA_INICIO = navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fh = M.formatoHoras;
  const fn = M.formatoNumero;
  const fs = M.formatoSigno;
  const may = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const pl = (n, uno, varios) => `${M.formatoNumero(n)} ${n === 1 ? uno : varios}`;
  const nuevoId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  let estado;
  let calc = null;
  let almacenamiento = 'ok';
  let mensajeInicio = '';
  let historial = [];
  let rehechos = [];
  const ui = {
    pestana: 'calendario',
    modoRango: false,
    rangoInicio: null,
    ultimoClic: null,
    diaAbierto: null,
    foco: null,
    editFestivo: null,
    mesRegistro: 'todos'
  };

  // ------------------------------------------------------------ Persistencia

  function cargar() {
    let crudo = null;
    try { crudo = localStorage.getItem(CLAVE); } catch (e) { almacenamiento = 'no-disponible'; }
    if (crudo) {
      try {
        estado = M.normalizarEstado(JSON.parse(crudo), ANIO_HOY);
        return false;
      } catch (e) {
        try { localStorage.setItem(CLAVE + '.danado', crudo); } catch (_) { /* sin espacio */ }
        mensajeInicio = 'Los datos guardados no se podían leer. Se ha empezado de cero y se ha conservado una copia aparte.';
      }
    }
    estado = M.estadoInicial(ANIO_HOY);
    return true;
  }

  let persistenciaPedida = false;
  function persistir() {
    if (almacenamiento === 'no-disponible') return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
      almacenamiento = 'ok';
      // Pide al navegador que no borre estos datos cuando le falte espacio.
      if (!persistenciaPedida && navigator.storage && navigator.storage.persist) {
        persistenciaPedida = true;
        navigator.storage.persist().catch(() => {});
      }
    } catch (e) {
      almacenamiento = 'error';
    }
  }

  // Toda modificación pasa por aquí: guarda un punto para deshacer, persiste y repinta.
  function cambiar(fn, aviso) {
    historial.push(JSON.stringify(estado));
    if (historial.length > 100) historial.shift();
    rehechos = [];
    fn();
    persistir();
    renderizar();
    if (aviso) toast(aviso, true);
    if (almacenamiento === 'error') toast('No se ha podido guardar en este navegador. Exporta una copia para no perder los cambios.');
  }

  function restaurar(json) {
    estado = JSON.parse(json);
    persistir();
    aplicarTema();
    rellenarConfig(true);
    renderizar();
  }
  function deshacer() {
    if (!historial.length) return;
    rehechos.push(JSON.stringify(estado));
    restaurar(historial.pop());
    toast('Cambio deshecho');
  }
  function rehacer() {
    if (!rehechos.length) return;
    historial.push(JSON.stringify(estado));
    restaurar(rehechos.pop());
    toast('Cambio rehecho');
  }

  function datosAnio(anio) {
    const k = String(anio || estado.config.anio);
    if (!estado.anios[k]) estado.anios[k] = M.datosAnioVacio();
    return estado.anios[k];
  }

  // ------------------------------------------------------------------ Cálculo

  function contextoAnio() {
    const cfg = estado.config;
    const a = datosAnio();
    const oficiales = M.festivosOficiales(F, cfg.anio, {
      ccaa: cfg.ccaa, isla: cfg.isla, municipio: cfg.municipio, aplicarTraslados: cfg.aplicarTraslados
    });
    const lista = M.combinarFestivos(oficiales, a.festivosUsuario, a.festivosOcultos);
    return {
      lista,
      ctx: { jornada: M.jornadaEfectiva(cfg), horasExcepcional: cfg.horasExcepcional, dias: a.dias, festivos: M.mapaFestivos(lista) }
    };
  }

  function opcionesCalculo(registros) {
    const cfg = estado.config;
    return {
      registros, hoy: M.hoyISO(), vacacionesDias: cfg.vacacionesDias, vacacionesTipo: cfg.vacacionesTipo,
      horasConvenio: cfg.horasConvenio, objetivo: cfg.objetivo
    };
  }

  function recalcular() {
    const cfg = estado.config;
    const { lista, ctx } = contextoAnio();
    calc = M.calcularAnio(cfg.anio, ctx, opcionesCalculo(datosAnio().registros));
    calc.lista = lista;
    calc.ctx = ctx;
    calc.estadoFest = M.estadoFestivos(F, cfg.anio, cfg.ccaa, cfg.isla, cfg.municipio);
    return calc;
  }

  function nombreRegion(c) { return (R.porCodigo[c || estado.config.ccaa] || {}).nombre || ''; }
  function localesActuales() { return calc.lista.filter((f) => f.tipo === 'L' && !f.oculto).length; }

  // ------------------------------------------------------------------- Pintado

  function renderizar() {
    recalcular();
    renderCabecera();
    renderCifras();
    renderAvisos();
    renderLeyenda();
    renderCalendario();
    renderResumen();
    renderResultados();
    renderRegistro();
    renderFestivos();
    renderDatos();
    cacheFestivos = {};
    extensiones.forEach((fn) => fn());
    if (ui.diaAbierto && $('#dlg-dia').open) rellenarDia(ui.diaAbierto);
    if ($('#dlg-rango').open) vistaRango();
  }

  function aniosDisponibles() {
    const cfg = estado.config;
    const desde = Math.min(2024, cfg.anio, ANIO_HOY);
    const hasta = Math.max(ANIO_HOY + 4, cfg.anio);
    const r = [];
    for (let y = desde; y <= hasta; y++) r.push(y);
    return r;
  }

  function opcionesAnio(sel) {
    const cfg = estado.config;
    const html = aniosDisponibles().map((y) => {
      const sufijo = F.datos[y] ? '' : ' (sin festivos)';
      return `<option value="${y}"${y === cfg.anio ? ' selected' : ''}>${y}${sufijo}</option>`;
    }).join('');
    if (sel.innerHTML !== html) sel.innerHTML = html;
    sel.value = String(cfg.anio);
  }

  function renderCabecera() {
    const cfg = estado.config;
    const partes = [nombreRegion(), cfg.isla, cfg.municipio].filter(Boolean);
    $('#marca-sub').textContent = partes.length ? partes.join(' · ') : 'Sin ubicación configurada';
    opcionesAnio($('#anio-sel'));
    opcionesAnio($('#cfg-anio'));
    $('#btn-deshacer').disabled = !historial.length;
    $('#btn-rehacer').disabled = !rehechos.length;
    const ef = calc.estadoFest;
    $('#pie-fuente').innerHTML = ef.fuente
      ? `Festivos ${cfg.anio}: <a href="${esc(ef.fuente.url)}" target="_blank" rel="noopener">${esc(ef.fuente.ref)}</a>${ef.norma ? ' · ' + esc(ef.norma) : ''}.`
      : `No hay festivos oficiales cargados para ${cfg.anio}.`;
  }

  function progresoHTML(r) {
    const pct = Math.max(0, Math.min(100, r.progreso * 100));
    const esperado = r.objetivo > 0 ? Math.max(0, Math.min(100, (r.esperadoHoy / r.objetivo) * 100)) : 0;
    const mostrarMarca = r.esperadoHoy > 0 && esperado < 100;
    return `<div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Progreso anual de horas registradas">
        <div class="barra__relleno" style="width:${pct.toFixed(2)}%"></div>
        ${mostrarMarca ? `<div class="barra__marca" style="left:calc(${esperado.toFixed(2)}% - 1px)" title="Previsto hasta hoy"></div>` : ''}
      </div>
      <div class="barra-texto"><span>${fn(pct)} % registrado sobre el ${r.objetivoTipo === 'convenio' ? 'convenio' : 'calendario'}</span>${mostrarMarca ? `<span>Previsto a hoy: ${fn(esperado)} %</span>` : ''}</div>`;
  }

  function renderCifras() {
    const r = calc.resumen;
    const cifra = (etq, valor, unidad) => `<div class="cifra"><span class="cifra__etq">${etq}</span><span class="cifra__valor">${valor}${unidad ? `<small>${unidad}</small>` : ''}</span></div>`;
    $('#cifras').innerHTML =
      cifra('Días efectivos', fn(r.diasEfectivos)) +
      cifra('Horas a trabajar', fn(r.horasNetas), 'h') +
      cifra('Registradas', fn(r.registradas), 'h') +
      cifra(r.pendientes >= 0 ? 'Pendientes' : 'Por encima', fn(Math.abs(r.pendientes)), 'h') +
      `<div class="cifra cifra--progreso"><span class="cifra__etq">Progreso anual</span>${progresoHTML(r)}</div>`;
  }

  function aviso(tipo, texto, boton) {
    return `<div class="aviso aviso--${tipo}"><p>${texto}</p>${boton || ''}</div>`;
  }
  const botonIr = (destino, texto) => `<button type="button" class="btn btn-mini" data-ir="${destino}">${texto}</button>`;

  function renderAvisos() {
    const cfg = estado.config;
    const ef = calc.estadoFest;
    const avisos = [];
    if (!cfg.ccaa) {
      avisos.push(aviso('info', '<strong>Configura tu calendario.</strong> Elige comunidad autónoma, municipio y jornada. Mientras tanto se aplican solo los festivos comunes a toda España y una jornada de ejemplo (lunes a jueves 8 h, viernes 7 h).', botonIr('config', 'Ir a Configuración')));
    }
    if (ef.estado === 'sin_datos') {
      avisos.push(aviso('alerta', `No hay festivos oficiales cargados para ${cfg.anio}. Añade los nacionales, autonómicos y locales a mano o impórtalos desde el boletín oficial.`, botonIr('festivos', 'Añadir festivos')));
    } else if (ef.estado === 'provisional' || ef.estado === 'incompleto') {
      avisos.push(aviso('alerta', esc(ef.notas[0] || 'Los festivos de este año están pendientes de verificar.'), botonIr('festivos', 'Revisar festivos')));
    }
    if (cfg.ccaa && cfg.ccaa !== 'CE' && ef.estado !== 'sin_datos') {
      const n = localesActuales();
      if (n < 2) {
        const donde = cfg.municipio ? esc(cfg.municipio) : 'tu municipio';
        avisos.push(aviso('alerta', `<strong>Faltan festivos locales.</strong> Tienes ${n} de 2 para ${donde} en ${cfg.anio}. No se han podido verificar automáticamente: consúltalos en el boletín oficial y añádelos.`, botonIr('festivos', 'Añadir festivos locales')));
      }
    }
    if (cfg.ccaa === 'CN' && ef.insular === 'sin_isla') {
      avisos.push(aviso('alerta', 'En Canarias cada isla tiene su fiesta insular. Elige tu isla para incluirla.', botonIr('config', 'Elegir isla')));
    } else if (cfg.ccaa === 'CN' && ef.insular === 'falta') {
      avisos.push(aviso('alerta', `La fiesta insular de ${esc(cfg.isla)} para ${cfg.anio} no está verificada. Añádela a mano.`, botonIr('festivos', 'Añadir festivo')));
    }
    $('#avisos-calendario').innerHTML = avisos.join('');
  }

  function renderLeyenda() {
    const cuenta = {};
    calc.dias.forEach((d) => { cuenta[d.cat] = (cuenta[d.cat] || 0) + 1; });
    const cats = M.CATEGORIAS.filter((c) => c.id !== 'descanso' || cuenta.descanso);
    const corto = { laborable: 'Laborable', sabado: 'Sábado', domingo: 'Domingo', descanso: 'Descanso', festivo_nacional: 'F. nacional', festivo_autonomico: 'F. autonómico', festivo_local: 'F. local', vacaciones: 'Vacaciones', permiso: 'Permiso', trabajado: 'Excepcional' };
    $('#leyenda').innerHTML = cats.map((c) =>
      `<li><span class="muestra cat-${c.id}"></span><span class="leyenda__largo">${c.nombre}</span><span class="leyenda__corto">${corto[c.id]}</span> <span class="leyenda__cuenta">${cuenta[c.id] || 0}</span></li>`
    ).join('') + '<li><span class="leyenda__nota">◥ cambiado a mano · ◩ solo unas horas · • con registro · T trasladado</span></li>';
  }

  function etiquetaDia(d, reg) {
    let t = M.fechaLarga(d.fecha) + ': ' + M.NOMBRE_CAT[d.cat] + (d.ausenciaParcial ? ' (' + fh(d.horasAusencia) + ')' : '');
    if (d.festivos) t += ' (' + d.festivos.map((f) => f.nombre).join(', ') + ')';
    t += ', ' + fh(d.horasPlan) + ' previstas';
    if (d.manual) t += ', cambiado a mano';
    if (reg) t += ', ' + fh(reg.horas) + ' registradas';
    if (d.nota) t += '. Nota: ' + d.nota;
    return t;
  }

  function renderCalendario() {
    const anio = estado.config.anio;
    const cont = $('#meses');
    const teniaFoco = cont.contains(document.activeElement);
    if (!ui.foco || ui.foco.slice(0, 4) !== String(anio)) {
      const hoy = M.hoyISO();
      ui.foco = hoy.slice(0, 4) === String(anio) ? hoy : anio + '-01-01';
    }
    const hoy = M.hoyISO();
    let html = '';
    for (let m = 1; m <= 12; m++) {
      const mi = calc.meses[m - 1];
      html += `<section class="mes" aria-labelledby="mes-${m}"><header class="mes__cab"><h3 class="mes__nombre" id="mes-${m}">${M.MESES[m - 1]}</h3>` +
        `<span class="mes__dato" title="Días efectivos y horas previstas">${mi.diasEfectivos} d · ${fh(mi.horasPlan)}</span></header>` +
        `<div class="mes__semana" aria-hidden="true">${ORDEN_SEMANA.map((d) => `<span>${INICIAL[d]}</span>`).join('')}</div><div class="mes__dias">`;
      const primero = M.iso(anio, m, 1);
      const hueco = (M.diaSemana(primero) + 6) % 7;
      for (let i = 0; i < hueco; i++) html += '<span class="dia dia--vacio" aria-hidden="true"></span>';
      for (let dd = 1, n = M.diasEnMes(anio, m); dd <= n; dd++) {
        const f = M.iso(anio, m, dd);
        const d = calc.porFecha[f];
        const reg = calc.regPorFecha[f];
        const clases = ['dia', 'cat-' + d.cat];
        if (d.manual) clases.push('dia--manual');
        if (d.horasPersonalizadas && CAT_TRABAJO[d.cat]) clases.push('dia--horas');
        if (d.ausenciaParcial) clases.push('dia--parcial');
        if (reg) clases.push('dia--registro');
        if (f === hoy) clases.push('dia--hoy');
        if (f === ui.rangoInicio) clases.push('dia--sel');
        const traslado = d.festivos && d.festivos.some((x) => x.trasladoDesde && !x.trasladoNoAplicado);
        const titulo = d.festivos ? d.festivos.map((x) => x.nombre).join(' / ') : M.NOMBRE_CAT[d.cat] + ' · ' + fh(d.horasPlan);
        html += `<button type="button" class="${clases.join(' ')}" data-fecha="${f}" tabindex="${f === ui.foco ? 0 : -1}" aria-label="${esc(etiquetaDia(d, reg))}" title="${esc(titulo)}">${traslado ? '<sup>T</sup>' : ''}${dd}</button>`;
      }
      html += '</div></section>';
    }
    cont.innerHTML = html;
    if (teniaFoco) {
      const b = cont.querySelector(`[data-fecha="${ui.foco}"]`);
      if (b) b.focus({ preventScroll: true });
    }
  }

  function tarjeta(etq, valor, sub) {
    return `<div class="tarjeta"><span class="tarjeta__etq">${etq}</span><span class="tarjeta__valor">${valor}</span>${sub ? `<span class="tarjeta__sub">${sub}</span>` : ''}</div>`;
  }
  const chip = (tipo, texto) => `<span class="chip chip--${tipo}">${texto}</span>`;

  function textoConvenio(r) {
    if (r.convenio == null) return '';
    const d = r.difCalendarioConvenio;
    if (Math.abs(d) < 0.005) return 'Coincide con el calendario.';
    return d > 0 ? `El calendario supera el convenio en ${fh(d)}.` : `El calendario queda ${fh(-d)} por debajo del convenio.`;
  }

  function renderResumen() {
    const r = calc.resumen;
    const v = r.vacaciones;
    const tarjetas = [
      tarjeta('Días laborables efectivos', fn(r.diasEfectivos), `de ${r.diasJornada} días de jornada`),
      tarjeta('Vacaciones disfrutadas', `${fn(v.usadas)}<small> / ${v.derecho}</small>`,
        (v.restantes >= 0 ? `Quedan ${pl(v.restantes, 'día', 'días')} ${v.tipo}` : chip('mal', `Te pasas en ${pl(-v.restantes, 'día', 'días')}`)) +
        (r.vacacionesHoras ? ` · ${fh(r.vacacionesHoras)} usadas` : '')),
      tarjeta('Festivos aplicables', fn(r.festivosLab.total),
        `${r.festivosLab.N} nac. · ${r.festivosLab.A} aut. · ${r.festivosLab.L} loc.` + (r.festivosNoLab ? ` · ${r.festivosNoLab} más en días sin jornada` : '')),
      tarjeta('Horas anuales teóricas', fn(r.horasNetas) + '<small> h</small>', `Tras festivos y vacaciones. Sin descontar: ${fh(r.horasTeoricas)}`),
      tarjeta('Objetivo de convenio', r.convenio != null ? fn(r.convenio) + '<small> h</small>' : '<small>Sin indicar</small>',
        r.convenio != null ? textoConvenio(r) : botonIr('config', 'Indicar horas de convenio')),
      tarjeta('Horas registradas', fn(r.registradas) + '<small> h</small>', `${pl(r.diasRegistrados, 'día', 'días')} · ${fh(r.extras)} extra`),
      tarjeta('Horas pendientes', fn(Math.max(0, r.pendientes)) + '<small> h</small>',
        r.pendientes >= 0 ? `Para el objetivo de ${r.objetivoTipo}` : chip('ok', `Objetivo superado en ${fh(-r.pendientes)}`)),
      tarjeta('Diferencia con el objetivo', r.diasRegistrados ? fs(r.balanceHoy) : '<small>Sin registros</small>',
        r.diasRegistrados
          ? (r.balanceHoy >= -0.005 ? chip('ok', 'Al día o por delante') : chip('alerta', 'Por detrás de lo previsto')) + ` Previsto hasta hoy: ${fh(r.esperadoHoy)}`
          : 'Registra tus horas para ver si vas por delante o por detrás.')
    ];
    $('#tarjetas').innerHTML = tarjetas.join('');
    $('#progreso').innerHTML = `<h2 class="bloque__titulo">Progreso anual</h2>${progresoHTML(r)}<p class="nota">${fh(r.registradas)} registradas de ${fh(r.objetivo)} (${r.objetivoTipo}). La marca indica lo previsto hasta hoy.</p>`;
    $('#grafico-comparacion').innerHTML = graficoComparacion(r);
  }

  // ---------------------------------------------------------------- Gráficos

  function barraH(x, y, w, h, cls) {
    if (w <= 0) return '';
    const rr = Math.min(4, w, h / 2);
    return `<path class="${cls}" d="M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z"/>`;
  }
  function barraV(x, base, w, h, cls) {
    if (h <= 0) return '';
    const rr = Math.min(4, h, w / 2);
    const y = base - h;
    return `<path class="${cls}" d="M${x},${base}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${base}Z"/>`;
  }
  function pasoBonito(v) {
    if (v <= 0) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
  }

  function graficoComparacion(r) {
    const filas = [{ et: 'Previstas por calendario', v: r.horasNetas, cls: 's1' }];
    if (r.convenio != null) filas.push({ et: 'Objetivo de convenio', v: r.convenio, cls: 's1-suave' });
    filas.push({ et: 'Registradas', v: r.registradas, cls: 's2' });
    filas.push({ et: r.pendientes >= 0 ? `Pendientes (${r.objetivoTipo})` : 'Por encima del objetivo', v: Math.abs(r.pendientes), cls: 'neutro' });
    const max = Math.max(1, ...filas.map((f) => f.v));
    const W = 320, alto = 42, util = W - 78;
    const H = filas.length * alto;
    let svg = `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(filas.map((f) => f.et + ': ' + fh(f.v)).join('; '))}">`;
    filas.forEach((f, i) => {
      const y = i * alto;
      const w = f.v > 0 ? Math.max(3, (f.v / max) * util) : 0;
      svg += `<g class="punto"><title>${esc(f.et)}: ${fh(f.v)}</title><rect class="barra-hit" x="0" y="${y}" width="${W}" height="${alto}"/>` +
        `<text x="0" y="${y + 13}" class="t2">${esc(f.et)}</text>` + barraH(0, y + 19, w, 14, f.cls) +
        `<text x="${w + 6}" y="${y + 30.5}" font-weight="600">${fh(f.v)}</text></g>`;
    });
    return svg + '</svg>';
  }

  function graficoMeses(meses) {
    const W = 960, H = 300, izq = 46, der = 8, arriba = 14, abajo = 26;
    const max = Math.max(1, ...meses.map((m) => Math.max(m.horasPlan, m.horasRegistradas)));
    const paso = pasoBonito(max / 4);
    const tope = Math.ceil(max / paso) * paso;
    const util = H - arriba - abajo;
    const y = (v) => arriba + util - (v / tope) * util;
    const base = y(0);
    let svg = `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Horas previstas y registradas por mes">`;
    for (let v = 0; v <= tope + 1e-9; v += paso) {
      svg += `<line class="${v === 0 ? 'eje' : 'rej'}" x1="${izq}" x2="${W - der}" y1="${y(v)}" y2="${y(v)}"/>` +
        `<text class="t2" x="${izq - 6}" y="${y(v) + 4}" text-anchor="end">${fn(v)}</text>`;
    }
    const banda = (W - izq - der) / 12;
    const bw = Math.min(18, (banda - 12) / 2);
    meses.forEach((m, i) => {
      const x0 = izq + i * banda + (banda - (2 * bw + 2)) / 2;
      svg += `<g class="punto"><title>${may(M.MESES[i])}: ${fh(m.horasPlan)} previstas, ${fh(m.horasRegistradas)} registradas</title>` +
        `<rect class="barra-hit" x="${izq + i * banda}" y="${arriba}" width="${banda}" height="${util}"/>` +
        barraV(x0, base, bw, base - y(m.horasPlan), 's1') +
        barraV(x0 + bw + 2, base, bw, base - y(m.horasRegistradas), 's2') +
        `<text class="t2" x="${izq + i * banda + banda / 2}" y="${H - 8}" text-anchor="middle">${MES_CORTO[i]}</text></g>`;
    });
    return svg + '</svg>';
  }

  // -------------------------------------------------------------- Resultados

  function filasDesglose(r) {
    const conv = r.convenio;
    return [
      ['1', 'Días del año', fn(r.totalDias), M.esBisiesto(r.anio) ? 'Año bisiesto.' : ''],
      ['2', 'Sábados y domingos', `${r.sabados} + ${r.domingos}`, `${r.sabados} sábados y ${r.domingos} domingos.`],
      ['3', 'Días laborables antes de descontar festivos', fn(r.diasJornada), 'Días con horas en tu jornada semanal.'],
      ['4', 'Festivos que caen en días de trabajo', fn(r.festivosLab.total), `${r.festivosLab.N} nacionales, ${r.festivosLab.A} autonómicos y ${r.festivosLab.L} locales.` + (r.festivosNoLab ? ` Otros ${r.festivosNoLab} caen en días que no trabajas y no restan horas.` : '')],
      ['5', 'Vacaciones en días de trabajo', fn(r.vacacionesLab), `${fh(r.vacacionesHoras)} de vacaciones; ${pl(r.vacacionesNat, 'día natural marcado', 'días naturales marcados')}. Derecho: ${r.vacaciones.derecho} días ${r.vacaciones.tipo}.`],
      ['6', 'Permisos y otros días libres', fn(r.permisosLab + r.otrosNoTrab), `${fn(r.permisosLab)} de permiso (${fh(r.permisosHoras)})` + (r.otrosNoTrab ? ` y ${pl(r.otrosNoTrab, 'día', 'días')} de jornada marcados como no laborables` : '') + '.'],
      ['7', 'Días laborables efectivos', fn(r.diasEfectivos), r.diasTrabajadoExc ? `Incluye ${pl(r.diasTrabajadoExc, 'día trabajado', 'días trabajados')} excepcionalmente.` : 'Días con horas previstas.'],
      ['8', 'Horas teóricas del año', fh(r.horasTeoricas), 'Tu jornada de cada día de la semana aplicada a todo el año, sin descontar nada.'],
      ['9', 'Horas a trabajar tras festivos y vacaciones', fh(r.horasNetas), 'Suma de las horas previstas de cada día concreto.'],
      ['10', 'Horas registradas', fh(r.registradas), r.diasRegistrados ? `${pl(r.diasRegistrados, 'día', 'días')} con registro; ${fh(r.extras)} extraordinarias.` : 'Todavía no hay registros este año.'],
      ['11', 'Horas pendientes para el objetivo', r.pendientes >= 0 ? fh(r.pendientes) : '0 h', r.pendientes >= 0 ? `Objetivo de ${r.objetivoTipo}: ${fh(r.objetivo)}.` : `Has superado el objetivo de ${r.objetivoTipo} en ${fh(-r.pendientes)}.`],
      ['12', 'Diferencia con el convenio', conv != null ? fs(r.difCalendarioConvenio) : 'Sin convenio', conv != null ? textoConvenio(r) + ` Registradas frente a convenio: ${fs(r.registradas - conv)}.` : 'Indica las horas anuales de tu convenio en Configuración.']
    ];
  }

  function renderResultados() {
    const r = calc.resumen;
    const conv = r.convenio;
    $('#bloques-resultado').innerHTML =
      `<div class="bloque resultado"><span class="resultado__etq">Según el calendario</span><span class="resultado__valor">${fh(r.horasNetas)}</span>
        <ul><li>${r.diasEfectivos} días efectivos de ${r.diasJornada} de jornada</li><li>${fh(r.horasTeoricas)} teóricas antes de descontar</li><li>${fh(r.desc.festivos)} por festivos y ${fh(r.desc.vacaciones)} por vacaciones</li></ul></div>` +
      `<div class="bloque resultado"><span class="resultado__etq">Según el convenio</span><span class="resultado__valor">${conv != null ? fh(conv) : '—'}</span>
        <ul>${conv != null ? `<li>${textoConvenio(r)}</li>` : '<li>No has indicado horas de convenio.</li>'}<li>Se muestra aparte porque cada convenio computa la jornada a su manera.</li></ul></div>` +
      `<div class="bloque resultado"><span class="resultado__etq">Registradas</span><span class="resultado__valor">${fh(r.registradas)}</span>
        <ul><li>Pendientes según calendario: ${r.pendientesCalendario >= 0 ? fh(r.pendientesCalendario) : 'ninguna (' + fs(-r.pendientesCalendario) + ')'}</li>
        ${conv != null ? `<li>Pendientes según convenio: ${r.pendientesConvenio >= 0 ? fh(r.pendientesConvenio) : 'ninguna (' + fs(-r.pendientesConvenio) + ')'}</li>` : ''}
        <li>${fh(r.extras)} extraordinarias en ${pl(r.diasRegistrados, 'día', 'días')}</li></ul></div>`;

    $('#tabla-desglose').innerHTML = '<thead><tr><th scope="col">N.º</th><th scope="col">Concepto</th><th scope="col" class="num">Valor</th><th scope="col">Detalle</th></tr></thead><tbody>' +
      filasDesglose(r).map((f) => `<tr><td>${f[0]}</td><td>${f[1]}</td><td class="num desglose-num">${f[2]}</td><td>${f[3]}</td></tr>`).join('') + '</tbody>';

    const d = r.desc;
    $('#cuadre').textContent = `Cuadre: ${fh(r.horasTeoricas)} teóricas − ${fh(d.festivos)} festivos − ${fh(d.vacaciones)} vacaciones − ${fh(d.permisos)} permisos − ${fh(d.otros)} otros días libres + ${fh(r.horasExcepcionales)} días excepcionales ${r.ajusteHoras < 0 ? '−' : '+'} ${fh(Math.abs(r.ajusteHoras))} jornadas con horas personalizadas = ${fh(r.horasNetas)}`;

    $('#grafico-meses').innerHTML = graficoMeses(calc.meses);
    let t = '<thead><tr><th scope="col">Mes</th><th scope="col" class="num">Días efectivos</th><th scope="col" class="num">Previstas</th><th scope="col" class="num">Registradas</th><th scope="col" class="num">Diferencia</th><th scope="col" class="num">Extra</th><th scope="col" class="num">Festivos</th><th scope="col" class="num">Vacaciones</th><th scope="col" class="num">Permisos</th></tr></thead><tbody>';
    calc.meses.forEach((m, i) => {
      const dif = m.horasRegistradas - m.horasPlan;
      t += `<tr><td>${may(M.MESES[i])}</td><td class="num">${m.diasEfectivos}</td><td class="num">${fh(m.horasPlan)}</td><td class="num">${fh(m.horasRegistradas)}</td><td class="num ${dif > 0 ? 'positivo' : dif < 0 ? 'negativo' : ''}">${fs(dif)}</td><td class="num">${fh(m.extras)}</td><td class="num">${m.festivosLab}</td><td class="num">${fn(m.vacacionesLab)}</td><td class="num">${fn(m.permisosLab)}</td></tr>`;
    });
    const dt = r.registradas - r.horasNetas;
    t += `</tbody><tfoot><tr><td>Total</td><td class="num">${r.diasEfectivos}</td><td class="num">${fh(r.horasNetas)}</td><td class="num">${fh(r.registradas)}</td><td class="num">${fs(dt)}</td><td class="num">${fh(r.extras)}</td><td class="num">${r.festivosLab.total}</td><td class="num">${fn(r.vacacionesLab)}</td><td class="num">${fn(r.permisosLab)}</td></tr></tfoot>`;
    $('#tabla-meses').innerHTML = t;
  }

  // ------------------------------------------------------------- Diálogo de día

  function construirCategoriasDia() {
    const opciones = [{ id: '', nombre: 'Automática' }].concat(M.CATEGORIAS);
    $('#dia-cats').innerHTML = opciones.map((c) =>
      `<label class="opcion-cat"><input type="radio" name="dia-cat" value="${c.id}">` +
      `<span class="muestra ${c.id ? 'cat-' + c.id : ''}" ${c.id ? '' : 'id="dia-auto-muestra"'}></span>` +
      `<span${c.id ? '' : ' id="dia-auto-texto"'}>${c.nombre}</span></label>`).join('');
  }

  function abrirDia(f) {
    ui.diaAbierto = f;
    ui.foco = f;
    rellenarDia(f);
    const d = $('#dlg-dia');
    if (!d.open) d.showModal();
  }

  function rellenarDia(f) {
    const d = calc.porFecha[f];
    if (!d) { $('#dlg-dia').close(); return; }
    const a = datosAnio();
    const ov = a.dias[f] || {};
    $('#dia-titulo').textContent = M.fechaLarga(f);
    let info = d.horasJornada > 0
      ? `Jornada habitual de los ${M.DIAS[d.dow]}: <strong>${fh(d.horasJornada)}</strong>.`
      : `Los ${M.DIAS[d.dow]} no forman parte de tu jornada.`;
    if (d.festivos) {
      info += ' ' + d.festivos.map((x) => {
        let s = `<strong>${esc(x.nombre)}</strong> (festivo ${M.NOMBRE_TIPO[x.tipo].toLowerCase()}, ${x.origen === 'oficial' ? 'calendario oficial' : 'añadido por ti'})`;
        if (x.trasladoDesde) s += x.trasladoNoAplicado ? ' · traslado oficial no aplicado' : ` · trasladado desde el ${M.fechaCorta(x.trasladoDesde)}`;
        return s;
      }).join('; ') + '.';
    }
    const parcial = d.ausenciaParcial ? ` (${fh(d.horasAusencia)} de ${fh(d.horasJornada)})` : '';
    info += ` Ahora: <strong>${M.NOMBRE_CAT[d.cat]}${parcial}</strong>${d.manual ? ' (cambiado a mano)' : ''}, ${fh(d.horasPlan)} de trabajo previstas.`;
    $('#dia-info').innerHTML = info;
    $('#dia-auto-texto').textContent = 'Automática: ' + M.NOMBRE_CAT[d.catAuto];
    $('#dia-auto-muestra').className = 'muestra cat-' + d.catAuto;
    $$('input[name="dia-cat"]').forEach((r) => { r.checked = r.value === (d.manual ? d.cat : ''); });

    const horas = $('#dia-horas');
    const ausencia = $('#dia-ausencia');
    const trabaja = !!CAT_TRABAJO[d.cat];
    const conAusencia = !!CAT_AUSENCIA[d.cat] && d.horasJornada > 0;
    $('#dia-horas-campo').hidden = conAusencia;
    $('#dia-ausencia-campo').hidden = !conAusencia;
    horas.disabled = !trabaja;
    horas.removeAttribute('aria-invalid');
    ausencia.removeAttribute('aria-invalid');
    if (document.activeElement !== horas) horas.value = typeof ov.horas === 'number' ? fn(ov.horas) : '';
    if (document.activeElement !== ausencia) ausencia.value = d.ausenciaParcial ? fn(d.horasAusencia) : '';
    const porDefecto = d.horasJornada > 0 ? d.horasJornada : estado.config.horasExcepcional;
    horas.placeholder = trabaja ? fn(porDefecto) : '0';
    ausencia.placeholder = fn(d.horasJornada) + ' (día completo)';
    const queEs = d.cat === 'vacaciones' ? 'vacaciones' : 'permiso';
    $('#dia-ausencia-etq').textContent = 'Horas de ' + queEs;
    let ayuda;
    if (conAusencia) {
      const ejemplo = Math.min(2, d.horasJornada / 2);
      ayuda = `Déjalo vacío si es el día completo (${fh(d.horasJornada)}). Si solo es una parte, escribe las horas: por ejemplo, ${fh(ejemplo)} ` +
        (d.cat === 'vacaciones' ? `restan ${fn(ejemplo / d.horasJornada)} días de vacaciones` : `son ${fn(ejemplo / d.horasJornada)} días de permiso`) +
        ` y las otras ${fh(d.horasJornada - ejemplo)} cuentan como trabajo.`;
    } else if (CAT_AUSENCIA[d.cat]) {
      ayuda = 'Este día no forma parte de tu jornada, así que no resta horas.';
    } else if (trabaja) {
      ayuda = `Déjalo vacío para usar ${fh(porDefecto)}${d.horasJornada > 0 ? ' de tu jornada' : ' (día excepcional, ver Configuración)'}. Escribe otro valor para una jornada distinta ese día.`;
    } else {
      ayuda = 'Este día no tiene horas previstas. Elige «Día laborable» o «Trabajado excepcionalmente» para asignarle horas.';
    }
    $('#dia-horas-ayuda').textContent = ayuda;
    const nota = $('#dia-nota');
    if (document.activeElement !== nota) nota.value = ov.nota || '';

    const regs = calc.registros.filter((x) => x.fecha === f);
    $('#dia-registros').innerHTML = regs.length
      ? '<strong>Horas registradas</strong><ul>' + regs.map((x) => `<li>${x.entrada && x.salida ? `${esc(x.entrada)}–${esc(x.salida)}${x.pausa ? `, pausa ${x.pausa} min` : ''}: ` : ''}${fh(x.horasEfectivas)}${x.horasExtra ? ` (${fh(x.horasExtra)} extra)` : ''}${x.comentario ? ' · ' + esc(x.comentario) : ''}</li>`).join('') + '</ul>'
      : '';
  }

  function cambiarDia(f, mutar, aviso) {
    cambiar(() => {
      const a = datosAnio();
      const o = Object.assign({}, a.dias[f] || {});
      mutar(o);
      if (Object.keys(o).length) a.dias[f] = o; else delete a.dias[f];
    }, aviso);
  }

  // ---------------------------------------------------------- Periodos (rangos)

  function construirOpcionesRango() {
    const ops = [{ id: 'vacaciones' }, { id: 'permiso' }, { id: 'trabajado' }, { id: 'laborable' }, { id: 'festivo_local' },
      { id: 'festivo_autonomico' }, { id: 'festivo_nacional' }, { id: 'sabado' }, { id: 'domingo' }, { id: 'descanso' }];
    $('#rango-cat').innerHTML = ops.map((o) => `<option value="${o.id}">${M.NOMBRE_CAT[o.id]}</option>`).join('') +
      '<option value="auto">Quitar cambios manuales (volver al calendario)</option>';
  }

  function predeterminadosRango() {
    const cat = $('#rango-cat').value;
    let festivos = false, jornada = false;
    if (cat === 'vacaciones') festivos = jornada = estado.config.vacacionesTipo !== 'naturales';
    else if (cat === 'permiso') festivos = jornada = true;
    $('#rango-festivos').checked = festivos;
    $('#rango-jornada').checked = jornada;
  }

  function abrirRango(desde, hasta) {
    const anio = estado.config.anio;
    ['#rango-desde', '#rango-hasta'].forEach((s) => { $(s).min = anio + '-01-01'; $(s).max = anio + '-12-31'; });
    if (desde && hasta && desde > hasta) { const t = desde; desde = hasta; hasta = t; }
    $('#rango-desde').value = desde || '';
    $('#rango-hasta').value = hasta || desde || '';
    predeterminadosRango();
    vistaRango();
    const d = $('#dlg-rango');
    if (!d.open) d.showModal();
  }

  function leerRango() {
    const anio = String(estado.config.anio);
    const desde = $('#rango-desde').value, hasta = $('#rango-hasta').value;
    if (!M.esFechaValida(desde) || !M.esFechaValida(hasta)) return { error: 'Indica la fecha de inicio y la de fin.' };
    if (desde.slice(0, 4) !== anio || hasta.slice(0, 4) !== anio) return { error: `El periodo tiene que estar dentro de ${anio}. Para otro año, cámbialo arriba.` };
    const cat = $('#rango-cat').value;
    const plan = M.planificarRango(desde, hasta, calc.ctx, { respetarFestivos: $('#rango-festivos').checked, soloJornada: $('#rango-jornada').checked });
    return { desde, hasta, cat, plan };
  }

  function simularRango(sel) {
    const dias = M.aplicarCategoria(datosAnio().dias, sel.plan.fechas, sel.cat === 'auto' ? null : sel.cat, calc.ctx);
    const ctx = Object.assign({}, calc.ctx, { dias });
    return M.calcularAnio(estado.config.anio, ctx, opcionesCalculo(datosAnio().registros)).resumen;
  }

  function vistaRango() {
    const sel = leerRango();
    const vista = $('#rango-vista');
    $('#rango-aplicar').disabled = !!sel.error || (sel.plan && !sel.plan.fechas.length);
    if (sel.error) { vista.textContent = sel.error; return; }
    const p = sel.plan;
    const nombre = sel.cat === 'auto' ? 'su categoría automática' : '«' + M.NOMBRE_CAT[sel.cat] + '»';
    let t = `Se cambiarán ${p.fechas.length} de ${pl(p.total, 'día', 'días')} a ${nombre} (${p.enJornada} de tu jornada).`;
    const omit = [];
    if (p.omitidasFestivo) omit.push(`${p.omitidasFestivo} festivos`);
    if (p.omitidasNoJornada) omit.push(`${p.omitidasNoJornada} días sin jornada`);
    if (omit.length) t += ' Se mantienen ' + omit.join(' y ') + '.';
    if (p.fechas.length) {
      const antes = calc.resumen, despues = simularRango(sel);
      t += ` Horas a trabajar: ${fh(antes.horasNetas)} → ${fh(despues.horasNetas)}.`;
      if (sel.cat === 'vacaciones' || antes.vacaciones.usadas !== despues.vacaciones.usadas) {
        t += ` Vacaciones usadas: ${fn(despues.vacaciones.usadas)} de ${despues.vacaciones.derecho} días ${despues.vacaciones.tipo}.`;
        if (despues.vacaciones.restantes < 0) t += ` Superas tu derecho en ${pl(-despues.vacaciones.restantes, 'día', 'días')}.`;
      }
    }
    vista.textContent = t;
  }

  function aplicarRango(e) {
    e.preventDefault();
    const sel = leerRango();
    if (sel.error || !sel.plan.fechas.length) { vistaRango(); return; }
    const nombre = sel.cat === 'auto' ? 'su categoría automática' : M.NOMBRE_CAT[sel.cat].toLowerCase();
    cambiar(() => {
      const a = datosAnio();
      a.dias = M.aplicarCategoria(a.dias, sel.plan.fechas, sel.cat === 'auto' ? null : sel.cat, calc.ctx);
    }, `${pl(sel.plan.fechas.length, 'día cambiado', 'días cambiados')} a ${nombre}.`);
    $('#dlg-rango').close();
    terminarModoRango();
  }

  function activarModoRango(activo) {
    ui.modoRango = activo;
    ui.rangoInicio = null;
    $('#btn-modo-rango').setAttribute('aria-pressed', String(activo));
    const ayuda = $('#ayuda-rango');
    ayuda.hidden = !activo;
    ayuda.textContent = activo ? 'Pulsa el primer día del periodo. Pulsa Esc o el botón otra vez para cancelar.' : '';
    renderCalendario();
  }
  function terminarModoRango() { if (ui.modoRango || ui.rangoInicio) activarModoRango(false); }

  function clicDia(f, conShift) {
    ui.foco = f;
    if (ui.modoRango || (conShift && ui.ultimoClic)) {
      const inicio = ui.modoRango ? ui.rangoInicio : ui.ultimoClic;
      if (!inicio) {
        ui.rangoInicio = f;
        $('#ayuda-rango').textContent = `Inicio: ${M.fechaCorta(f)}. Ahora pulsa el último día del periodo.`;
        renderCalendario();
        return;
      }
      ui.rangoInicio = null;
      abrirRango(inicio, f);
      return;
    }
    ui.ultimoClic = f;
    abrirDia(f);
  }

  // -------------------------------------------------------- Registro de horas

  function construirMesesSelect() {
    $('#reg-mes').innerHTML = '<option value="todos">Todo el año</option>' + M.MESES.map((m, i) => `<option value="${i + 1}">${may(m)}</option>`).join('');
    const actual = new Date().getMonth() + 1;
    $('#mes-informe').innerHTML = M.MESES.map((m, i) => `<option value="${i + 1}"${i + 1 === actual ? ' selected' : ''}>${may(m)}</option>`).join('');
  }

  function leerRegistroForm() {
    const fecha = $('#reg-fecha').value;
    const entrada = $('#reg-entrada').value;
    const salida = $('#reg-salida').value;
    const pausaTxt = $('#reg-pausa').value.trim();
    const efTxt = $('#reg-efectivas').value.trim();
    const exTxt = $('#reg-extra').value.trim();
    const r = {
      id: $('#reg-id').value || null,
      fecha, entrada, salida,
      pausa: pausaTxt === '' ? 0 : Math.round(+pausaTxt),
      efectivasManual: efTxt === '' ? null : M.parseHoras(efTxt),
      extra: exTxt === '' ? null : M.parseHoras(exTxt),
      comentario: $('#reg-comentario').value.trim()
    };
    const anio = String(estado.config.anio);
    let error = '';
    if (!M.esFechaValida(fecha)) error = 'Indica la fecha.';
    else if (fecha.slice(0, 4) !== anio) error = `La fecha tiene que estar en ${anio}. Para registrar otro año, cámbialo arriba.`;
    else if ((entrada && !salida) || (!entrada && salida)) error = 'Indica la hora de entrada y la de salida, o solo las horas efectivas.';
    else if (!entrada && !salida && r.efectivasManual == null) error = 'Indica la hora de entrada y de salida, o las horas efectivas.';
    else if (!isFinite(r.pausa) || r.pausa < 0) error = 'La pausa debe ser un número de minutos.';
    else if (efTxt !== '' && (r.efectivasManual == null || r.efectivasManual > 24)) error = 'Las horas efectivas no son válidas. Usa, por ejemplo, 7,5 o 7:30.';
    else if (exTxt !== '' && (r.extra == null || r.extra > 24)) error = 'Las horas extraordinarias no son válidas.';
    else if (entrada && salida && r.efectivasManual == null && M.horasEfectivas(r) <= 0) error = 'La pausa es igual o mayor que el tiempo entre la entrada y la salida.';
    return { r, error };
  }

  function vistaRegistro() {
    const { r } = leerRegistroForm();
    const vista = $('#reg-vista');
    const d = calc.porFecha[r.fecha];
    if (!d) { vista.textContent = ''; return; }
    const ef = M.horasEfectivas(r);
    const otras = calc.registros.filter((x) => x.fecha === r.fecha && x.id !== r.id).reduce((s, x) => s + x.horasEfectivas, 0);
    const extraAuto = Math.max(0, ef - Math.max(0, d.horasPlan - otras));
    vista.textContent = `Previstas ese día: ${fh(d.horasPlan)} (${M.NOMBRE_CAT[d.cat].toLowerCase()})` +
      (otras ? ` · ya registradas: ${fh(otras)}` : '') +
      ` · efectivas: ${fh(ef)} · extra: ${fh(r.extra != null ? r.extra : extraAuto)}${r.extra != null ? ' (a mano)' : ''}`;
  }

  function limpiarRegistroForm(mantenerFecha) {
    const fecha = $('#reg-fecha').value;
    $('#form-registro').reset();
    $('#reg-id').value = '';
    const hoy = M.hoyISO();
    if (mantenerFecha) $('#reg-fecha').value = fecha;
    else if (hoy.slice(0, 4) === String(estado.config.anio)) $('#reg-fecha').value = hoy;
    $('#reg-titulo').textContent = 'Nuevo registro';
    $('#reg-guardar').textContent = 'Guardar registro';
    $('#reg-cancelar').hidden = true;
    $('#reg-error').hidden = true;
    vistaRegistro();
  }

  function usarHorarioHabitual() {
    const c = estado.config;
    $('#reg-entrada').value = c.entradaHabitual || '';
    $('#reg-salida').value = c.salidaHabitual || '';
    $('#reg-pausa').value = c.pausaHabitual || 0;
    vistaRegistro();
  }

  function guardarRegistro(e) {
    e.preventDefault();
    const { r, error } = leerRegistroForm();
    const err = $('#reg-error');
    if (error) { err.textContent = error; err.hidden = false; return; }
    err.hidden = true;
    const editando = !!r.id;
    cambiar(() => {
      const a = datosAnio(r.fecha.slice(0, 4));
      if (editando) {
        const i = a.registros.findIndex((x) => x.id === r.id);
        if (i >= 0) a.registros[i] = r; else a.registros.push(r);
      } else {
        r.id = nuevoId('r');
        a.registros.push(r);
      }
    }, editando ? 'Registro actualizado.' : `Registro guardado: ${M.fechaCorta(r.fecha)}.`);
    limpiarRegistroForm(true);
  }

  function editarRegistro(id) {
    const x = datosAnio().registros.find((y) => y.id === id);
    if (!x) return;
    $('#reg-id').value = x.id;
    $('#reg-fecha').value = x.fecha;
    $('#reg-entrada').value = x.entrada || '';
    $('#reg-salida').value = x.salida || '';
    $('#reg-pausa').value = x.pausa || '';
    $('#reg-efectivas').value = x.efectivasManual != null ? fn(x.efectivasManual) : '';
    $('#reg-extra').value = x.extra != null ? fn(x.extra) : '';
    $('#reg-comentario').value = x.comentario || '';
    $('#reg-titulo').textContent = 'Editar registro del ' + M.fechaCorta(x.fecha);
    $('#reg-guardar').textContent = 'Guardar cambios';
    $('#reg-cancelar').hidden = false;
    vistaRegistro();
    $('#reg-fecha').focus();
  }

  async function borrarRegistro(id) {
    const x = datosAnio().registros.find((y) => y.id === id);
    if (!x) return;
    const ok = await confirmar(`Se eliminará el registro del ${M.fechaCorta(x.fecha)} (${fh(M.horasEfectivas(x))}).`, { titulo: 'Eliminar registro', boton: 'Eliminar' });
    if (!ok) return;
    cambiar(() => { const a = datosAnio(); a.registros = a.registros.filter((y) => y.id !== id); }, 'Registro eliminado.');
    if ($('#reg-id').value === id) limpiarRegistroForm(true);
  }

  function renderRegistro() {
    const anio = estado.config.anio;
    ['#reg-fecha'].forEach((s) => { $(s).min = anio + '-01-01'; $(s).max = anio + '-12-31'; });
    const filtro = $('#reg-mes').value || 'todos';
    const regs = calc.registros.filter((x) => filtro === 'todos' || M.partes(x.fecha).m === +filtro);
    let t = '<thead><tr><th scope="col">Fecha</th><th scope="col">Entrada</th><th scope="col">Salida</th><th scope="col" class="num">Pausa</th><th scope="col" class="num">Efectivas</th><th scope="col" class="num">Extra</th><th scope="col">Comentario</th><th scope="col"><span class="visually-hidden">Acciones</span></th></tr></thead><tbody>';
    if (!regs.length) {
      t += `<tr><td colspan="8" class="vacio">No hay registros ${filtro === 'todos' ? 'en ' + anio : 'en ' + M.MESES[filtro - 1]}. Añade el primero con el formulario o desde un día del calendario.</td></tr>`;
    }
    regs.slice().reverse().forEach((x) => {
      t += `<tr><td>${M.fechaCorta(x.fecha)} <span class="nota">${M.DIAS[M.diaSemana(x.fecha)].slice(0, 3)}</span></td><td>${esc(x.entrada || '—')}</td><td>${esc(x.salida || '—')}</td>` +
        `<td class="num">${x.pausa ? x.pausa + ' min' : '—'}</td><td class="num">${fh(x.horasEfectivas)}${x.efectivasManual != null ? '*' : ''}</td><td class="num">${fh(x.horasExtra)}${x.extra != null ? '*' : ''}</td>` +
        `<td>${esc(x.comentario)}</td><td><div class="acciones"><button type="button" class="btn btn-mini" data-editar-reg="${esc(x.id)}">Editar</button><button type="button" class="btn btn-mini btn--peligro-suave" data-borrar-reg="${esc(x.id)}">Eliminar</button></div></td></tr>`;
    });
    t += '</tbody>';
    if (regs.length) {
      const tot = regs.reduce((s, x) => s + x.horasEfectivas, 0), ext = regs.reduce((s, x) => s + x.horasExtra, 0);
      t += `<tfoot><tr><td colspan="4">Total (${pl(regs.length, 'registro', 'registros')}) · * valor introducido a mano</td><td class="num">${fh(tot)}</td><td class="num">${fh(ext)}</td><td colspan="2"></td></tr></tfoot>`;
    }
    $('#tabla-registros').innerHTML = t;

    let m = '<thead><tr><th scope="col">Mes</th><th scope="col" class="num">Días registrados</th><th scope="col" class="num">Registradas</th><th scope="col" class="num">Previstas</th><th scope="col" class="num">Diferencia</th><th scope="col" class="num">Extra</th></tr></thead><tbody>';
    const diasPorMes = Array(12).fill(0);
    Object.keys(calc.regPorFecha).forEach((f) => { diasPorMes[M.partes(f).m - 1]++; });
    calc.meses.forEach((mm, i) => {
      const dif = mm.horasRegistradas - mm.horasPlan;
      m += `<tr><td>${may(M.MESES[i])}</td><td class="num">${diasPorMes[i]}</td><td class="num">${fh(mm.horasRegistradas)}</td><td class="num">${fh(mm.horasPlan)}</td><td class="num ${dif > 0 ? 'positivo' : dif < 0 ? 'negativo' : ''}">${fs(dif)}</td><td class="num">${fh(mm.extras)}</td></tr>`;
    });
    const r = calc.resumen;
    m += `</tbody><tfoot><tr><td>Año ${anio}</td><td class="num">${r.diasRegistrados}</td><td class="num">${fh(r.registradas)}</td><td class="num">${fh(r.horasNetas)}</td><td class="num">${fs(r.registradas - r.horasNetas)}</td><td class="num">${fh(r.extras)}</td></tr></tfoot>`;
    $('#tabla-reg-meses').innerHTML = m;
    vistaRegistro();
  }

  // ----------------------------------------------------------------- Festivos

  function etiquetaEstado(e) {
    return { verificado: chip('ok', 'Verificado'), contrastado: chip('ok', 'Contrastado'), provisional: chip('alerta', 'Provisional'), incompleto: chip('alerta', 'Incompleto'), sin_datos: chip('mal', 'Sin datos'), sin_region: chip('neutro', 'Sin comunidad') }[e] || '';
  }

  function renderFestivos() {
    const cfg = estado.config;
    const ef = calc.estadoFest;
    const region = R.porCodigo[cfg.ccaa];
    const avisos = [];
    if (ef.estado === 'sin_datos') {
      avisos.push(aviso('mal', `${etiquetaEstado('sin_datos')} No hay festivos oficiales cargados para ${cfg.anio}. Añádelos a mano o impórtalos. Consulta el BOE (resolución anual de la Dirección General de Trabajo, publicada en octubre del año anterior)${region ? ` y el ${region.boletin}` : ''}.`));
    } else if (ef.estado === 'sin_region') {
      avisos.push(aviso('info', `${etiquetaEstado('sin_region')} Se muestran solo los festivos comunes a toda España según el <a href="${esc(ef.fuente.url)}" target="_blank" rel="noopener">${esc(ef.fuente.ref)}</a>. Elige tu comunidad autónoma para ver los suyos.`, botonIr('config', 'Elegir comunidad')));
    } else {
      const textoEstado = {
        verificado: 'comprobados con la resolución oficial del BOE',
        contrastado: 'tomados de la norma autonómica y contrastados con la resolución del BOE; pendientes de cotejo directo con su texto',
        provisional: 'con dudas concretas que conviene revisar',
        incompleto: 'incompletos'
      }[ef.estado];
      let t = `${etiquetaEstado(ef.estado)} Festivos nacionales y autonómicos de ${esc(nombreRegion())} para ${cfg.anio}: ${textoEstado}. Fuente: <a href="${esc(ef.fuente.url)}" target="_blank" rel="noopener">${esc(ef.fuente.ref)}</a>`;
      if (ef.norma) t += ` · ${esc(ef.norma)}`;
      t += '.';
      ef.notas.forEach((n) => { t += ' ' + esc(n); });
      avisos.push(aviso(ef.estado === 'provisional' || ef.estado === 'incompleto' ? 'alerta' : 'ok', t));
    }
    if (cfg.ccaa && cfg.ccaa !== 'CE') {
      const n = localesActuales();
      const boletin = region ? ` en el <a href="${esc(region.url)}" target="_blank" rel="noopener">${esc(region.boletin)}</a> o en tu ayuntamiento` : '';
      if (ef.localesVerificados) avisos.push(aviso('ok', `${chip('ok', 'Verificado')} Festivos locales de ${esc(cfg.municipio)} incluidos desde el boletín oficial.`));
      else if (n < 2) avisos.push(aviso('alerta', `${chip('alerta', 'Sin verificar')} No se han podido verificar los festivos locales de ${cfg.municipio ? esc(cfg.municipio) : 'tu municipio'} para ${cfg.anio} (tienes ${n} de 2). Búscalos${boletin} y añádelos con el formulario.`));
      else avisos.push(aviso('info', `Festivos locales: ${n} añadidos para ${cfg.municipio ? esc(cfg.municipio) : 'tu municipio'}. Comprueba que coinciden con el boletín oficial.`));
    }
    $('#fest-estado').innerHTML = avisos.join('');
    $('#fest-titulo').textContent = `Festivos de ${cfg.anio}` + (cfg.ccaa ? ' · ' + nombreRegion() : ' · comunes a España');

    const visibles = calc.lista.filter((f) => !f.oculto);
    const ocultos = calc.lista.filter((f) => f.oculto);
    const jornada = calc.ctx.jornada;
    let t = '<thead><tr><th scope="col">Fecha</th><th scope="col">Festivo</th><th scope="col">Tipo</th><th scope="col">Origen</th><th scope="col"><span class="visually-hidden">Acciones</span></th></tr></thead><tbody>';
    if (!visibles.length) t += '<tr><td colspan="5" class="vacio">No hay festivos para este año.</td></tr>';
    visibles.forEach((f) => {
      const dow = M.diaSemana(f.fecha);
      const enJornada = jornada[dow] > 0;
      const origen = f.origen === 'oficial' ? (f.insular ? 'Fiesta insular (oficial)' : (ef.fuente ? ef.fuente.ref : 'Oficial')) : f.origen === 'importado' ? 'Importado' : 'Añadido a mano';
      const traslado = f.trasladoDesde ? `<br><span class="nota">${f.trasladoNoAplicado ? 'Traslado oficial al ' + M.fechaCorta(M.sumarDias(f.trasladoDesde, 1)) + ' desactivado' : 'Trasladado del ' + M.DIAS[M.diaSemana(f.trasladoDesde)] + ' ' + M.fechaCorta(f.trasladoDesde)}</span>` : '';
      const acciones = f.origen === 'oficial'
        ? `<button type="button" class="btn btn-mini" data-editar-fest="${esc(f.clave)}">Editar</button><button type="button" class="btn btn-mini btn--peligro-suave" data-quitar-fest="${esc(f.clave)}">Quitar</button>`
        : `<button type="button" class="btn btn-mini" data-editar-fest="${esc(f.clave)}">Editar</button><button type="button" class="btn btn-mini btn--peligro-suave" data-borrar-fest="${esc(f.id)}">Eliminar</button>`;
      t += `<tr><td>${M.fechaCorta(f.fecha)}<br><span class="nota">${M.DIAS[dow]}</span>${enJornada ? '' : ' ' + chip('neutro', 'sin jornada')}</td><td>${esc(f.nombre)}${traslado}</td>` +
        `<td><span class="tipo-punto cat-${M.TIPO_A_CAT[f.tipo]}"></span>${M.NOMBRE_TIPO[f.tipo]}</td><td class="sin-salto">${esc(origen)}</td><td><div class="acciones">${acciones}</div></td></tr>`;
    });
    t += '</tbody>';
    $('#tabla-festivos').innerHTML = t;
    $('#fest-ocultos').innerHTML = ocultos.length
      ? `<h3 class="bloque__titulo">Festivos oficiales quitados (${ocultos.length})</h3><div class="tabla-desplazable"><table class="tabla"><tbody>` +
        ocultos.map((f) => `<tr class="fila-oculta"><td>${M.fechaCorta(f.fecha)}</td><td>${esc(f.nombre)}</td><td><button type="button" class="btn btn-mini" data-restaurar-fest="${esc(f.clave)}">Restaurar</button></td></tr>`).join('') +
        '</tbody></table></div>'
      : '';
    $('#fest-restaurar').disabled = !ocultos.length;
    const anio = cfg.anio;
    ['#fest-fecha'].forEach((s) => { $(s).min = anio + '-01-01'; $(s).max = anio + '-12-31'; });
  }

  function limpiarFestivoForm() {
    $('#form-festivo').reset();
    $('#fest-id').value = '';
    ui.editFestivo = null;
    $('#fest-form-titulo').textContent = 'Añadir festivo';
    $('#fest-guardar').textContent = 'Añadir festivo';
    $('#fest-cancelar').hidden = true;
    $('#fest-error').hidden = true;
  }

  function editarFestivo(clave) {
    const f = calc.lista.find((x) => x.clave === clave);
    if (!f) return;
    ui.editFestivo = f;
    $('#fest-id').value = f.id || '';
    $('#fest-fecha').value = f.fecha;
    $('#fest-nombre').value = f.nombre;
    $('#fest-tipo').value = f.tipo;
    $('#fest-traslado').value = f.trasladoDesde || '';
    $('#fest-form-titulo').textContent = f.origen === 'oficial' ? 'Editar festivo oficial' : 'Editar festivo';
    $('#fest-guardar').textContent = 'Guardar cambios';
    $('#fest-cancelar').hidden = false;
    $('#fest-error').hidden = true;
    $('#fest-nombre').focus();
  }

  function guardarFestivo(e) {
    e.preventDefault();
    const fecha = $('#fest-fecha').value;
    const nombre = $('#fest-nombre').value.trim();
    const tipo = $('#fest-tipo').value;
    const traslado = $('#fest-traslado').value;
    const err = $('#fest-error');
    const anio = String(estado.config.anio);
    let error = '';
    if (!M.esFechaValida(fecha)) error = 'Indica la fecha del festivo.';
    else if (fecha.slice(0, 4) !== anio) error = `La fecha tiene que estar en ${anio}.`;
    else if (!nombre) error = 'Escribe el nombre del festivo.';
    else if (traslado && !M.esFechaValida(traslado)) error = 'La fecha de traslado no es válida.';
    const editando = ui.editFestivo;
    if (!error && calc.lista.some((f) => !f.oculto && f.fecha === fecha && f.nombre.toLowerCase() === nombre.toLowerCase() && (!editando || f.clave !== editando.clave))) {
      error = 'Ese festivo ya está en la lista.';
    }
    if (error) { err.textContent = error; err.hidden = false; return; }
    const nuevo = { fecha, nombre, tipo, origen: 'manual' };
    if (traslado) nuevo.trasladoDesde = traslado;
    cambiar(() => {
      const a = datosAnio();
      if (editando && editando.origen === 'oficial') {
        if (a.festivosOcultos.indexOf(editando.clave) < 0) a.festivosOcultos.push(editando.clave);
        a.festivosUsuario.push(Object.assign({ id: nuevoId('f') }, nuevo));
      } else if (editando) {
        const i = a.festivosUsuario.findIndex((x) => x.id === editando.id);
        if (i >= 0) a.festivosUsuario[i] = Object.assign({}, a.festivosUsuario[i], nuevo, { origen: a.festivosUsuario[i].origen });
      } else {
        a.festivosUsuario.push(Object.assign({ id: nuevoId('f') }, nuevo));
      }
    }, editando ? 'Festivo actualizado.' : `Festivo añadido: ${nombre}.`);
    limpiarFestivoForm();
  }

  function importarFestivos(e) {
    e.preventDefault();
    const texto = $('#fest-texto').value;
    const res = M.parseFestivos(texto);
    const salida = $('#fest-import-resultado');
    const anio = String(estado.config.anio);
    const existentes = new Set(calc.lista.filter((f) => !f.oculto).map((f) => f.fecha + '|' + f.nombre.toLowerCase()));
    const nuevos = [];
    let duplicados = 0, otroAnio = 0;
    res.festivos.forEach((f) => {
      const k = f.fecha + '|' + f.nombre.toLowerCase();
      if (f.fecha.slice(0, 4) !== anio) { otroAnio++; }
      if (existentes.has(k)) { duplicados++; return; }
      existentes.add(k);
      nuevos.push(Object.assign({ id: nuevoId('f'), origen: 'importado' }, f));
    });
    if (nuevos.length) {
      cambiar(() => { nuevos.forEach((f) => datosAnio(f.fecha.slice(0, 4)).festivosUsuario.push(f)); }, `${pl(nuevos.length, 'festivo importado', 'festivos importados')}.`);
      $('#fest-texto').value = '';
      $('#fest-archivo').value = '';
    }
    const partes = [pl(nuevos.length, 'festivo importado', 'festivos importados')];
    if (duplicados) partes.push(duplicados === 1 ? '1 ya estaba' : `${duplicados} ya estaban`);
    if (otroAnio) partes.push(`${otroAnio} de otros años (guardados en su año)`);
    if (res.errores.length) partes.push(`${res.errores.length} líneas no válidas: ${res.errores.slice(0, 3).join('; ')}${res.errores.length > 3 ? '…' : ''}`);
    salida.textContent = partes.join(' · ') + '.';
  }

  // ------------------------------------------------------------ Configuración

  function construirConfig() {
    $('#cfg-ccaa').innerHTML = '<option value="">Elige tu comunidad</option>' + R.lista.map((r) => `<option value="${r.codigo}">${esc(r.nombre)}</option>`).join('');
    $('#cfg-isla').innerHTML = '<option value="">Elige tu isla</option>' + F.islas.map((i) => `<option value="${esc(i)}">${esc(i)}</option>`).join('');
    $('#cfg-jornada').innerHTML = ORDEN_SEMANA.map((d) =>
      `<tr><th scope="row">${may(M.DIAS[d])}</th>` +
      `<td><label class="check"><input type="checkbox" id="cfg-trabaja-${d}" data-dia="${d}"> Sí</label></td>` +
      `<td><input type="text" id="cfg-horas-${d}" data-dia="${d}" inputmode="decimal" aria-label="Horas del ${M.DIAS[d]}"></td></tr>`).join('');
  }

  function opcionesProvincia() {
    const r = R.porCodigo[estado.config.ccaa];
    const sel = $('#cfg-provincia');
    const html = r ? (r.provincias.length > 1 ? '<option value="">Elige tu provincia</option>' : '') + r.provincias.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('')
      : '<option value="">Elige primero la comunidad</option>';
    if (sel.innerHTML !== html) sel.innerHTML = html;
    sel.disabled = !r;
  }

  function poner(sel, valor, forzar) {
    const el = $(sel);
    if (!forzar && document.activeElement === el) return;
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!valor;
    else el.value = valor == null ? '' : valor;
    el.removeAttribute('aria-invalid');
  }

  function rellenarConfig(forzar) {
    const c = estado.config;
    poner('#cfg-ccaa', c.ccaa, forzar);
    opcionesProvincia();
    poner('#cfg-provincia', c.provincia, forzar);
    poner('#cfg-municipio', c.municipio, forzar);
    $('#cfg-isla-campo').hidden = c.ccaa !== 'CN';
    poner('#cfg-isla', c.isla, forzar);
    poner('#cfg-modo-diaria', c.modoJornada === 'diaria', forzar);
    poner('#cfg-modo-semanal', c.modoJornada === 'semanal', forzar);
    $('#cfg-semanal').hidden = c.modoJornada !== 'semanal';
    poner('#cfg-horas-semanales', fn(c.horasSemanales), forzar);
    const ef = M.jornadaEfectiva(c);
    ORDEN_SEMANA.forEach((d) => {
      const semanal = c.modoJornada === 'semanal';
      poner('#cfg-trabaja-' + d, semanal ? c.diasSemanales[d] : c.jornada[d] > 0, forzar);
      poner('#cfg-horas-' + d, fn(ef[d]), forzar);
      $('#cfg-horas-' + d).disabled = semanal || !(c.jornada[d] > 0);
    });
    const total = ef.reduce((s, h) => s + h, 0), dias = ef.filter((h) => h > 0).length;
    $('#cfg-total-semana').textContent = `Total semanal: ${fh(total)} en ${dias} días.` + (c.modoJornada === 'semanal' ? ' Las horas se reparten por igual entre los días marcados.' : '');
    poner('#cfg-horas-exc', fn(c.horasExcepcional), forzar);
    poner('#cfg-entrada', c.entradaHabitual, forzar);
    poner('#cfg-salida', c.salidaHabitual, forzar);
    poner('#cfg-pausa', c.pausaHabitual, forzar);
    poner('#cfg-vac-dias', c.vacacionesDias, forzar);
    poner('#cfg-vac-laborables', c.vacacionesTipo === 'laborables', forzar);
    poner('#cfg-vac-naturales', c.vacacionesTipo === 'naturales', forzar);
    poner('#cfg-convenio', c.horasConvenio == null ? '' : fn(c.horasConvenio), forzar);
    poner('#cfg-obj-calendario', c.objetivo === 'calendario', forzar);
    poner('#cfg-obj-convenio', c.objetivo === 'convenio', forzar);
    poner('#cfg-traslados', c.aplicarTraslados, forzar);
    poner('#cfg-tema', c.tema, forzar);
  }

  function invalido(el, msg) {
    el.setAttribute('aria-invalid', 'true');
    toast(msg);
  }

  function enConfig(e) {
    const el = e.target;
    const c = estado.config;
    const id = el.id;
    const set = (fn, aviso) => { cambiar(fn, aviso); rellenarConfig(false); };
    if (id === 'cfg-ccaa') {
      set(() => {
        c.ccaa = el.value;
        const r = R.porCodigo[c.ccaa];
        c.provincia = r && r.provincias.length === 1 ? r.provincias[0] : '';
        if (c.ccaa !== 'CN') c.isla = '';
      });
    } else if (id === 'cfg-provincia') set(() => { c.provincia = el.value; });
    else if (id === 'cfg-municipio') set(() => { c.municipio = el.value.trim(); });
    else if (id === 'cfg-isla') set(() => { c.isla = el.value; });
    else if (id === 'cfg-anio') cambiarAnio(+el.value);
    else if (el.name === 'cfg-modo') set(() => { c.modoJornada = el.value; });
    else if (/^cfg-trabaja-/.test(id)) {
      const d = +el.dataset.dia;
      set(() => {
        if (c.modoJornada === 'semanal') c.diasSemanales[d] = el.checked;
        else c.jornada[d] = el.checked ? (c.jornada[d] > 0 ? c.jornada[d] : (Math.max(...c.jornada) || 8)) : 0;
      });
    } else if (/^cfg-horas-\d$/.test(id)) {
      const h = M.parseHoras(el.value);
      if (h == null || h > 24) return invalido(el, 'Horas no válidas. Usa un número entre 0 y 24, por ejemplo 7,5 o 7:30.');
      set(() => { c.jornada[+el.dataset.dia] = h; });
    } else if (id === 'cfg-horas-semanales') {
      const h = M.parseHoras(el.value);
      if (h == null || h > 168) return invalido(el, 'Horas semanales no válidas.');
      set(() => { c.horasSemanales = h; });
    } else if (id === 'cfg-horas-exc') {
      const h = M.parseHoras(el.value);
      if (h == null || h > 24) return invalido(el, 'Horas no válidas.');
      set(() => { c.horasExcepcional = h; });
    } else if (id === 'cfg-entrada') set(() => { c.entradaHabitual = el.value; });
    else if (id === 'cfg-salida') set(() => { c.salidaHabitual = el.value; });
    else if (id === 'cfg-pausa') {
      const v = Math.round(+el.value);
      if (!isFinite(v) || v < 0) return invalido(el, 'La pausa debe ser un número de minutos.');
      set(() => { c.pausaHabitual = v; });
    } else if (id === 'cfg-vac-dias') {
      const v = Math.round(+el.value);
      if (!isFinite(v) || v < 0 || v > 366) return invalido(el, 'Indica un número de días entre 0 y 366.');
      set(() => { c.vacacionesDias = v; });
    } else if (el.name === 'cfg-vac-tipo') set(() => { c.vacacionesTipo = el.value; });
    else if (id === 'cfg-convenio') {
      const txt = el.value.trim();
      const h = txt === '' ? null : M.parseHoras(txt.replace(/\.(?=\d{3}(\D|$))/g, ''));
      if (txt !== '' && (h == null || h <= 0 || h > 8784)) return invalido(el, 'Horas de convenio no válidas. Escribe, por ejemplo, 1780.');
      set(() => { c.horasConvenio = h; if (h == null) c.objetivo = 'calendario'; });
    } else if (el.name === 'cfg-objetivo') {
      if (el.value === 'convenio' && c.horasConvenio == null) { toast('Indica primero las horas anuales del convenio.'); rellenarConfig(true); return; }
      set(() => { c.objetivo = el.value; });
    } else if (id === 'cfg-traslados') set(() => { c.aplicarTraslados = el.checked; });
    else if (id === 'cfg-tema') { set(() => { c.tema = el.value; }); aplicarTema(); }
  }

  function cambiarAnio(anio) {
    if (!anio || anio === estado.config.anio) return;
    terminarModoRango();
    cambiar(() => { estado.config.anio = anio; });
    rellenarConfig(true);
    limpiarRegistroForm(false);
    limpiarFestivoForm();
  }

  // -------------------------------------------------------------------- Tema

  function aplicarTema() {
    const raiz = document.documentElement;
    const t = estado.config.tema;
    if (t === 'claro') raiz.setAttribute('data-theme', 'light');
    else if (t === 'oscuro') raiz.setAttribute('data-theme', 'dark');
    else if (TEMA_ORIGINAL) raiz.setAttribute('data-theme', TEMA_ORIGINAL);
    else raiz.removeAttribute('data-theme');
  }
  function temaOscuroActivo() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // ---------------------------------------------------------- Datos e informes

  function renderDatos() {
    const textos = {
      ok: 'Tus datos se guardan automáticamente en este navegador (almacenamiento local). No salen de tu dispositivo.',
      'no-disponible': 'Este navegador no permite guardar datos (modo privado o bloqueo de almacenamiento). Exporta una copia antes de cerrar.',
      error: 'El último cambio no se pudo guardar en el navegador. Exporta una copia para no perderlo.'
    };
    $('#info-almacenamiento').textContent = textos[almacenamiento] +
      (ES_IOS && !EN_PANTALLA_INICIO && !EN_MARCO ? ' En iPhone o iPad, pulsa Compartir y «Añadir a pantalla de inicio» para usarla como una app, también sin conexión.' : '');
    $('#nota-impresion').textContent = EN_MARCO
      ? 'En esta vista la impresión no está disponible: abre la aplicación desde los archivos de tu equipo para imprimir. Los informes se pueden consultar y exportar en CSV.'
      : 'Desde el informe puedes imprimir o guardar como PDF con el diálogo de impresión del navegador.';
  }

  function descargar(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  // Dentro del visor de claude.ai las descargas pasan por su capacidad "downloads".
  let descargasVisor;
  async function capacidadDescargas() {
    if (!EN_MARCO || !window.claude || typeof window.claude.use !== 'function') return null;
    if (descargasVisor === undefined) {
      try { descargasVisor = await window.claude.use('downloads'); } catch (e) { descargasVisor = null; }
    }
    return descargasVisor;
  }

  async function exportar(nombre, contenido, tipo, titulo) {
    if (!EN_MARCO) {
      // En iPhone y iPad la app de pantalla de inicio no descarga archivos de forma fiable:
      // se abre el menú Compartir, que incluye «Guardar en Archivos».
      if (ES_IOS && navigator.canShare && typeof File === 'function') {
        const archivo = new File([contenido], nombre, { type: tipo.split(';')[0] });
        if (navigator.canShare({ files: [archivo] })) {
          try {
            await navigator.share({ files: [archivo], title: nombre });
            toast(`Archivo preparado: ${nombre}`);
            return;
          } catch (e) {
            if (e && e.name === 'AbortError') return;
          }
        }
      }
      descargar(nombre, contenido, tipo);
      toast(`Archivo descargado: ${nombre}`);
      return;
    }
    const visor = await capacidadDescargas();
    if (visor) {
      try {
        await visor.save({ filename: nombre, data: contenido });
        toast(`Archivo guardado: ${nombre}`);
        return;
      } catch (e) {
        const codigo = e && e.code;
        if (codigo === 'declined') { toast('Descarga cancelada.'); return; }
        if (codigo === 'rate_limited') { toast('Ya hay una descarga pendiente de confirmar.'); return; }
        // Cualquier otro motivo: se ofrece el contenido para copiarlo.
      }
    }
    $('#texto-titulo').textContent = titulo;
    $('#texto-nota').textContent = `Copia este contenido y guárdalo en un archivo llamado ${nombre}.`;
    $('#texto-contenido').value = contenido;
    $('#texto-descargar').hidden = true;
    $('#texto-descargar').onclick = () => descargar(nombre, contenido, tipo);
    $('#dlg-texto').showModal();
  }

  function exportarJSON() {
    const copia = Object.assign({ exportado: new Date().toISOString() }, estado);
    exportar(`jornada-anual-copia-${M.hoyISO()}.json`, JSON.stringify(copia, null, 2), 'application/json', 'Copia de seguridad');
  }

  function csv(filas) { return '﻿' + M.aCSV(filas); }

  function exportarCSVAnual() {
    const ef = calc.estadoFest;
    const filas = M.filasResumenAnual(calc, estado.config, { ccaa: nombreRegion(), fuente: ef.fuente ? ef.fuente.ref : 'sin datos oficiales' });
    exportar(`resumen-jornada-${estado.config.anio}.csv`, csv(filas), 'text/csv;charset=utf-8', 'Resumen anual (CSV)');
  }

  function exportarCSVRegistros() {
    const filas = [['Fecha', 'Entrada', 'Salida', 'Pausa (min)', 'Horas efectivas', 'Horas extra', 'Horas previstas', 'Comentario']];
    calc.registros.forEach((x) => filas.push([M.fechaCorta(x.fecha), x.entrada, x.salida, x.pausa, x.horasEfectivas, x.horasExtra, x.planDia, x.comentario]));
    exportar(`registros-horas-${estado.config.anio}.csv`, csv(filas), 'text/csv;charset=utf-8', 'Registros de horas (CSV)');
  }

  function exportarCSVMes() {
    const mes = +$('#mes-informe').value;
    exportar(`jornada-${estado.config.anio}-${String(mes).padStart(2, '0')}.csv`, csv(M.filasMes(calc, mes)), 'text/csv;charset=utf-8', 'Informe mensual (CSV)');
  }

  function exportarFestivosCSV() {
    const filas = [['fecha', 'nombre', 'tipo', 'trasladado_desde', 'origen']];
    calc.lista.filter((f) => !f.oculto).forEach((f) => filas.push([M.fechaCorta(f.fecha), f.nombre, M.NOMBRE_TIPO[f.tipo].toLowerCase(), f.trasladoDesde ? M.fechaCorta(f.trasladoDesde) : '', f.origen]));
    exportar(`festivos-${estado.config.anio}.csv`, csv(filas), 'text/csv;charset=utf-8', 'Festivos (CSV)');
  }

  async function importarCopia(e) {
    e.preventDefault();
    const err = $('#json-error');
    err.hidden = true;
    let texto = $('#json-texto').value.trim();
    const archivo = $('#json-archivo').files[0];
    if (!texto && archivo) texto = await archivo.text();
    if (!texto) { err.textContent = 'Elige un archivo de copia o pega su contenido.'; err.hidden = false; return; }
    let nuevo;
    try {
      nuevo = M.normalizarEstado(JSON.parse(texto), ANIO_HOY);
    } catch (ex) {
      err.textContent = 'No se puede importar: ' + (ex instanceof SyntaxError ? 'el contenido no es un JSON válido.' : ex.message);
      err.hidden = false;
      return;
    }
    const anios = Object.keys(nuevo.anios).length;
    const ok = await confirmar(`Se sustituirán tus datos actuales por los de la copia (${anios} ${anios === 1 ? 'año' : 'años'} con datos). Podrás deshacerlo mientras no cierres la aplicación.`, { titulo: 'Importar copia de seguridad', boton: 'Importar' });
    if (!ok) return;
    cambiar(() => { estado = nuevo; }, 'Copia importada.');
    aplicarTema();
    rellenarConfig(true);
    $('#json-texto').value = '';
    $('#json-archivo').value = '';
  }

  function periodos(cat) {
    const res = [];
    let actual = null;
    calc.dias.forEach((d) => {
      if (d.cat !== cat) return;
      const lab = d.horasJornada > 0 ? d.fraccionAusencia : 0;
      if (actual && M.sumarDias(actual.hasta, 1) === d.fecha && !d.ausenciaParcial && !actual.parcial) {
        actual.hasta = d.fecha; actual.n++; actual.lab += lab; actual.horas += d.horasAusencia;
      } else {
        actual = { desde: d.fecha, hasta: d.fecha, n: 1, lab, horas: d.horasAusencia, parcial: d.ausenciaParcial };
        res.push(actual);
      }
    });
    return res;
  }


  function miniAnio() {
    const anio = estado.config.anio;
    let h = '<div class="mini-anio">';
    for (let m = 1; m <= 12; m++) {
      h += `<div class="mini-mes"><h3>${M.MESES[m - 1]}</h3><div class="mini-mes__dias">`;
      const hueco = (M.diaSemana(M.iso(anio, m, 1)) + 6) % 7;
      for (let i = 0; i < hueco; i++) h += '<span></span>';
      for (let d = 1, n = M.diasEnMes(anio, m); d <= n; d++) {
        const info = calc.porFecha[M.iso(anio, m, d)];
        h += `<span class="cat-${info.cat}${info.ausenciaParcial ? ' dia--parcial' : ''}" title="${esc(M.NOMBRE_CAT[info.cat])}">${d}</span>`;
      }
      h += '</div></div>';
    }
    return h + '</div><ul class="leyenda-grafico">' + M.CATEGORIAS.map((c) => `<li><span class="tipo-punto cat-${c.id}"></span>${c.nombre}</li>`).join('') + '</ul>';
  }

  function cabeceraInforme(titulo) {
    const c = estado.config;
    const ef = calc.estadoFest;
    const lugar = [nombreRegion() || 'Sin comunidad', c.isla, c.municipio].filter(Boolean).join(' · ');
    const jornada = ORDEN_SEMANA.map((d) => `${INICIAL[d]} ${fn(calc.ctx.jornada[d])} h`).join(', ');
    return `<h1>${esc(titulo)}</h1><p class="informe__meta">${esc(lugar)} · Generado el ${M.fechaCorta(M.hoyISO())}<br>Jornada: ${jornada}. Festivos: ${ef.fuente ? esc(ef.fuente.ref) + ' (' + ef.estado + ')' : 'sin datos oficiales'}.</p>`;
  }

  function informeAnual() {
    const r = calc.resumen;
    let h = cabeceraInforme(`Informe anual de jornada ${r.anio}`);
    h += '<h2>Resumen</h2><table class="tabla"><tbody>' + filasDesglose(r).map((f) => `<tr><td>${f[0]}. ${f[1]}</td><td class="num">${f[2]}</td><td>${f[3]}</td></tr>`).join('') + '</tbody></table>';
    h += `<p class="cuadre">${esc($('#cuadre').textContent)}</p>`;
    h += '<h2>Calendario</h2>' + miniAnio();
    h += '<h2>Horas por mes</h2><div class="tabla-desplazable"><table class="tabla">' + $('#tabla-meses').innerHTML + '</table></div>';
    h += '<h2>Festivos aplicados</h2><table class="tabla"><thead><tr><th>Fecha</th><th>Festivo</th><th>Tipo</th><th>¿Resta horas?</th></tr></thead><tbody>' +
      calc.lista.filter((f) => !f.oculto).map((f) => {
        const d = calc.porFecha[f.fecha];
        const resta = d && M.esFestivo(d.cat) && d.horasJornada > 0;
        return `<tr><td>${M.fechaCorta(f.fecha)} (${M.DIAS[M.diaSemana(f.fecha)]})</td><td>${esc(f.nombre)}</td><td>${M.NOMBRE_TIPO[f.tipo]}</td><td>${resta ? 'Sí, ' + fh(d.horasJornada) : 'No'}</td></tr>`;
      }).join('') + '</tbody></table>';
    const vac = periodos('vacaciones'), per = periodos('permiso'), trab = calc.dias.filter((d) => d.cat === 'trabajado');
    const lista = (ps) => ps.length ? '<ul>' + ps.map((p) => `<li>${M.fechaCorta(p.desde)}${p.hasta !== p.desde ? ' – ' + M.fechaCorta(p.hasta) : ''}: ${pl(p.n, 'día natural', 'días naturales')}, ${fn(p.lab)} de jornada${p.horas ? ` (${fh(p.horas)})` : ''}</li>`).join('') + '</ul>' : '<p class="nota">Ninguno.</p>';
    h += `<h2>Vacaciones (${fn(r.vacaciones.usadas)} de ${r.vacaciones.derecho} días ${r.vacaciones.tipo}, ${fh(r.vacacionesHoras)})</h2>` + lista(vac);
    h += '<h2>Permisos y otros días libres</h2>' + lista(per);
    h += '<h2>Días trabajados excepcionalmente</h2>' + (trab.length ? '<ul>' + trab.map((d) => `<li>${M.fechaCorta(d.fecha)}: ${fh(d.horasPlan)}</li>`).join('') + '</ul>' : '<p class="nota">Ninguno.</p>');
    const ef = calc.estadoFest;
    h += '<h2>Notas</h2><ul class="nota">' + ef.notas.map((n) => `<li>${esc(n)}</li>`).join('') +
      '<li>Las horas de convenio se muestran aparte del cálculo del calendario: cada convenio define cómo se computa la jornada anual.</li>' +
      '<li>Los festivos locales deben comprobarse en el boletín oficial de la provincia o comunidad.</li></ul>';
    abrirInforme(h);
  }

  function informeMensual() {
    const mes = +$('#mes-informe').value;
    const r = calc.meses[mes - 1];
    const anio = estado.config.anio;
    let h = cabeceraInforme(`Informe mensual de jornada · ${M.MESES[mes - 1]} de ${anio}`);
    const dif = r.horasRegistradas - r.horasPlan;
    h += `<h2>Resumen del mes</h2><table class="tabla"><tbody>
      <tr><td>Días efectivos</td><td class="num">${r.diasEfectivos}</td></tr>
      <tr><td>Horas previstas</td><td class="num">${fh(r.horasPlan)}</td></tr>
      <tr><td>Horas registradas</td><td class="num">${fh(r.horasRegistradas)}</td></tr>
      <tr><td>Diferencia</td><td class="num">${fs(dif)}</td></tr>
      <tr><td>Horas extraordinarias</td><td class="num">${fh(r.extras)}</td></tr>
      <tr><td>Festivos, vacaciones y permisos en días de trabajo</td><td class="num">${r.festivosLab} · ${fn(r.vacacionesLab)} · ${fn(r.permisosLab)}</td></tr></tbody></table>`;
    const filas = M.filasMes(calc, mes);
    h += '<h2>Detalle por día</h2><div class="tabla-desplazable"><table class="tabla"><thead><tr>' + filas[0].map((c) => `<th>${esc(c)}</th>`).join('') + '</tr></thead><tbody>' +
      filas.slice(1).map((f) => `<tr>${f.map((c, i) => `<td${i >= 4 && i <= 7 ? ' class="num"' : ''}>${typeof c === 'number' ? (i === 6 ? fs(c) : fh(c)) : esc(c)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';
    const regs = calc.registros.filter((x) => M.partes(x.fecha).m === mes);
    h += '<h2>Registros del mes</h2>' + (regs.length
      ? '<table class="tabla"><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th class="num">Pausa</th><th class="num">Efectivas</th><th class="num">Extra</th><th>Comentario</th></tr></thead><tbody>' +
        regs.map((x) => `<tr><td>${M.fechaCorta(x.fecha)}</td><td>${esc(x.entrada || '—')}</td><td>${esc(x.salida || '—')}</td><td class="num">${x.pausa || 0} min</td><td class="num">${fh(x.horasEfectivas)}</td><td class="num">${fh(x.horasExtra)}</td><td>${esc(x.comentario)}</td></tr>`).join('') + '</tbody></table>'
      : '<p class="nota">No hay registros este mes.</p>');
    abrirInforme(h);
  }

  function abrirInforme(html) {
    $('#inf-contenido').innerHTML = html;
    $('#inf-imprimir').hidden = EN_MARCO;
    $('#inf-nota').textContent = EN_MARCO ? 'La impresión no está disponible en esta vista. Abre la aplicación desde tu equipo para imprimir.' : '';
    $('#informe').hidden = false;
    $('#informe').scrollTop = 0;
    $('#inf-cerrar').focus();
  }
  function cerrarInforme() {
    $('#informe').hidden = true;
    $('#inf-contenido').innerHTML = '';
  }

  // ----------------------------------------------------------- Utilidades UI

  let temporizadorToast;
  function toast(texto, conDeshacer) {
    const el = $('#toast');
    $('#toast-texto').textContent = texto;
    $('#toast-accion').hidden = !conDeshacer;
    el.hidden = false;
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => { el.hidden = true; }, conDeshacer ? 7000 : 4000);
  }

  function confirmar(texto, opciones = {}) {
    return new Promise((resolver) => {
      const d = $('#dlg-confirmar');
      $('#conf-titulo').textContent = opciones.titulo || '¿Seguro?';
      $('#conf-texto').textContent = texto;
      $('#conf-aceptar').textContent = opciones.boton || 'Confirmar';
      const fin = (v) => {
        $('#conf-aceptar').onclick = null;
        $('#conf-cancelar').onclick = null;
        d.oncancel = null;
        if (d.open) d.close();
        resolver(v);
      };
      $('#conf-aceptar').onclick = () => fin(true);
      $('#conf-cancelar').onclick = () => fin(false);
      d.oncancel = (e) => { e.preventDefault(); fin(false); };
      d.showModal();
      $('#conf-cancelar').focus();
    });
  }

  function irA(pestana, foco) {
    const tabs = $$('.pestana');
    if (!tabs.some((t) => t.id === 'tab-' + pestana)) pestana = 'calendario';
    ui.pestana = pestana;
    tabs.forEach((t) => {
      const activa = t.id === 'tab-' + pestana;
      t.setAttribute('aria-selected', String(activa));
      t.tabIndex = activa ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !activa;
    });
    if (foco) { const el = $(foco); if (el) el.focus(); }
  }

  // ------------------------------------------------------------------ Eventos

  function enlazar() {
    // Pestañas
    $('.pestanas__lista').addEventListener('click', (e) => {
      const t = e.target.closest('.pestana');
      if (t) irA(t.id.replace('tab-', ''));
    });
    $('.pestanas__lista').addEventListener('keydown', (e) => {
      const tabs = $$('.pestana');
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n == null) return;
      e.preventDefault();
      irA(tabs[n].id.replace('tab-', ''));
      tabs[n].focus();
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ir]');
      if (b) {
        const destinos = { config: '#cfg-ccaa', festivos: '#fest-fecha' };
        irA(b.dataset.ir, destinos[b.dataset.ir]);
        window.scrollTo({ top: 0 });
      }
    });

    // Año y acciones de cabecera
    $('#anio-sel').addEventListener('change', (e) => cambiarAnio(+e.target.value));
    $('#anio-anterior').addEventListener('click', () => cambiarAnio(estado.config.anio - 1));
    $('#anio-siguiente').addEventListener('click', () => cambiarAnio(estado.config.anio + 1));
    $('#btn-deshacer').addEventListener('click', deshacer);
    $('#btn-rehacer').addEventListener('click', rehacer);
    $('#toast-accion').addEventListener('click', () => { $('#toast').hidden = true; deshacer(); });
    $('#btn-tema').addEventListener('click', () => {
      cambiar(() => { estado.config.tema = temaOscuroActivo() ? 'claro' : 'oscuro'; });
      aplicarTema();
      rellenarConfig(true);
    });
    document.addEventListener('keydown', (e) => {
      const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.ctrlKey || e.metaKey) && !enCampo && !document.querySelector('dialog[open]')) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); deshacer(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); rehacer(); }
      }
      if (e.key === 'Escape') {
        if (!$('#informe').hidden) cerrarInforme();
        else if (ui.modoRango && !document.querySelector('dialog[open]')) activarModoRango(false);
      }
    });

    // Calendario
    const meses = $('#meses');
    meses.addEventListener('click', (e) => {
      const b = e.target.closest('[data-fecha]');
      if (b) clicDia(b.dataset.fecha, e.shiftKey);
    });
    meses.addEventListener('keydown', (e) => {
      const b = e.target.closest('[data-fecha]');
      if (!b) return;
      const f = b.dataset.fecha;
      const dow = (M.diaSemana(f) + 6) % 7;
      const p = M.partes(f);
      let n = null;
      if (e.key === 'ArrowLeft') n = M.sumarDias(f, -1);
      else if (e.key === 'ArrowRight') n = M.sumarDias(f, 1);
      else if (e.key === 'ArrowUp') n = M.sumarDias(f, -7);
      else if (e.key === 'ArrowDown') n = M.sumarDias(f, 7);
      else if (e.key === 'Home') n = M.sumarDias(f, -dow);
      else if (e.key === 'End') n = M.sumarDias(f, 6 - dow);
      else if (e.key === 'PageUp' && p.m > 1) n = M.iso(p.y, p.m - 1, Math.min(p.d, M.diasEnMes(p.y, p.m - 1)));
      else if (e.key === 'PageDown' && p.m < 12) n = M.iso(p.y, p.m + 1, Math.min(p.d, M.diasEnMes(p.y, p.m + 1)));
      if (!n) return;
      e.preventDefault();
      if (n.slice(0, 4) !== String(estado.config.anio)) return;
      const prev = meses.querySelector('[tabindex="0"]');
      if (prev) prev.tabIndex = -1;
      const nb = meses.querySelector(`[data-fecha="${n}"]`);
      nb.tabIndex = 0;
      nb.focus();
      ui.foco = n;
    });
    $('#btn-modo-rango').addEventListener('click', () => activarModoRango(!ui.modoRango));
    $('#btn-periodo').addEventListener('click', () => abrirRango(ui.foco, ui.foco));
    $('#btn-restablecer-anio').addEventListener('click', async () => {
      const n = Object.keys(datosAnio().dias).length;
      if (!n) { toast('El calendario de este año no tiene cambios manuales.'); return; }
      const ok = await confirmar(`Se quitarán ${n === 1 ? 'el día cambiado' : `los ${n} días cambiados`} a mano en ${estado.config.anio} (categorías, horas y notas). Los festivos y los registros de horas no se tocan.`, { titulo: 'Restablecer calendario', boton: 'Restablecer' });
      if (ok) cambiar(() => { datosAnio().dias = {}; }, 'Calendario restablecido.');
    });

    // Diálogos: botones de cierre
    $$('[data-cerrar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
    $('#dlg-dia').addEventListener('close', () => {
      const f = ui.diaAbierto;
      ui.diaAbierto = null;
      const b = f && $(`#meses [data-fecha="${f}"]`);
      if (b && ui.pestana === 'calendario') {
        const prev = $('#meses [tabindex="0"]');
        if (prev) prev.tabIndex = -1;
        b.tabIndex = 0;
        b.focus();
      }
    });
    $('#dlg-rango').addEventListener('close', () => { if (ui.modoRango) activarModoRango(false); });

    // Diálogo de día
    $('#dia-cats').addEventListener('change', (e) => {
      const f = ui.diaAbierto;
      if (!f || e.target.name !== 'dia-cat') return;
      const cat = e.target.value || null;
      cambiar(() => {
        const a = datosAnio();
        a.dias = M.aplicarCategoria(a.dias, [f], cat, calc.ctx);
      });
    });
    $('#dia-horas').addEventListener('change', (e) => {
      const f = ui.diaAbierto;
      const txt = e.target.value.trim();
      const h = txt === '' ? null : M.parseHoras(txt);
      if (txt !== '' && (h == null || h > 24)) {
        e.target.setAttribute('aria-invalid', 'true');
        $('#dia-horas-ayuda').textContent = 'Valor no válido. Escribe un número de horas entre 0 y 24, por ejemplo 7,5 o 7:30.';
        return;
      }
      cambiarDia(f, (o) => { if (h == null) delete o.horas; else o.horas = h; });
    });
    $('#dia-ausencia').addEventListener('change', (e) => {
      const f = ui.diaAbierto;
      const d = calc.porFecha[f];
      const txt = e.target.value.trim();
      const h = txt === '' ? null : M.parseHoras(txt);
      if (txt !== '' && (h == null || h <= 0 || h > d.horasJornada)) {
        e.target.setAttribute('aria-invalid', 'true');
        $('#dia-horas-ayuda').textContent = `Valor no válido. Escribe un número de horas mayor que 0 y como mucho ${fh(d.horasJornada)} (tu jornada de ese día), por ejemplo 2 o 1:30.`;
        return;
      }
      cambiarDia(f, (o) => { if (h == null || h >= d.horasJornada) delete o.horasAusencia; else o.horasAusencia = h; });
    });
    $('#dia-nota').addEventListener('change', (e) => {
      const txt = e.target.value.trim();
      cambiarDia(ui.diaAbierto, (o) => { if (txt) o.nota = txt; else delete o.nota; });
    });
    $('#dia-restablecer').addEventListener('click', () => {
      const f = ui.diaAbierto;
      if (!datosAnio().dias[f]) { toast('Este día no tiene cambios manuales.'); return; }
      cambiar(() => { delete datosAnio().dias[f]; }, `Día ${M.fechaCorta(f)} restablecido.`);
    });
    $('#dia-registrar').addEventListener('click', () => {
      const f = ui.diaAbierto;
      $('#dlg-dia').close();
      irA('registro');
      limpiarRegistroForm(false);
      $('#reg-fecha').value = f;
      usarHorarioHabitual();
      $('#reg-entrada').focus();
    });

    // Diálogo de periodo
    $('#form-rango').addEventListener('submit', aplicarRango);
    $('#rango-cat').addEventListener('change', () => { predeterminadosRango(); vistaRango(); });
    ['#rango-desde', '#rango-hasta', '#rango-festivos', '#rango-jornada'].forEach((s) => $(s).addEventListener('change', vistaRango));
    ['#rango-desde', '#rango-hasta'].forEach((s) => $(s).addEventListener('input', vistaRango));

    // Registro
    $('#form-registro').addEventListener('submit', guardarRegistro);
    $('#form-registro').addEventListener('input', vistaRegistro);
    $('#reg-habitual').addEventListener('click', usarHorarioHabitual);
    $('#reg-cancelar').addEventListener('click', () => limpiarRegistroForm(false));
    $('#reg-mes').addEventListener('change', renderRegistro);
    $('#tabla-registros').addEventListener('click', (e) => {
      const ed = e.target.closest('[data-editar-reg]');
      const bo = e.target.closest('[data-borrar-reg]');
      if (ed) editarRegistro(ed.dataset.editarReg);
      if (bo) borrarRegistro(bo.dataset.borrarReg);
    });

    // Festivos
    $('#form-festivo').addEventListener('submit', guardarFestivo);
    $('#fest-cancelar').addEventListener('click', limpiarFestivoForm);
    $('#form-importar-fest').addEventListener('submit', importarFestivos);
    $('#fest-archivo').addEventListener('change', async (e) => {
      const archivo = e.target.files[0];
      if (!archivo) return;
      $('#fest-texto').value = await archivo.text();
      $('#fest-import-resultado').textContent = `Archivo «${archivo.name}» cargado. Revisa el contenido y pulsa Importar.`;
    });
    $('#fest-exportar').addEventListener('click', exportarFestivosCSV);
    $('#fest-restaurar').addEventListener('click', () => cambiar(() => { datosAnio().festivosOcultos = []; }, 'Festivos oficiales restaurados.'));
    $('#pan-festivos').addEventListener('click', async (e) => {
      const ed = e.target.closest('[data-editar-fest]');
      const qu = e.target.closest('[data-quitar-fest]');
      const bo = e.target.closest('[data-borrar-fest]');
      const re = e.target.closest('[data-restaurar-fest]');
      if (ed) editarFestivo(ed.dataset.editarFest);
      if (qu) {
        const f = calc.lista.find((x) => x.clave === qu.dataset.quitarFest);
        cambiar(() => { const a = datosAnio(); if (a.festivosOcultos.indexOf(f.clave) < 0) a.festivosOcultos.push(f.clave); }, `Quitado: ${f.nombre}.`);
      }
      if (bo) {
        const f = datosAnio().festivosUsuario.find((x) => x.id === bo.dataset.borrarFest);
        if (f && await confirmar(`Se eliminará «${f.nombre}» (${M.fechaCorta(f.fecha)}).`, { titulo: 'Eliminar festivo', boton: 'Eliminar' })) {
          cambiar(() => { const a = datosAnio(); a.festivosUsuario = a.festivosUsuario.filter((x) => x.id !== f.id); }, 'Festivo eliminado.');
        }
      }
      if (re) cambiar(() => { const a = datosAnio(); a.festivosOcultos = a.festivosOcultos.filter((k) => k !== re.dataset.restaurarFest); }, 'Festivo restaurado.');
    });

    // Configuración
    $('#form-config').addEventListener('change', enConfig);
    $('#form-config').addEventListener('submit', (e) => e.preventDefault());

    // Datos
    $('#btn-exportar-json').addEventListener('click', exportarJSON);
    $('#form-importar-json').addEventListener('submit', importarCopia);
    $('#btn-csv-anual').addEventListener('click', exportarCSVAnual);
    $('#btn-csv-registros').addEventListener('click', exportarCSVRegistros);
    $('#btn-csv-mensual').addEventListener('click', exportarCSVMes);
    $('#btn-informe-anual').addEventListener('click', informeAnual);
    $('#btn-informe-mensual').addEventListener('click', informeMensual);
    $('#inf-cerrar').addEventListener('click', cerrarInforme);
    $('#inf-imprimir').addEventListener('click', () => window.print());
    $('#btn-borrar-todo').addEventListener('click', async () => {
      const ok = await confirmar('Se borrarán la configuración, los cambios del calendario, los festivos añadidos y todos los registros de horas de este navegador.', { titulo: 'Borrar todos los datos', boton: 'Borrar todo' });
      if (!ok) return;
      cambiar(() => { estado = M.estadoInicial(ANIO_HOY); }, 'Datos borrados.');
      aplicarTema();
      rellenarConfig(true);
    });
    $('#texto-copiar').addEventListener('click', () => {
      const area = $('#texto-contenido');
      const seleccionar = () => { area.focus(); area.select(); toast('Texto seleccionado: cópialo con Ctrl+C o Cmd+C.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(area.value).then(() => toast('Copiado al portapapeles.'), seleccionar);
      } else seleccionar();
    });

    // Cambios hechos en otra pestaña
    window.addEventListener('storage', (e) => {
      if (e.key !== CLAVE || !e.newValue) return;
      try {
        estado = M.normalizarEstado(JSON.parse(e.newValue), ANIO_HOY);
        aplicarTema();
        rellenarConfig(true);
        renderizar();
        toast('Datos actualizados desde otra ventana.');
      } catch (_) { /* ignorar datos ajenos */ }
    });
  }

  // ------------------------------------------------- API para otros módulos

  const extensiones = [];
  let cacheFestivos = {};
  // ¿Es festivo esta fecha en la ubicación configurada? (oficiales y añadidos a mano)
  function festivoEn(f) {
    const y = f.slice(0, 4);
    if (!cacheFestivos[y]) {
      const c = estado.config;
      const a = estado.anios[y] || M.datosAnioVacio();
      const oficiales = M.festivosOficiales(F, +y, { ccaa: c.ccaa, isla: c.isla, municipio: c.municipio, aplicarTraslados: c.aplicarTraslados });
      cacheFestivos[y] = new Set(M.combinarFestivos(oficiales, a.festivosUsuario, a.festivosOcultos).filter((x) => !x.oculto).map((x) => x.fecha));
    }
    return cacheFestivos[y].has(f);
  }

  window.JornadaApp = {
    estado: () => estado,
    cambiar,
    toast,
    confirmar,
    exportar,
    csv,
    festivoEn,
    nombreRegion,
    alRenderizar: (fn) => { extensiones.push(fn); fn(); }
  };

  function registrarServiceWorker() {
    if (EN_MARCO || !('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo sin conexión */ });
  }

  function iniciar() {
    const primeraVez = cargar();
    construirConfig();
    construirCategoriasDia();
    construirOpcionesRango();
    construirMesesSelect();
    aplicarTema();
    enlazar();
    rellenarConfig(true);
    renderizar();
    const inicial = (location.hash || '').replace('#', '');
    irA(['calendario', 'resultados', 'registro', 'festivos', 'equipo', 'config', 'datos'].indexOf(inicial) >= 0 ? inicial : 'calendario');
    limpiarRegistroForm(false);
    if (primeraVez) persistir();
    if (mensajeInicio) toast(mensajeInicio);
    else if (almacenamiento === 'no-disponible') toast('Este navegador no permite guardar datos. Exporta una copia antes de cerrar.');
    registrarServiceWorker();
    window.__jornada = { estado: () => estado, calc: () => calc };
  }

  iniciar();
})();
