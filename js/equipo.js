/*
 * Vacaciones del equipo: lectura de exportaciones (Excel .xlsx, Excel 2003 XML,
 * HTML guardado como .xls, CSV, texto pegado desde Excel) y recuento de días de
 * vacaciones por trabajador a partir de las horas.
 *
 * Funciones puras salvo la lectura de .xlsx, que usa DecompressionStream
 * (disponible en navegadores actuales y en Node 18+). Se prueban con node --test.
 */
(function (raiz) {
  'use strict';

  var M = raiz.Motor || (typeof require !== 'undefined' ? require('./motor.js') : null);

  // ------------------------------------------------------------------ Texto

  function texto(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
  function sinAcentos(v) {
    var s = texto(v).toLowerCase();
    return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
  }
  function vacia(v) { return texto(v) === ''; }

  // UTF-8 si es válido; si no, Windows-1252 (habitual en programas antiguos).
  function decodificarTexto(bytes) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''); }
    catch (e) { return new TextDecoder('windows-1252').decode(bytes); }
  }

  function decodificarEntidades(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, function (m, e) {
      e = e.toLowerCase();
      if (e[0] === '#') {
        var n = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[e];
    });
  }
  function textoDeHTML(s) {
    return texto(decodificarEntidades(String(s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ')));
  }
  function atributo(etiqueta, nombre) {
    var m = new RegExp('(?:^|\\s)' + nombre + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(etiqueta);
    return m ? decodificarEntidades(m[2] != null ? m[2] : m[3] != null ? m[3] : m[4]) : null;
  }

  // ------------------------------------------------------------ Formatos

  function detectarFormato(bytes) {
    if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4B) return 'xlsx';
    if (bytes.length >= 4 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) return 'xls';
    var inicio = decodificarTexto(bytes.subarray(0, 4096)).trim().toLowerCase();
    if (inicio.indexOf('urn:schemas-microsoft-com:office:spreadsheet') >= 0 || /<(ss:)?workbook[\s>]/.test(inicio)) return 'xml2003';
    if (/^<(!doctype|html|table|meta|head|body|style)/.test(inicio) || /<table[\s>]/.test(inicio)) return 'html';
    return 'texto';
  }

  function leerHTML(html) {
    var filas = [];
    var reFila = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, f;
    while ((f = reFila.exec(html))) {
      var fila = [];
      var reCelda = /<t([dh])\b([^>]*)>([\s\S]*?)<\/t\1>/gi, c;
      while ((c = reCelda.exec(f[1]))) {
        fila.push(textoDeHTML(c[3]));
        var span = parseInt(atributo(c[2], 'colspan'), 10);
        for (var i = 1; i < span && i < 50; i++) fila.push('');
      }
      filas.push(fila);
    }
    return filas;
  }

  // Excel 2003 XML (SpreadsheetML), que algunos programas guardan como .xls.
  function leerXML2003(xml) {
    var filas = [];
    var reFila = /<(?:ss:)?Row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:ss:)?Row>)/gi, f;
    while ((f = reFila.exec(xml))) {
      var fila = [];
      var reCelda = /<(?:ss:)?Cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:ss:)?Cell>)/gi, c;
      while ((c = reCelda.exec(f[1] || ''))) {
        var indice = parseInt(atributo(c[1], 'ss:Index') || atributo(c[1], 'Index'), 10);
        if (indice > 0) while (fila.length < indice - 1) fila.push('');
        var d = /<(?:ss:)?Data\b([^>]*)>([\s\S]*?)<\/(?:ss:)?Data>/i.exec(c[2] || '');
        var valor = d ? textoDeHTML(d[2]) : '';
        var tipo = d ? atributo(d[1], 'ss:Type') || atributo(d[1], 'Type') : '';
        if (tipo === 'Number' && valor !== '' && isFinite(+valor)) valor = +valor;
        else if (tipo === 'DateTime') valor = valor.slice(0, 10);
        fila.push(valor);
      }
      filas.push(fila);
    }
    return filas;
  }

  function leerTexto(t) {
    t = String(t || '').replace(/^\uFEFF/, '');
    if (/<table[\s>]/i.test(t)) return leerHTML(t);
    if (/urn:schemas-microsoft-com:office:spreadsheet/i.test(t)) return leerXML2003(t);
    return M.parseCSV(t);
  }

  // ------------------------------------------------------------------ XLSX

  async function descomprimir(datos, metodo) {
    if (metodo === 0) return datos;
    if (metodo !== 8) throw new Error('El archivo Excel usa una compresión que no se puede leer.');
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Este navegador no puede abrir archivos .xlsx. Copia las celdas en Excel y pégalas en el cuadro de texto.');
    }
    var flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(flujo).arrayBuffer());
  }

  function leerZip(bytes) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var fin = -1;
    for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
    }
    if (fin < 0) throw new Error('El archivo .xlsx está dañado o no es un libro de Excel.');
    var total = dv.getUint16(fin + 10, true);
    var p = dv.getUint32(fin + 16, true);
    var entradas = {};
    for (var k = 0; k < total && p + 46 <= bytes.length; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true);
      var nombre = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + ln));
      entradas[nombre] = { metodo: dv.getUint16(p + 10, true), tam: dv.getUint32(p + 20, true), pos: dv.getUint32(p + 42, true) };
      p += 46 + ln + le + lc;
    }
    return {
      existe: function (n) { return !!entradas[n]; },
      leer: async function (n) {
        var e = entradas[n];
        if (!e) return null;
        var ini = e.pos + 30 + dv.getUint16(e.pos + 26, true) + dv.getUint16(e.pos + 28, true);
        var datos = await descomprimir(bytes.subarray(ini, ini + e.tam), e.metodo);
        return new TextDecoder('utf-8').decode(datos);
      }
    };
  }

  var FORMATOS_FECHA = { 14: 1, 15: 1, 16: 1, 17: 1, 22: 1, 27: 1, 28: 1, 29: 1, 30: 1, 31: 1, 34: 1, 35: 1, 36: 1, 50: 1, 51: 1, 52: 1, 53: 1, 54: 1, 57: 1, 58: 1 };
  var FORMATOS_HORA = { 18: 1, 19: 1, 20: 1, 21: 1, 45: 1, 46: 1, 47: 1 };

  function claseFormato(codigo) {
    var c = String(codigo || '').toLowerCase().replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/\[(?!h+\]|m+\]|s+\])[^\]]*\]/g, '');
    if (/[dy]/.test(c) || /(^|[^h:])m{3,}/.test(c)) return 'fecha';
    if (/h|s/.test(c) || /\[m+\]/.test(c)) return 'hora';
    return '';
  }

  function letrasAColumna(r) {
    var m = /^([A-Z]+)/i.exec(r || '');
    if (!m) return -1;
    var n = 0;
    for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].toUpperCase().charCodeAt(i) - 64);
    return n - 1;
  }

  function serieAFecha(n) {
    var ms = Math.round((n - 25569) * 86400000);
    var d = new Date(ms);
    return M.iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  async function leerXLSX(bytes) {
    var zip = leerZip(bytes);
    var libro = await zip.leer('xl/workbook.xml');
    if (!libro) throw new Error('El archivo no parece un libro de Excel (.xlsx).');
    var hoja = /<sheet\b[^>]*>/i.exec(libro);
    var nombreHoja = hoja ? atributo(hoja[0], 'name') : '';
    var rid = hoja ? atributo(hoja[0], 'r:id') : null;
    var ruta = 'xl/worksheets/sheet1.xml';
    var rels = (await zip.leer('xl/_rels/workbook.xml.rels')) || '';
    var reRel = /<Relationship\b[^>]*>/gi, r;
    while ((r = reRel.exec(rels))) {
      if (atributo(r[0], 'Id') === rid) {
        var destino = atributo(r[0], 'Target') || '';
        ruta = destino.charAt(0) === '/' ? destino.slice(1) : 'xl/' + destino.replace(/^\.\//, '');
      }
    }
    var compartidas = [];
    var ss = await zip.leer('xl/sharedStrings.xml');
    if (ss) {
      var reSi = /<si\b[^>]*>([\s\S]*?)<\/si>/gi, si;
      while ((si = reSi.exec(ss))) {
        var cuerpo = si[1].replace(/<rPh\b[\s\S]*?<\/rPh>/gi, '');
        var partes = [], t, reT = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
        while ((t = reT.exec(cuerpo))) partes.push(decodificarEntidades(t[1]));
        compartidas.push(partes.join(''));
      }
    }
    // Estilos: qué celdas son fechas y cuáles son horas.
    var claseEstilo = [];
    var estilos = await zip.leer('xl/styles.xml');
    if (estilos) {
      var propios = {};
      var reNf = /<numFmt\b[^>]*>/gi, nf;
      while ((nf = reNf.exec(estilos))) propios[atributo(nf[0], 'numFmtId')] = atributo(nf[0], 'formatCode');
      var xfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/i.exec(estilos);
      var reXf = /<xf\b[^>]*>/gi, xf;
      while (xfs && (xf = reXf.exec(xfs[1]))) {
        var id = +atributo(xf[0], 'numFmtId');
        claseEstilo.push(FORMATOS_FECHA[id] ? 'fecha' : FORMATOS_HORA[id] ? 'hora' : propios[id] != null ? claseFormato(propios[id]) : '');
      }
    }
    var xml = await zip.leer(ruta);
    if (!xml) throw new Error('No se encuentra la primera hoja del libro de Excel.');
    var filas = [];
    var reFila = /<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/gi, f;
    while ((f = reFila.exec(xml))) {
      var fila = [];
      var reC = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gi, c;
      while ((c = reC.exec(f[1] || ''))) {
        var col = letrasAColumna(atributo(c[1], 'r'));
        if (col < 0) col = fila.length;
        while (fila.length < col) fila.push('');
        var tipo = atributo(c[1], 't') || 'n';
        var v = /<v\b[^>]*>([\s\S]*?)<\/v>/i.exec(c[2] || '');
        var valor = v ? decodificarEntidades(v[1]) : '';
        if (tipo === 's') valor = compartidas[+valor] || '';
        else if (tipo === 'inlineStr') {
          var partesIs = [], ti, reTi = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
          while ((ti = reTi.exec(c[2] || ''))) partesIs.push(decodificarEntidades(ti[1]));
          valor = partesIs.join('');
        } else if (tipo === 'b') valor = valor === '1' ? 'VERDADERO' : 'FALSO';
        else if (tipo === 'e') valor = '';
        else if (tipo === 'n' && valor !== '' && isFinite(+valor)) {
          var num = +valor;
          var clase = claseEstilo[+atributo(c[1], 's') || 0] || '';
          if (clase === 'fecha' && num > 0) valor = serieAFecha(num);
          else if (clase === 'hora') valor = Math.round(num * 24 * 1e6) / 1e6;
          else valor = num;
        }
        fila[col] = valor;
      }
      filas.push(fila);
    }
    return { tabla: filas, hoja: nombreHoja };
  }

  // Lee un archivo (ArrayBuffer o Uint8Array) y devuelve la tabla de celdas.
  async function leerArchivo(datos) {
    var bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
    var formato = detectarFormato(bytes);
    if (formato === 'xls') {
      var error = new Error('Este archivo está en el formato antiguo de Excel (.xls, Excel 97-2003), que el navegador no puede leer. Ábrelo en Excel y guárdalo como .xlsx o CSV, o selecciona todas las celdas, cópialas y pégalas en el cuadro de texto.');
      error.codigo = 'xls';
      throw error;
    }
    if (formato === 'xlsx') {
      var x = await leerXLSX(bytes);
      return { tabla: x.tabla, formato: formato, hoja: x.hoja };
    }
    var t = decodificarTexto(bytes);
    if (formato === 'xml2003') return { tabla: leerXML2003(t), formato: formato };
    if (formato === 'html') return { tabla: leerHTML(t), formato: formato };
    return { tabla: M.parseCSV(t), formato: formato };
  }

  // ------------------------------------------------------- Valores de celda

  var MESES = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };

  function fecha(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v >= 25569 && v <= 73415 ? serieAFecha(Math.floor(v)) : null;
    var s = sinAcentos(v);
    var m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[t\s].*)?$/.exec(s))) return valida(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})(?:\s.*)?$/.exec(s))) return valida(anio4(m[3]), +m[2], +m[1]);
    if ((m = /^(\d{1,2})[\s\-\/.]*(?:de\s+)?([a-z]{3})[a-z]*\.?[\s\-\/.]*(?:de\s+|del\s+)?(\d{2}|\d{4})$/.exec(s)) && MESES[m[2]]) return valida(anio4(m[3]), MESES[m[2]], +m[1]);
    if ((m = /^(\d{8})$/.exec(s))) return valida(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8));
    if (/^\d{5}(\.\d+)?$/.test(s)) return fecha(+s);
    return null;
  }
  function anio4(a) { return a.length === 2 ? 2000 + +a : +a; }
  function valida(y, m, d) {
    var f = M.iso(y, m, d);
    return M.esFechaValida(f) ? f : null;
  }

  // Horas: 8 · 8,5 · 8.5 · 1.234,5 · 8:30 · 08:30:00 · 176:00 · "8 h".
  function horas(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = texto(v).toLowerCase().replace(/\s*(horas?|hrs?|h)\.?$/, '').replace(/\s+/g, '');
    if (!s || s === '-') return null;
    var neg = /^-/.test(s);
    s = s.replace(/^[-+]/, '');
    var m, n = null;
    if ((m = /^(\d{1,4}):(\d{2})(?::(\d{2}))?$/.exec(s))) n = +m[1] + +m[2] / 60 + (m[3] ? +m[3] / 3600 : 0);
    else if ((m = /^(\d{1,3})h(\d{1,2})m?$/.exec(s))) n = +m[1] + +m[2] / 60;
    else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) n = parseFloat(s.replace(/,/g, ''));
    else if (/^\d+([.,]\d+)?$/.test(s)) n = parseFloat(s.replace(',', '.'));
    if (n == null || !isFinite(n)) return null;
    return Math.round((neg ? -n : n) * 1e6) / 1e6;
  }

  function esFechaTexto(v) { return fecha(v) != null; }
  function esNumero(v) { return typeof v === 'number' || horas(v) != null; }

  // ---------------------------------------------------------- Columnas

  function ancho(tabla) {
    var n = 0;
    tabla.forEach(function (f) { if (f && f.length > n) n = f.length; });
    return n;
  }

  function letraColumna(i) {
    var s = '';
    i++;
    while (i > 0) { var r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }

  function nombresColumnas(tabla, filaCabecera) {
    var cab = tabla[filaCabecera] || [];
    var r = [];
    for (var i = 0; i < ancho(tabla); i++) {
      var t = typeof cab[i] === 'number' ? '' : texto(cab[i]);
      r.push(letraColumna(i) + (t ? ' · ' + t : ''));
    }
    return r;
  }

  var CLAVES = /trabaj|emplead|nombre|operari|apellid|persona|tecnic|horas|fecha|desde|hasta|tipo|concepto|motivo|ausencia|incidencia/;

  function detectarCabecera(tabla) {
    var mejor = 0, puntos = -1;
    for (var i = 0; i < Math.min(tabla.length, 30); i++) {
      var fila = tabla[i] || [];
      var textos = 0, claves = 0, fechas = 0;
      fila.forEach(function (c) {
        if (vacia(c)) return;
        if (esFechaTexto(c)) { fechas++; return; }
        if (typeof c === 'number' || esNumero(c)) return;
        textos++;
        if (CLAVES.test(sinAcentos(c))) claves++;
      });
      var p = textos + claves * 3 + (fechas >= 5 ? fechas : 0);
      if (p > puntos) { puntos = p; mejor = i; }
    }
    return mejor;
  }

  function columnasFecha(tabla, filaCabecera) {
    var r = [];
    (tabla[filaCabecera] || []).forEach(function (c, i) {
      var f = fecha(c);
      if (f) r.push({ col: i, fecha: f });
    });
    return r;
  }

  function datos(tabla, m) { return tabla.slice(m.cabecera + 1); }

  function proporcion(filas, col, prueba) {
    var total = 0, si = 0;
    filas.forEach(function (f) {
      if (vacia(f[col])) return;
      total++;
      if (prueba(f[col])) si++;
    });
    return total ? si / total : 0;
  }

  function proponerMapeo(tabla, cabeceraForzada) {
    var cab = cabeceraForzada != null && cabeceraForzada >= 0 && cabeceraForzada < tabla.length ? cabeceraForzada : detectarCabecera(tabla);
    var m = {
      cabecera: cab, formato: 'filas', trabajador: null, horas: null, fecha: null, desde: null, hasta: null,
      tipo: null, tipos: null, heredarTrabajador: false, codigoCuadrante: 'V', modo: 'horas'
    };
    var cabeceras = (tabla[cab] || []).map(sinAcentos);
    var filas = datos(tabla, m);
    var usadas = {};
    function buscar(re, prueba) {
      for (var i = 0; i < cabeceras.length; i++) {
        if (!usadas[i] && re.test(cabeceras[i]) && (!prueba || prueba(i))) { usadas[i] = true; return i; }
      }
      return null;
    }
    var esTextoCol = function (i) { return proporcion(filas, i, function (v) { return typeof v !== 'number' && !esNumero(v) && !esFechaTexto(v); }) >= 0.6; };
    var esFechaCol = function (i) { return proporcion(filas, i, esFechaTexto) >= 0.6; };
    var esHorasCol = function (i) { return proporcion(filas, i, function (v) { return !esFechaTexto(v) && horas(v) != null; }) >= 0.6; };

    var cols = columnasFecha(tabla, cab);
    if (cols.length >= 5) {
      m.formato = 'cuadrante';
      m.modo = 'fecha';
      for (var j = 0; j < ancho(tabla); j++) {
        if (!cols.some(function (c) { return c.col === j; }) && esTextoCol(j)) { m.trabajador = j; break; }
      }
    } else {
      m.trabajador = buscar(/trabaj|emplead|nombre|operari|apellid|persona|tecnic/, esTextoCol);
      m.desde = buscar(/desde|inicio|^f\.? ?ini|fecha ini/);
      m.hasta = buscar(/hasta|^fin|fecha fin|^f\.? ?fin/);
      m.fecha = buscar(/^fecha|^dia\b|^date/);
      m.horas = buscar(/horas|^h\.?$|^hh|tiempo|duracion|^total/);
      m.tipo = buscar(/tipo|concepto|motivo|ausencia|incidencia|causa|clase|descrip/);
      if (m.trabajador == null) m.trabajador = buscar(/codigo|^cod|^n[o.ºª°]|numero|^id$/);
      for (var k = 0; m.trabajador == null && k < cabeceras.length; k++) if (!usadas[k] && esTextoCol(k)) { m.trabajador = k; usadas[k] = true; }
      for (var h = cabeceras.length - 1; m.horas == null && h >= 0; h--) if (!usadas[h] && esHorasCol(h)) { m.horas = h; usadas[h] = true; }
      for (var d = 0; m.fecha == null && m.desde == null && d < cabeceras.length; d++) if (!usadas[d] && esFechaCol(d)) { m.fecha = d; usadas[d] = true; }
    }
    if (m.tipo != null) {
      var vac = valoresColumna(tabla, m, m.tipo).filter(function (v) { return /vacac/.test(sinAcentos(v.valor)); });
      m.tipos = vac.length ? vac.map(function (v) { return v.valor; }) : null;
    }
    if (m.trabajador != null) {
      var conDatos = 0, sinNombre = 0;
      filas.forEach(function (f) {
        var hayDato = f.some(function (c, i) { return i !== m.trabajador && !vacia(c); });
        if (!hayDato) return;
        conDatos++;
        if (vacia(f[m.trabajador])) sinNombre++;
      });
      m.heredarTrabajador = conDatos > 0 && sinNombre / conDatos > 0.2;
    }
    // Con una fecha por fila se cuenta día a día; sin fecha, se dividen las horas.
    if (m.formato === 'filas') m.modo = m.fecha != null ? 'fecha' : 'horas';
    return m;
  }

  function valoresColumna(tabla, m, col) {
    var cuenta = {}, orden = [];
    datos(tabla, m).forEach(function (f) {
      var v = texto(f[col]);
      if (!v) return;
      if (!(v in cuenta)) { cuenta[v] = 0; orden.push(v); }
      cuenta[v]++;
    });
    return orden.map(function (v) { return { valor: v, n: cuenta[v] }; });
  }

  // ------------------------------------------------------------ Recuento

  // opciones: { anio, horasDia, jornada[7], derecho, trabajadores: {nombre: {horasDia, derecho}}, esFestivo(fecha) }
  function calcular(tabla, m, opciones) {
    opciones = opciones || {};
    var hdEmpresa = +opciones.horasDia > 0 ? +opciones.horasDia : 8;
    var jornada = (opciones.jornada || [0, hdEmpresa, hdEmpresa, hdEmpresa, hdEmpresa, hdEmpresa, 0]).map(function (x) { return +x || 0; });
    var ajustes = opciones.trabajadores || {};
    var anio = opciones.anio ? String(opciones.anio) : null;
    var esFestivo = opciones.esFestivo || function () { return false; };
    var tiposSet = null;
    // tipos: null cuenta todas las filas; una lista cuenta solo esos valores.
    if (m.tipo != null && Array.isArray(m.tipos)) {
      tiposSet = {};
      m.tipos.forEach(function (t) { tiposSet[sinAcentos(t)] = true; });
    }
    var av = { filas: 0, usadas: 0, sinTrabajador: 0, totales: 0, sinHoras: 0, otroTipo: 0, otroAnio: 0, sinFecha: 0 };
    var anios = {};
    var porNombre = {};

    function hd(nombre) {
      var a = ajustes[nombre];
      return a && +a.horasDia > 0 ? +a.horasDia : hdEmpresa;
    }
    // Horas de jornada de un trabajador un día de la semana concreto.
    function jd(nombre, dow) {
      var a = ajustes[nombre];
      if (a && +a.horasDia > 0) return jornada[dow] > 0 ? +a.horasDia : 0;
      return jornada[dow];
    }
    function trab(nombre) {
      return porNombre[nombre] || (porNombre[nombre] = { nombre: nombre, horas: 0, dias: 0, registros: 0, porFecha: {}, fechas: [], periodos: [] });
    }
    function anotarAnio(f) { if (f) anios[f.slice(0, 4)] = (anios[f.slice(0, 4)] || 0) + 1; }
    function nombreDe(fila, previo) {
      var n = texto(fila[m.trabajador]);
      if (!n && m.heredarTrabajador) n = previo;
      return n;
    }
    function esTotal(n) { return /^(total|totales|suma|subtotal)\b/.test(sinAcentos(n)); }

    var filas = datos(tabla, m);
    var previo = '';

    if (m.formato === 'cuadrante') {
      var cols = columnasFecha(tabla, m.cabecera);
      cols.forEach(function (c) { anotarAnio(c.fecha); });
      var codigo = sinAcentos(m.codigoCuadrante || 'V');
      filas.forEach(function (fila) {
        if (!fila.some(function (c) { return !vacia(c); })) return;
        av.filas++;
        var nombre = nombreDe(fila, previo);
        if (!nombre) { av.sinTrabajador++; return; }
        if (esTotal(nombre)) { av.totales++; return; }
        previo = nombre;
        var usada = false;
        cols.forEach(function (c) {
          var v = fila[c.col];
          if (vacia(v)) return;
          if (anio && c.fecha.slice(0, 4) !== anio) return;
          var dow = M.diaSemana(c.fecha);
          var t = trab(nombre);
          if (codigo && sinAcentos(v) === codigo) {
            t.porFecha[c.fecha] = { h: (t.porFecha[c.fecha] ? t.porFecha[c.fecha].h : 0) + (jd(nombre, dow) || hd(nombre)), completo: true };
            usada = true;
          } else {
            var h = horas(v);
            if (h != null && h > 0) {
              var prev = t.porFecha[c.fecha] || { h: 0 };
              prev.h += h;
              t.porFecha[c.fecha] = prev;
              usada = true;
            }
          }
        });
        if (usada) { av.usadas++; trab(nombre).registros++; }
      });
    } else {
      filas.forEach(function (fila) {
        if (!fila.some(function (c) { return !vacia(c); })) return;
        av.filas++;
        var nombre = m.trabajador != null ? nombreDe(fila, previo) : '';
        if (!nombre) { av.sinTrabajador++; return; }
        if (esTotal(nombre)) { av.totales++; return; }
        previo = nombre;
        if (tiposSet && !tiposSet[sinAcentos(fila[m.tipo])]) { av.otroTipo++; return; }
        var f = m.fecha != null ? fecha(fila[m.fecha]) : null;
        var desde = m.desde != null ? fecha(fila[m.desde]) : null;
        var hasta = m.hasta != null ? fecha(fila[m.hasta]) : null;
        var h = m.horas != null ? horas(fila[m.horas]) : null;
        var t;
        if (desde && hasta) {
          if (desde > hasta) { var tmp = desde; desde = hasta; hasta = tmp; }
          anotarAnio(desde);
          if (hasta.slice(0, 4) !== desde.slice(0, 4)) anotarAnio(hasta);
          var ini = desde, fin = hasta, recortado = false;
          if (anio) {
            if (hasta.slice(0, 4) < anio || desde.slice(0, 4) > anio) { av.otroAnio++; return; }
            if (ini < anio + '-01-01') { ini = anio + '-01-01'; recortado = true; }
            if (fin > anio + '-12-31') { fin = anio + '-12-31'; recortado = true; }
          }
          t = trab(nombre);
          // Un periodo cuenta los días de jornada que no son festivo; las horas
          // se toman del archivo si vienen (y el periodo no se ha recortado).
          var periodo = { desde: ini, hasta: fin, horas: 0, dias: 0 };
          var horasCalendario = 0;
          M.rangoFechas(ini, fin).forEach(function (x) {
            var j = jd(nombre, M.diaSemana(x));
            if (j > 0 && !esFestivo(x)) { periodo.dias++; horasCalendario += j; }
          });
          periodo.horas = h != null && h > 0 && !recortado ? h : horasCalendario;
          t.horas += periodo.horas;
          t.dias += periodo.dias;
          t.periodos.push(periodo);
          t.registros++;
          av.usadas++;
          return;
        }
        var unica = f || desde || hasta;
        if (unica) anotarAnio(unica);
        if (anio) {
          if (unica && unica.slice(0, 4) !== anio) { av.otroAnio++; return; }
          if (!unica) av.sinFecha++;
        }
        if (h == null || h <= 0) { av.sinHoras++; return; }
        t = trab(nombre);
        t.registros++;
        av.usadas++;
        if (m.modo === 'fecha' && unica) {
          var p = t.porFecha[unica] || { h: 0 };
          p.h += h;
          t.porFecha[unica] = p;
        } else {
          t.horas += h;
          t.dias += h / hd(nombre);
          if (unica) t.fechas.push({ fecha: unica, horas: h });
        }
      });
    }

    var lista = Object.keys(porNombre).map(function (nombre) {
      var t = porNombre[nombre];
      Object.keys(t.porFecha).sort().forEach(function (f) {
        var e = t.porFecha[f];
        var j = jd(nombre, M.diaSemana(f)) || hd(nombre);
        // Más de 24 h en una sola fecha no es un día: es un total con fecha de inicio.
        var d = e.completo ? 1 : e.h > 24 ? e.h / hd(nombre) : Math.min(1, e.h / j);
        t.horas += e.h;
        t.dias += d;
        t.fechas.push({ fecha: f, horas: e.h, dias: d });
      });
      var a = ajustes[nombre] || {};
      var derecho = a.derecho != null && a.derecho !== '' && isFinite(+a.derecho) ? +a.derecho : (+opciones.derecho || 0);
      t.dias = Math.round(t.dias * 1000) / 1000;
      t.horas = Math.round(t.horas * 1000) / 1000;
      t.derecho = derecho;
      t.pendientes = Math.round((derecho - t.dias) * 1000) / 1000;
      t.horasDia = hd(nombre);
      t.horasDiaPropias = !!(a && +a.horasDia > 0);
      t.derechoPropio = a.derecho != null && a.derecho !== '';
      delete t.porFecha;
      return t;
    }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base', numeric: true }); });

    var totales = lista.reduce(function (s, t) { s.horas += t.horas; s.dias += t.dias; s.pendientes += t.pendientes; return s; }, { horas: 0, dias: 0, pendientes: 0 });
    return { trabajadores: lista, avisos: av, anios: Object.keys(anios).sort(), totales: totales };
  }

  function filasCSV(res, anio) {
    var filas = [['Trabajador', 'Horas de vacaciones', 'Días disfrutados', 'Días que corresponden', 'Días pendientes', 'Horas por día', 'Año']];
    res.trabajadores.forEach(function (t) {
      filas.push([t.nombre, t.horas, t.dias, t.derecho, t.pendientes, t.horasDia, anio || 'todos']);
    });
    filas.push(['Total', res.totales.horas, res.totales.dias, '', res.totales.pendientes, '', '']);
    return filas;
  }

  var api = {
    texto: texto,
    sinAcentos: sinAcentos,
    decodificarTexto: decodificarTexto,
    detectarFormato: detectarFormato,
    leerArchivo: leerArchivo,
    leerTexto: leerTexto,
    leerHTML: leerHTML,
    leerXML2003: leerXML2003,
    leerXLSX: leerXLSX,
    fecha: fecha,
    horas: horas,
    ancho: ancho,
    letraColumna: letraColumna,
    nombresColumnas: nombresColumnas,
    detectarCabecera: detectarCabecera,
    columnasFecha: columnasFecha,
    proponerMapeo: proponerMapeo,
    valoresColumna: valoresColumna,
    calcular: calcular,
    filasCSV: filasCSV
  };
  raiz.Equipo = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
