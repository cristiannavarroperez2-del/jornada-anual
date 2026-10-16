/*
 * Pestaña «Vacaciones del equipo».
 * Depende de motor.js, equipo.js y app.js (window.JornadaApp), cargados antes.
 */
(function () {
  'use strict';

  const A = window.JornadaApp;
  const E = window.Equipo;
  const M = window.Motor;
  if (!A || !E || !M) return;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fn = M.formatoNumero;
  const fh = M.formatoHoras;
  const pl = (n, uno, varios) => `${fn(n)} ${n === 1 ? uno : varios}`;
  const ORDEN = [1, 2, 3, 4, 5, 6, 0];
  const INICIAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const CAMPOS = [
    { id: 'trabajador', etq: 'Trabajador' },
    { id: 'fecha', etq: 'Fecha', filas: true },
    { id: 'desde', etq: 'Desde (periodo)', filas: true },
    { id: 'hasta', etq: 'Hasta (periodo)', filas: true },
    { id: 'horas', etq: 'Horas', filas: true },
    { id: 'tipo', etq: 'Tipo o concepto', filas: true }
  ];
  const MAX_FILAS = 50000;

  let resultado = null;
  let firmaSelects = '';

  // Por defecto, la jornada y los días de vacaciones de tu propia configuración.
  const ajustesPorDefecto = () => {
    const cfg = A.estado().config;
    const jornada = M.jornadaEfectiva(cfg);
    return { horasDia: Math.max.apply(null, jornada) || 8, jornada, derecho: cfg.vacacionesDias || 22, anio: 'auto' };
  };
  const equipo = () => A.estado().equipo || null;
  const ajustes = () => { const e = equipo(); return (e && e.ajustes) || ajustesPorDefecto(); };

  // Toda modificación pasa por la de la aplicación: deshacer, guardado y repintado.
  function cambiarEquipo(fn, aviso) {
    A.cambiar(() => {
      const est = A.estado();
      if (!est.equipo) est.equipo = { tabla: null, origen: {}, mapeo: null, ajustes: ajustesPorDefecto(), trabajadores: {} };
      if (!est.equipo.ajustes) est.equipo.ajustes = ajustesPorDefecto();
      if (!est.equipo.trabajadores) est.equipo.trabajadores = {};
      fn(est.equipo);
    }, aviso);
  }

  function poner(el, valor) {
    if (document.activeElement === el) return;
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!valor;
    else el.value = valor == null ? '' : valor;
    el.removeAttribute('aria-invalid');
  }

  // ------------------------------------------------------------- Pintado

  function construirJornada() {
    $('#eq-jornada-cab').innerHTML = ORDEN.map((d) => `<th scope="col">${INICIAL[d]}</th>`).join('');
    $('#eq-jornada').innerHTML = ORDEN.map((d) => `<td><input type="text" inputmode="decimal" id="eq-jornada-${d}" data-dia="${d}" aria-label="Horas del ${M.DIAS[d]}"></td>`).join('');
  }

  function rellenarAjustes() {
    const aj = ajustes();
    const e = equipo();
    const hayDatos = !!(e && e.tabla);
    const modo = hayDatos && e.mapeo ? e.mapeo.modo : 'fecha';
    poner($('#eq-modo-fecha'), modo === 'fecha');
    poner($('#eq-modo-horas'), modo === 'horas');
    $('#eq-modo-fecha').disabled = $('#eq-modo-horas').disabled = !hayDatos || (e.mapeo && e.mapeo.formato === 'cuadrante');
    poner($('#eq-horas-dia'), fn(aj.horasDia));
    poner($('#eq-derecho'), aj.derecho);
    ORDEN.forEach((d) => poner($('#eq-jornada-' + d), fn(aj.jornada[d])));
    const region = A.nombreRegion();
    $('#eq-explicacion').textContent = (modo === 'fecha'
      ? 'Cada fecha con vacaciones cuenta como un día. Si las horas son menos que la jornada de ese día de la semana, cuenta la parte proporcional (4 h de 8 h = 0,5 días).'
      : 'Se suman las horas de cada trabajador y se dividen entre sus horas por día (8 h = 1 día).') +
      ' Los periodos desde–hasta cuentan los días de jornada que no son festivo' + (region ? ` en ${region}` : '') +
      '. Si un trabajador tiene otra jornada, cambia sus horas por día en la tabla.';
  }

  function opcionesAnio(anios) {
    const aj = ajustes();
    const auto = anioAutomatico(anios);
    const html = `<option value="auto">Automático${auto ? ` (${auto})` : ''}</option>` +
      anios.map((y) => `<option value="${y}">${y}</option>`).join('') + '<option value="todos">Todos los años</option>';
    const sel = $('#eq-anio');
    if (sel.innerHTML !== html) sel.innerHTML = html;
    sel.value = aj.anio === 'todos' || anios.indexOf(aj.anio) >= 0 ? aj.anio : 'auto';
  }

  function anioAutomatico(anios) {
    if (!anios.length) return null;
    const cfg = String(A.estado().config.anio);
    return anios.indexOf(cfg) >= 0 ? cfg : anios[anios.length - 1];
  }

  function anioElegido(anios) {
    const a = ajustes().anio;
    if (a === 'todos') return null;
    if (/^\d{4}$/.test(a) && anios.indexOf(a) >= 0) return a;
    return anioAutomatico(anios);
  }

  function opcionesColumnas(nombres, valor) {
    return '<option value="">— Ninguna —</option>' + nombres.map((n, i) => `<option value="${i}"${i === valor ? ' selected' : ''}>${esc(n)}</option>`).join('');
  }

  function renderColumnas(tabla, m) {
    const nombres = E.nombresColumnas(tabla, m.cabecera);
    const cuadrante = m.formato === 'cuadrante';
    const firma = [tabla.length, E.ancho(tabla), m.cabecera, m.formato, String(tabla[m.cabecera])].join('|');
    if (firma !== firmaSelects) {
      firmaSelects = firma;
      const filasCab = tabla.slice(0, Math.min(tabla.length, 30)).map((f, i) => {
        const t = f.map((c) => E.texto(c)).filter(Boolean).join(' · ');
        return `<option value="${i}">Fila ${i + 1}: ${esc(t.length > 60 ? t.slice(0, 60) + '…' : t)}</option>`;
      }).join('');
      let html = `<label class="campo">Fila con los títulos<select data-campo="cabecera">${filasCab}</select></label>` +
        '<label class="campo">Forma del archivo<select data-campo="formato"><option value="filas">Una fila por registro</option><option value="cuadrante">Cuadrante (una columna por día)</option></select></label>';
      CAMPOS.forEach((c) => {
        if (cuadrante && c.filas) return;
        html += `<label class="campo">${c.etq}<select data-campo="${c.id}">${opcionesColumnas(nombres, m[c.id])}</select></label>`;
      });
      if (cuadrante) html += '<label class="campo">Código de vacaciones en el cuadrante<input type="text" data-campo="codigoCuadrante" maxlength="20"></label>';
      $('#eq-selects').innerHTML = html;
    }
    $$('#eq-selects [data-campo]').forEach((el) => {
      const v = m[el.dataset.campo];
      poner(el, v == null ? '' : String(v));
    });
    poner($('#eq-heredar'), m.heredarTrabajador);

    // Valores del tipo o concepto.
    const tipos = $('#eq-tipos');
    if (!cuadrante && m.tipo != null) {
      const valores = E.valoresColumna(tabla, m, m.tipo);
      const marcados = (v) => m.tipos == null || m.tipos.indexOf(v) >= 0;
      const lista = valores.slice(0, 80).map((v, i) =>
        `<label class="check"><input type="checkbox" data-tipo="${esc(v.valor)}" id="eq-tipo-${i}"${marcados(v.valor) ? ' checked' : ''}> ${esc(v.valor)} <span class="nota">(${v.n})</span></label>`).join('');
      tipos.innerHTML = `<fieldset class="categorias"><legend>Cuentan como vacaciones</legend><div class="eq-tipos">${lista}</div>` +
        (valores.length > 80 ? `<p class="nota">Se muestran 80 de ${valores.length} valores.</p>` : '') + '</fieldset>';
    } else tipos.innerHTML = '';

    // Muestra de las primeras filas, con las columnas usadas resaltadas.
    const usadas = {};
    CAMPOS.forEach((c) => { if (m[c.id] != null && !(cuadrante && c.filas)) usadas[m[c.id]] = c.etq; });
    const ancho = Math.min(E.ancho(tabla), 40);
    let t = '<thead><tr><th scope="col">Fila</th>';
    for (let i = 0; i < ancho; i++) t += `<th scope="col" class="${usadas[i] ? 'col-usada' : ''}">${E.letraColumna(i)}${usadas[i] ? ' · ' + esc(usadas[i]) : ''}</th>`;
    t += '</tr></thead><tbody>';
    tabla.slice(m.cabecera, m.cabecera + 7).forEach((f, k) => {
      t += `<tr class="${k === 0 ? 'fila-cabecera' : ''}"><td>${m.cabecera + k + 1}</td>`;
      for (let i = 0; i < ancho; i++) {
        const v = f[i];
        const visible = typeof v === 'number' ? fn(v) : (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? M.fechaCorta(v) : v);
        t += `<td title="${esc(v)}">${esc(visible)}</td>`;
      }
      t += '</tr>';
    });
    $('#eq-muestra').innerHTML = t + '</tbody>';
  }

  function aviso(tipo, html) { return `<div class="aviso aviso--${tipo}"><p>${html}</p></div>`; }

  function renderResultado(res, e) {
    const m = e.mapeo;
    const av = res.avisos;
    const avisos = [];
    if (m.trabajador == null) avisos.push(aviso('mal', 'Elige la columna del <strong>trabajador</strong> en el paso 3.'));
    if (m.formato === 'filas' && m.horas == null && (m.desde == null || m.hasta == null)) {
      avisos.push(aviso('mal', 'Elige la columna de <strong>horas</strong>, o las de <strong>desde</strong> y <strong>hasta</strong> si el archivo trae periodos.'));
    }
    const partes = [`${pl(av.usadas, 'registro contado', 'registros contados')} de ${pl(av.filas, 'fila', 'filas')} para ${pl(res.trabajadores.length, 'trabajador', 'trabajadores')}`];
    if (av.otroTipo) partes.push(`${fn(av.otroTipo)} de otro tipo o concepto`);
    if (av.otroAnio) partes.push(`${fn(av.otroAnio)} de otros años`);
    if (av.totales) partes.push(`${pl(av.totales, 'fila de totales ignorada', 'filas de totales ignoradas')}`);
    avisos.push(aviso('info', partes.join(' · ') + '.'));
    if (av.sinTrabajador) avisos.push(aviso('alerta', `${pl(av.sinTrabajador, 'fila sin trabajador', 'filas sin trabajador')}. Revisa la columna del trabajador o marca «El nombre solo aparece en la primera fila».`));
    if (av.sinHoras) avisos.push(aviso('alerta', `${pl(av.sinHoras, 'fila sin horas válidas', 'filas sin horas válidas')}: no se han contado.`));
    if (av.sinFecha) avisos.push(aviso('alerta', `${pl(av.sinFecha, 'fila sin fecha', 'filas sin fecha')}: se han contado aunque no se puede saber de qué año son.`));
    if (!res.trabajadores.length && m.trabajador != null) avisos.push(aviso('mal', 'No se ha podido contar ninguna fila. Revisa las columnas elegidas y los tipos marcados.'));
    $('#eq-avisos').innerHTML = avisos.join('');

    $('#eq-titulo').textContent = '4. Recuento por trabajador · ' + (res.anio ? res.anio : 'todos los años');
    const aj = e.ajustes || ajustesPorDefecto();
    let t = '<thead><tr><th scope="col">Trabajador</th><th scope="col" class="num">Días disfrutados</th><th scope="col" class="num">Días pendientes</th>' +
      '<th scope="col" class="num">Días que corresponden</th><th scope="col" class="num">Horas</th><th scope="col" class="num">Horas por día</th></tr></thead><tbody>';
    if (!res.trabajadores.length) t += '<tr><td colspan="6" class="vacio">Sin trabajadores que mostrar.</td></tr>';
    res.trabajadores.forEach((w) => {
      const detalle = w.fechas.map((x) => `<li>${M.fechaCorta(x.fecha)}: ${fh(x.horas)}${x.dias != null ? ` · ${fn(x.dias)} d` : ''}</li>`)
        .concat(w.periodos.map((p) => `<li>${M.fechaCorta(p.desde)} – ${M.fechaCorta(p.hasta)}: ${fh(p.horas)} · ${fn(p.dias)} d</li>`));
      const nombre = esc(w.nombre);
      t += `<tr data-nombre="${esc(E.sinAcentos(w.nombre))}" class="${w.pendientes < 0 ? 'fila-alerta' : ''}">` +
        `<td>${detalle.length ? `<details><summary>${nombre}</summary><ul class="nota">${detalle.slice(0, 400).join('')}</ul></details>` : nombre}</td>` +
        `<td class="num desglose-num">${fn(w.dias)}</td><td class="num desglose-num ${w.pendientes < 0 ? 'negativo' : ''}">${fn(w.pendientes)}</td>` +
        `<td class="num"><input type="number" min="0" max="366" step="0.5" class="entrada-celda" data-trab="${nombre}" data-campo="derecho" value="${w.derechoPropio ? w.derecho : ''}" placeholder="${fn(aj.derecho)}" aria-label="Días que corresponden a ${nombre}"></td>` +
        `<td class="num">${fh(w.horas)}</td>` +
        `<td class="num"><input type="text" inputmode="decimal" class="entrada-celda" data-trab="${nombre}" data-campo="horasDia" value="${w.horasDiaPropias ? fn(w.horasDia) : ''}" placeholder="${fn(aj.horasDia)}" aria-label="Horas por día de ${nombre}"></td></tr>`;
    });
    t += '</tbody>';
    if (res.trabajadores.length) {
      t += `<tfoot><tr><td>Total (${pl(res.trabajadores.length, 'trabajador', 'trabajadores')})</td><td class="num">${fn(res.totales.dias)}</td><td class="num">${fn(res.totales.pendientes)}</td><td></td><td class="num">${fh(res.totales.horas)}</td><td></td></tr></tfoot>`;
    }
    $('#eq-tabla').innerHTML = t;
    filtrar();
  }

  function render() {
    rellenarAjustes();
    const e = equipo();
    const tabla = e && e.tabla;
    $('#eq-columnas').hidden = !tabla;
    $('#eq-exportar').disabled = !tabla;
    $('#eq-borrar').disabled = !e;
    if (!tabla || !e.mapeo) {
      resultado = null;
      firmaSelects = '';
      $('#eq-origen').textContent = '';
      $('#eq-avisos').innerHTML = '';
      $('#eq-titulo').textContent = '4. Recuento por trabajador';
      $('#eq-tabla').innerHTML = '<tbody><tr><td class="vacio">Importa la exportación de vacaciones para ver los días de cada trabajador.</td></tr></tbody>';
      opcionesAnio([]);
      return;
    }
    const o = e.origen || {};
    $('#eq-origen').textContent = `«${o.nombre || 'Datos'}» · ${pl(tabla.length, 'fila', 'filas')}${o.hoja ? ' · hoja ' + o.hoja : ''}${o.fecha ? ' · leído el ' + M.fechaCorta(o.fecha) : ''}.`;
    renderColumnas(tabla, e.mapeo);
    const op = (anio) => ({ anio, horasDia: ajustes().horasDia, jornada: ajustes().jornada, derecho: ajustes().derecho, trabajadores: e.trabajadores || {}, esFestivo: A.festivoEn });
    const base = E.calcular(tabla, e.mapeo, op(null));
    opcionesAnio(base.anios);
    const anio = anioElegido(base.anios);
    resultado = anio ? E.calcular(tabla, e.mapeo, op(anio)) : base;
    resultado.anio = anio;
    renderResultado(resultado, e);
  }

  function filtrar() {
    const q = E.sinAcentos($('#eq-buscar').value);
    $$('#eq-tabla tbody tr[data-nombre]').forEach((tr) => { tr.hidden = !!q && tr.dataset.nombre.indexOf(q) < 0; });
  }

  // ------------------------------------------------------------- Acciones

  async function leer() {
    const err = $('#eq-error');
    err.hidden = true;
    const texto = $('#eq-texto').value;
    const archivo = $('#eq-archivo').files[0];
    let r;
    try {
      if (texto.trim()) r = { tabla: E.leerTexto(texto), formato: 'pegado', nombre: 'Datos pegados' };
      else if (archivo) r = Object.assign(await E.leerArchivo(await archivo.arrayBuffer()), { nombre: archivo.name });
      else throw new Error('Elige el archivo exportado o pega las celdas copiadas de Excel.');
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
      return;
    }
    const tabla = r.tabla.filter((f) => f && f.some((c) => E.texto(c) !== ''));
    if (tabla.length < 2) {
      err.textContent = 'No se han encontrado datos. Comprueba que es la exportación de vacaciones.';
      err.hidden = false;
      return;
    }
    if (tabla.length > MAX_FILAS) {
      err.textContent = `El archivo tiene ${fn(tabla.length)} filas y el máximo es ${fn(MAX_FILAS)}. Exporta un periodo más corto.`;
      err.hidden = false;
      return;
    }
    const mapeo = E.proponerMapeo(tabla);
    cambiarEquipo((eq) => {
      eq.tabla = tabla;
      eq.mapeo = mapeo;
      eq.origen = { nombre: r.nombre, formato: r.formato, hoja: r.hoja || '', fecha: M.hoyISO() };
    }, `Leídas ${pl(tabla.length, 'fila', 'filas')} de «${r.nombre}».`);
    $('#eq-texto').value = '';
    $('#eq-archivo').value = '';
  }

  function enColumnas(ev) {
    const el = ev.target;
    const e = equipo();
    if (!e || !e.tabla) return;
    if (el.id === 'eq-heredar') { cambiarEquipo((eq) => { eq.mapeo.heredarTrabajador = el.checked; }); return; }
    if (el.dataset.tipo != null) {
      const marcados = $$('#eq-tipos [data-tipo]').filter((x) => x.checked).map((x) => x.dataset.tipo);
      const todos = $$('#eq-tipos [data-tipo]').length;
      cambiarEquipo((eq) => { eq.mapeo.tipos = marcados.length === todos ? null : marcados; });
      return;
    }
    const campo = el.dataset.campo;
    if (!campo) return;
    if (campo === 'cabecera') {
      cambiarEquipo((eq) => { eq.mapeo = E.proponerMapeo(eq.tabla, +el.value); });
    } else if (campo === 'formato') {
      cambiarEquipo((eq) => { eq.mapeo.formato = el.value; if (el.value === 'cuadrante') eq.mapeo.modo = 'fecha'; });
    } else if (campo === 'codigoCuadrante') {
      cambiarEquipo((eq) => { eq.mapeo.codigoCuadrante = el.value.trim(); });
    } else {
      const v = el.value === '' ? null : +el.value;
      cambiarEquipo((eq) => {
        eq.mapeo[campo] = v;
        if (campo === 'tipo') {
          const vac = v == null ? [] : E.valoresColumna(eq.tabla, eq.mapeo, v).filter((x) => /vacac/.test(E.sinAcentos(x.valor)));
          eq.mapeo.tipos = vac.length ? vac.map((x) => x.valor) : null;
        }
        if (campo === 'fecha' && v == null && eq.mapeo.modo === 'fecha') eq.mapeo.modo = 'horas';
      });
    }
  }

  function invalido(el, msg) {
    el.setAttribute('aria-invalid', 'true');
    A.toast(msg);
  }

  function enAjustes(ev) {
    const el = ev.target;
    if (el.name === 'eq-modo') {
      cambiarEquipo((eq) => { if (eq.mapeo) eq.mapeo.modo = el.value; });
    } else if (el.id === 'eq-horas-dia') {
      const h = M.parseHoras(el.value);
      if (h == null || h <= 0 || h > 24) return invalido(el, 'Horas no válidas. Escribe, por ejemplo, 8 o 7,5.');
      cambiarEquipo((eq) => { eq.ajustes.horasDia = h; });
    } else if (el.id === 'eq-derecho') {
      const d = +el.value;
      if (el.value === '' || !isFinite(d) || d < 0 || d > 366) return invalido(el, 'Indica un número de días entre 0 y 366.');
      cambiarEquipo((eq) => { eq.ajustes.derecho = d; });
    } else if (el.id === 'eq-anio') {
      cambiarEquipo((eq) => { eq.ajustes.anio = el.value; });
    } else if (el.dataset.dia != null) {
      const h = el.value.trim() === '' ? 0 : M.parseHoras(el.value);
      if (h == null || h > 24) return invalido(el, 'Horas no válidas. Usa un número entre 0 y 24.');
      cambiarEquipo((eq) => { eq.ajustes.jornada[+el.dataset.dia] = h; });
    }
  }

  function enTabla(ev) {
    const el = ev.target;
    if (!el.dataset || !el.dataset.trab) return;
    const nombre = el.dataset.trab;
    const campo = el.dataset.campo;
    const txt = el.value.trim();
    let v = null;
    if (txt !== '') {
      v = campo === 'horasDia' ? M.parseHoras(txt) : +txt;
      const max = campo === 'horasDia' ? 24 : 366;
      if (v == null || !isFinite(v) || v < 0 || v > max || (campo === 'horasDia' && v === 0)) {
        return invalido(el, campo === 'horasDia' ? 'Horas por día no válidas.' : 'Días no válidos.');
      }
    }
    cambiarEquipo((eq) => {
      const t = Object.assign({}, eq.trabajadores[nombre] || {});
      if (v == null) delete t[campo]; else t[campo] = v;
      if (Object.keys(t).length) eq.trabajadores[nombre] = t; else delete eq.trabajadores[nombre];
    });
  }

  function exportarCSV() {
    if (!resultado) return;
    const anio = resultado.anio || 'todos';
    A.exportar(`vacaciones-equipo-${anio}.csv`, A.csv(E.filasCSV(resultado, resultado.anio)), 'text/csv;charset=utf-8', 'Recuento de vacaciones del equipo (CSV)');
  }

  async function borrar() {
    const ok = await A.confirmar('Se borrarán el archivo importado, las columnas elegidas y los ajustes de cada trabajador. Tus datos personales del calendario no se tocan.', { titulo: 'Borrar datos del equipo', boton: 'Borrar' });
    if (ok) A.cambiar(() => { delete A.estado().equipo; }, 'Datos del equipo borrados.');
  }

  // ------------------------------------------------------------- Inicio

  construirJornada();
  $('#form-eq-importar').addEventListener('submit', (e) => { e.preventDefault(); leer(); });
  $('#eq-archivo').addEventListener('change', () => { if ($('#eq-archivo').files[0]) { $('#eq-texto').value = ''; leer(); } });
  $('#eq-borrar').addEventListener('click', borrar);
  $('#form-eq-ajustes').addEventListener('change', enAjustes);
  $('#form-eq-ajustes').addEventListener('submit', (e) => e.preventDefault());
  $('#eq-columnas').addEventListener('change', enColumnas);
  $('#eq-tabla').addEventListener('change', enTabla);
  $('#eq-buscar').addEventListener('input', filtrar);
  $('#eq-exportar').addEventListener('click', exportarCSV);
  A.alRenderizar(render);
})();
