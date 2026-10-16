/*
 * Comunidades y ciudades autónomas de España, con sus provincias y el boletín
 * oficial donde se publican los calendarios laborales y las fiestas locales.
 * Códigos ISO 3166-2:ES.
 */
(function (raiz) {
  'use strict';

  var regiones = [
    { codigo: 'AN', nombre: 'Andalucía', provincias: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'], boletin: 'BOJA', url: 'https://www.juntadeandalucia.es/boja' },
    { codigo: 'AR', nombre: 'Aragón', provincias: ['Huesca', 'Teruel', 'Zaragoza'], boletin: 'BOA', url: 'https://www.boa.aragon.es/' },
    { codigo: 'AS', nombre: 'Principado de Asturias', provincias: ['Asturias'], boletin: 'BOPA', url: 'https://www.asturias.es/bopa' },
    { codigo: 'IB', nombre: 'Illes Balears', provincias: ['Illes Balears'], boletin: 'BOIB', url: 'https://www.caib.es/eboibfront/' },
    { codigo: 'CN', nombre: 'Canarias', provincias: ['Las Palmas', 'Santa Cruz de Tenerife'], boletin: 'BOC', url: 'https://www.gobiernodecanarias.org/boc/' },
    { codigo: 'CB', nombre: 'Cantabria', provincias: ['Cantabria'], boletin: 'BOC', url: 'https://boc.cantabria.es/' },
    { codigo: 'CL', nombre: 'Castilla y León', provincias: ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'], boletin: 'BOCYL', url: 'https://bocyl.jcyl.es/' },
    { codigo: 'CM', nombre: 'Castilla-La Mancha', provincias: ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'], boletin: 'DOCM', url: 'https://docm.jccm.es/' },
    { codigo: 'CT', nombre: 'Cataluña', provincias: ['Barcelona', 'Girona', 'Lleida', 'Tarragona'], boletin: 'DOGC', url: 'https://dogc.gencat.cat/' },
    { codigo: 'VC', nombre: 'Comunitat Valenciana', provincias: ['Alicante/Alacant', 'Castellón/Castelló', 'Valencia/València'], boletin: 'DOGV', url: 'https://dogv.gva.es/' },
    { codigo: 'EX', nombre: 'Extremadura', provincias: ['Badajoz', 'Cáceres'], boletin: 'DOE', url: 'https://doe.juntaex.es/' },
    { codigo: 'GA', nombre: 'Galicia', provincias: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'], boletin: 'DOG', url: 'https://www.xunta.gal/diario-oficial-galicia' },
    { codigo: 'MD', nombre: 'Comunidad de Madrid', provincias: ['Madrid'], boletin: 'BOCM', url: 'https://www.bocm.es/' },
    { codigo: 'MC', nombre: 'Región de Murcia', provincias: ['Murcia'], boletin: 'BORM', url: 'https://www.borm.es/' },
    { codigo: 'NC', nombre: 'Comunidad Foral de Navarra', provincias: ['Navarra'], boletin: 'BON', url: 'https://bon.navarra.es/' },
    { codigo: 'PV', nombre: 'País Vasco', provincias: ['Araba/Álava', 'Bizkaia', 'Gipuzkoa'], boletin: 'BOPV', url: 'https://www.euskadi.eus/bopv' },
    { codigo: 'RI', nombre: 'La Rioja', provincias: ['La Rioja'], boletin: 'BOR', url: 'https://web.larioja.org/bor-portada' },
    { codigo: 'CE', nombre: 'Ciudad de Ceuta', provincias: ['Ceuta'], boletin: 'BOCCE', url: 'https://www.ceuta.es/' },
    { codigo: 'ML', nombre: 'Ciudad de Melilla', provincias: ['Melilla'], boletin: 'BOME', url: 'https://bomemelilla.es/' }
  ];

  var porCodigo = {};
  regiones.forEach(function (r) { porCodigo[r.codigo] = r; });

  var api = { lista: regiones, porCodigo: porCodigo };
  raiz.Regiones = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
