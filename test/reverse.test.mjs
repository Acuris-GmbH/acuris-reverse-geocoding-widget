import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const W = require('../src/acuris-reverse-geocoding.js');
const KEY = 'test-key-not-real';

function mockFetch(status, body, calls) {
  return (url, init) => { calls.push({ url, init }); return Promise.resolve({ status, ok: status < 300, json: () => Promise.resolve(body) }); };
}

test('query: GET /reverse with radius_m=500 and limit=5 by default', async () => {
  const calls = [];
  await W.reverse({ lat: '52.5163', lng: '13,3777' }, { apiKey: KEY, country: 'deu', fetch: mockFetch(200, { count: 0, results: [] }, calls) });
  assert.equal(calls[0].url, 'https://api.acuris-geo.com/reverse?country=deu&lat=52.5163&lng=13.3777&radius_m=500&limit=5');
  assert.equal(calls[0].init.headers['X-Acuris-Client'], 'gh-reverse-geocoding/0.1.1');
});

test('gbr reverse goes to the PAF host', async () => {
  const calls = [];
  await W.reverse({ lat: 51.5033, lng: -0.1276 }, { apiKey: KEY, country: 'gbr', fetch: mockFetch(200, {}, calls) });
  assert.match(calls[0].url, /^https:\/\/paf\.acuris-geo\.com\/reverse\?country=gbr&/);
});

test('invalid coordinates and missing country are refused locally', async () => {
  const calls = [];
  await assert.rejects(W.reverse({ lat: 'abc', lng: 2 }, { apiKey: KEY, country: 'deu', fetch: mockFetch(200, {}, calls) }), (e) => e.code === 'invalid_coordinates');
  await assert.rejects(W.reverse({ lat: 95, lng: 2 }, { apiKey: KEY, country: 'deu', fetch: mockFetch(200, {}, calls) }), (e) => e.code === 'invalid_coordinates');
  await assert.rejects(W.reverse({ lat: 1, lng: 2 }, { apiKey: KEY, fetch: mockFetch(200, {}, calls) }), (e) => e.code === 'country_required');
  assert.equal(calls.length, 0);
});

test('flat (limit=1) and list ({count, results}) answers', () => {
  const flat = { street: 'Pariser Platz', hno: '1', city: 'Berlin', zip: '10117', distance_m: 12, lat: 52.5163, lng: 13.3777, accuracy_type: 'rooftop' };
  assert.equal(W.results(flat).length, 1);
  const list = { count: 2, results: [flat, { ...flat, hno: '2', distance_m: 1530, accuracy_type: 'street_interpolated' }] };
  assert.equal(W.results(list).length, 2);
  assert.equal(W.results({ count: 0, results: [] }).length, 0);
  const h = W.resultHtml(list);
  assert.match(h, /1 Pariser Platz\n10117 Berlin/);
  assert.match(h, /<strong>12 m<\/strong> away/);
  assert.match(h, /<strong>1\.5 km<\/strong> away/);
  assert.match(h, /acuris-prec--point">Rooftop/);
  assert.match(h, /acuris-prec--area">Interpolated on the street/);
  assert.match(W.resultHtml({ count: 0, results: [] }), /No address found/);
});

test('point_coordinate wins when present, tier fallback otherwise', () => {
  assert.equal(W.isPoint({ accuracy_type: 'rooftop', point_coordinate: false }), false);
  assert.equal(W.isPoint({ accuracy_type: 'arrival_point' }), true);
  assert.equal(W.isPoint({ accuracy_type: 'postcode_centroid' }), false);
});

test('501 reverse_not_available renders a clear message', async () => {
  const calls = [];
  await assert.rejects(W.reverse({ lat: 47.37, lng: 8.54 }, { apiKey: KEY, country: 'che', fetch: mockFetch(501, { error: 'reverse_not_available' }, calls) }), (e) => {
    assert.equal(e.status, 501);
    assert.equal(e.code, 'reverse_not_available');
    assert.match(W.errorHtml(e), /Reverse geocoding is not available for this country yet/);
    return true;
  });
});

test('form: geolocation button only when available, no preselected country', () => {
  assert.match(W.formHtml({ country: 'select', idPrefix: 't', geolocation: true }), /Use my location/);
  const h = W.formHtml({ country: 'select', idPrefix: 't', geolocation: false });
  assert.doesNotMatch(h, /Use my location/);
  assert.equal((h.match(/ selected/g) || []).length, 1);
});

test('render: attribution link on by default under results, removable', () => {
  const d = { count: 1, results: [{ formatted_address: 'A', lat: 1, lng: 2, distance_m: 5 }] };
  assert.match(W.resultHtml(d), /<\/ol><p class="acuris-powered"><a href="https:\/\/www\.acuris-geo\.com\/" target="_blank" rel="noopener">Powered by Acuris Geo<\/a><\/p>$/);
  assert.doesNotMatch(W.resultHtml(d, { attribution: false }), /Powered by Acuris Geo|acuris-powered/);
  assert.doesNotMatch(W.resultHtml({ count: 0, results: [] }), /ACURIS-geo\.com/);
});
