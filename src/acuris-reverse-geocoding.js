/*! Acuris reverse geocoding widget | MIT | Copyright (c) 2026 Acuris GmbH */
(function (root, factory) {
  var C = (typeof module === 'object' && module.exports) ? require('./acuris-core.js') : root.AcurisCore;
  var api = factory(C, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AcurisReverseGeocoding = api;
})(typeof self !== 'undefined' ? self : this, function (C, root) {
  'use strict';

  var VERSION = '0.1.0';
  var ATTRIB = 'Reverse geocoding by ACURIS-geo.com';
  var ATTRIB_URL = 'https://www.acuris-geo.com/';

  // Visible attribution link, on by default; opts.attribution === false removes it.
  function attribLinkHtml(opts) {
    if (opts && opts.attribution === false) return '';
    return '<p class="acuris-powered"><a href="' + C.esc(ATTRIB_URL) + '" target="_blank" rel="noopener">' + C.esc(ATTRIB) + '</a></p>';
  }

  function num(v) { var n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }

  // p = {lat, lng, radius_m?, limit?}
  function buildQuery(p, country) {
    return { country: String(country || '').toLowerCase(), lat: num(p.lat), lng: num(p.lng), radius_m: p.radius_m || 500, limit: p.limit || 5 };
  }

  function reverse(p, opts) {
    opts = opts || {};
    var q = buildQuery(p || {}, opts.country);
    if (!q.country) return Promise.reject(C.normalizeError(0, { error: 'country_required', message: 'Select a country first.' }));
    if (q.lat == null || q.lng == null || Math.abs(q.lat) > 90 || Math.abs(q.lng) > 180) {
      return Promise.reject(C.normalizeError(0, { error: 'invalid_coordinates', message: 'Enter a valid latitude (-90 to 90) and longitude (-180 to 180).' }));
    }
    return C.request({ path: '/reverse', query: q, country: q.country, apiKey: opts.apiKey, baseUrl: opts.baseUrl, ukBaseUrl: opts.ukBaseUrl,
      fetch: opts.fetch, signal: opts.signal, client: opts.client || ('gh-reverse-geocoding/' + VERSION) }).then(function (r) { return r.data; });
  }

  // limit=1 answers are one flat result; limit>1 answers are {count, results[]}.
  function results(d) {
    if (!d) return [];
    if (Object.prototype.toString.call(d.results) === '[object Array]') return d.results;
    return (d.street || d.city || d.formatted_address || typeof d.lat === 'number') ? [d] : [];
  }

  // /reverse does not emit point_coordinate yet; fall back to the tier when it is absent.
  function isPoint(r) {
    if (typeof r.point_coordinate === 'boolean') return r.point_coordinate;
    return r.accuracy_type === 'rooftop' || r.accuracy_type === 'arrival_point';
  }

  function label(r) {
    if (r.formatted_address) return r.formatted_address;
    return [[r.hno, r.street].filter(Boolean).join(' '), [r.zip, r.city].filter(Boolean).join(' '), r.state].filter(Boolean).join('\n');
  }

  function dist(m) {
    if (typeof m !== 'number') return '';
    return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km';
  }

  // Pure: /reverse response -> HTML string. opts.attribution === false hides the attribution link.
  function resultHtml(d, opts) {
    var list = results(d);
    if (!list.length) return '<p class="acuris-meta">No address found within the search radius.</p>';
    var h = '<ol class="acuris-rev-list">';
    for (var i = 0; i < list.length; i++) {
      var r = list[i] || {}, p = C.precision(r);
      h += '<li><div class="acuris-addr">' + C.esc(label(r)) + '</div><p class="acuris-meta">' +
        (r.distance_m != null ? '<strong>' + dist(r.distance_m) + '</strong> away' : '') +
        (p.label ? ' <span class="acuris-prec acuris-prec--' + (isPoint(r) ? 'point' : 'area') + '">' + C.esc(p.label) + '</span>' : '') +
        (typeof r.lat === 'number' ? ' <span class="acuris-ll">' + r.lat.toFixed(6) + ', ' + r.lng.toFixed(6) + '</span>' : '') + '</p></li>';
    }
    return h + '</ol>' + attribLinkHtml(opts);
  }

  function errorHtml(err) {
    if (err && err.code === 'reverse_not_available') {
      return '<p class="acuris-error" role="alert">Reverse geocoding is not available for this country yet. Forward geocoding and address validation still work.</p>';
    }
    return '<p class="acuris-error" role="alert">' + C.esc(err && err.message) + '</p>';
  }

  function formHtml(o) {
    var id = o.idPrefix, h = '<form class="acuris-rev" novalidate>';
    if (o.country === 'select') {
      h += '<label for="' + id + '-c">Country</label><select id="' + id + '-c" name="country" required>' + C.countryOptions(C.FREQUENT) +
        '<option value="__other">Other country (ISO-3 code)</option></select>' +
        '<input name="country_other" maxlength="3" placeholder="e.g. irl" hidden aria-label="ISO-3 country code">';
    }
    h += '<div class="acuris-rev-ll"><label>Latitude <input name="lat" inputmode="decimal" placeholder="52.5163"></label>' +
      '<label>Longitude <input name="lng" inputmode="decimal" placeholder="13.3777"></label>' +
      '<label>Radius (m) <input name="radius_m" inputmode="numeric" value="' + (o.radius || 500) + '"></label></div>';
    h += '<div class="acuris-rev-actions"><button type="submit">Find addresses</button>';
    if (o.geolocation) h += '<button type="button" class="acuris-locate">Use my location</button>';
    return h + '</div><div class="acuris-out" aria-live="polite"></div></form>';
  }

  function mount(target, options) {
    var o = {}, k;
    for (k in options || {}) if (Object.prototype.hasOwnProperty.call(options, k)) o[k] = options[k];
    o.country = o.country || 'select';
    o.idPrefix = C.nextId('acuris-rev');
    var nav = root && root.navigator;
    o.geolocation = o.geolocation !== false && !!(nav && nav.geolocation);
    var host = C.pick(target);
    if (!host) throw new Error('AcurisReverseGeocoding: target not found');
    host.innerHTML = formHtml(o);
    var form = host.querySelector('form'), out = host.querySelector('.acuris-out');
    var sel = form.querySelector('select'), other = form.querySelector('input[name="country_other"]');
    var locate = form.querySelector('.acuris-locate');
    function field(n) { return form.querySelector('input[name="' + n + '"]'); }
    if (sel) sel.addEventListener('change', function () { other.hidden = sel.value !== '__other'; });
    function country() {
      if (!sel) return o.country;
      return sel.value === '__other' ? String(other.value || '').trim().toLowerCase() : sel.value;
    }
    function run() {
      out.innerHTML = '<p class="acuris-busy">Searching…</p>';
      var p = { lat: field('lat').value, lng: field('lng').value, radius_m: parseInt(field('radius_m').value, 10) || 500, limit: o.limit || 5 };
      return reverse(p, { apiKey: o.apiKey, country: country(), baseUrl: o.baseUrl, ukBaseUrl: o.ukBaseUrl, fetch: o.fetch, client: o.client })
        .then(function (d) {
          out.innerHTML = resultHtml(d, o);
          C.emit(host, 'acuris:result', { response: d, results: results(d) });
          if (typeof o.onResult === 'function') o.onResult(d);
          return d;
        }, function (err) {
          out.innerHTML = errorHtml(err);
          C.emit(host, 'acuris:error', { error: err });
          if (typeof o.onError === 'function') o.onError(err);
          return null;
        });
    }
    // Location is only requested when the user clicks the button.
    function onLocate() {
      out.innerHTML = '<p class="acuris-busy">Getting your location…</p>';
      nav.geolocation.getCurrentPosition(function (pos) {
        field('lat').value = pos.coords.latitude.toFixed(6);
        field('lng').value = pos.coords.longitude.toFixed(6);
        run();
      }, function (e) {
        out.innerHTML = '<p class="acuris-error" role="alert">' + C.esc(e && e.code === 1 ? 'Location permission was denied.' : 'Your location is not available.') + '</p>';
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    }
    function onSubmit(ev) { ev.preventDefault(); run(); }
    form.addEventListener('submit', onSubmit);
    if (locate) locate.addEventListener('click', onLocate);
    return {
      element: host, reverse: run,
      destroy: function () { form.removeEventListener('submit', onSubmit); if (locate) locate.removeEventListener('click', onLocate); host.innerHTML = ''; }
    };
  }

  return { VERSION: VERSION, buildQuery: buildQuery, reverse: reverse, results: results, isPoint: isPoint, label: label, resultHtml: resultHtml, errorHtml: errorHtml, formHtml: formHtml, mount: mount };
});
