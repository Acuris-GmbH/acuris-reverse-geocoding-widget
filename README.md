# acuris-reverse-geocoding-widget

> Reverse geocoding widget: coordinates -> nearest postal addresses with distance in metres. ~160 countries, 'use my location' button, framework-free JavaScript. MIT.

[![CI](https://github.com/Acuris-GmbH/acuris-reverse-geocoding-widget/actions/workflows/ci.yml/badge.svg)](https://github.com/Acuris-GmbH/acuris-reverse-geocoding-widget/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Status:** beta (0.1.1)

---

## What this is

A small, dependency-free widget for reverse geocoding: latitude/longitude in, the nearest postal
addresses out, each with its **distance in metres**, its coordinates and a precision label. It
calls the Acuris [`GET /reverse`](https://api.acuris-geo.com/docs) endpoint with
`radius_m=500&limit=5` by default.

- About **160 countries**. Countries without reverse geocoding answer HTTP 501
  `reverse_not_available` and the widget says so; today these include Switzerland, Japan,
  Turkey, South Korea, Israel, Argentina, Chile, Vietnam, Pakistan, the Philippines and Hong
  Kong (forward geocoding and validation still work there).
- Handles both answer shapes: a single flat result (`limit=1`) and `{count, results[]}`.
- Optional **Use my location** button: the browser's geolocation is requested only when the user
  clicks it, never on page load.
- UK (`gbr`) requests go to `https://paf.acuris-geo.com` automatically; UK lookups are licensed
  separately (see the [UK pricing](https://www.acuris-geo.com/acuris-pricing/#uk-plans)).

Geolocation in browsers requires a secure context (HTTPS or `localhost`); from a `file://` page
the button may be refused by the browser, typing coordinates always works.

---

## Quick start

Copy the files from `src/` into your site (no build step, no dependencies) and load them
in this order: the stylesheet, `acuris-core.js`, then the widget.

```html
<link rel="stylesheet" href="/js/acuris/acuris-reverse-geocoding.css">
<script src="/js/acuris/acuris-core.js"></script>
<script src="/js/acuris/acuris-reverse-geocoding.js"></script>
```

```html
<div id="reverse"></div>
<script>
  AcurisReverseGeocoding.mount('#reverse', {
    apiKey: 'YOUR_ACURIS_API_KEY',   // free key: https://api.acuris-geo.com/register?lang=en
    country: 'select',               // or a fixed ISO-3 code, e.g. 'deu'
    limit: 5
  });
</script>
```

Without a DOM: `AcurisReverseGeocoding.reverse({ lat: 52.5163, lng: 13.3777 }, { apiKey, country: 'deu' })`
resolves to the API response; `AcurisReverseGeocoding.results(response)` always gives you an array.

Open [`examples/index.html`](examples/index.html) for a working page (paste your key; it is kept
in `sessionStorage` for that tab only).

### Options

| Option | Default | Description |
| --- | --- | --- |
| `apiKey` | none | Your Acuris API key. Required unless `baseUrl` points at your own proxy. |
| `country` | `'select'` | ISO-3 code or `'select'` for a selector (placeholder "Select country", never preselected). |
| `limit` | `5` | Addresses to return. |
| `radius` | `500` | Initial search radius in metres (the user can change it). |
| `geolocation` | `true` | Show the "Use my location" button when the browser supports it. |
| `baseUrl` / `ukBaseUrl` | Acuris hosts | Your proxy (see Production). |
| `onResult` / `onError` | none | Callbacks with the response / `{status, code, message}`. |
| `fetch` | `window.fetch` | Inject your own `fetch`. |
| `attribution` | `true` | Shows the link "Powered by Acuris Geo" under the results; set `false` to turn it off. |

### Events

| Event | `event.detail` |
| --- | --- |
| `acuris:result` | `{ response, results }`: `results` is always an array, nearest first, each with `distance_m` |
| `acuris:error` | `{ error }` with `status`, `code` (`reverse_not_available`, `invalid_api_key`, ...), `message` |

---

## Production

Every Acuris widget needs an API key. A key placed in browser code is **visible to anyone who
opens your page**, so treat the key in `apiKey` as an evaluation setup.

**Recommended for production:** keep the key on your server and let the widget talk to your own
backend. Set `baseUrl` (and `ukBaseUrl` for UK addresses) to endpoints you host; they forward the
request to the Acuris API and add the `X-Acuris-Key` header server-side. Leave `apiKey` empty in
the browser. UK requests (`country=gbr`) must always be forwarded to https://paf.acuris-geo.com,
everything else to https://api.acuris-geo.com; the same key works on both.

```js
// Minimal Node 22 proxy (Express). Forward only the paths this widget uses,
// and add your own rate limiting and bot protection.
const ACURIS_KEY = getSecret('ACURIS_API_KEY'); // from your secret store, never from the browser
const HOSTS = { '/acuris': 'https://api.acuris-geo.com', '/acuris-uk': 'https://paf.acuris-geo.com' };
app.use(express.json());
app.all(/^\/(acuris|acuris-uk)\/(reverse)$/, async (req, res) => {
  const prefix = '/' + req.path.split('/')[1];
  const r = await fetch(HOSTS[prefix] + req.originalUrl.slice(prefix.length), {
    method: req.method,
    headers: { 'X-Acuris-Key': ACURIS_KEY, 'Content-Type': 'application/json' },
    body: req.method === 'GET' ? undefined : JSON.stringify(req.body)
  });
  res.status(r.status).type('application/json').send(await r.text());
});
```

```js
AcurisReverseGeocoding.mount('#reverse', { baseUrl: '/acuris', ukBaseUrl: '/acuris-uk', country: 'select' });
```

### Free tier

A free key gives you **1,000 transactions a day, no card, never expires**
([get one](https://api.acuris-geo.com/register?lang=en)). Commercial use of the free tier requires a visible attribution link back
to acuris-geo.com wherever results are shown; see the [Terms of Service](https://api.acuris-geo.com/legal/terms).
Paid plans: [https://www.acuris-geo.com/acuris-pricing/](https://www.acuris-geo.com/acuris-pricing/).

---

## Use with AI coding agents

If you build with Claude Code, Cursor, GitHub Copilot, OpenCode, Codex, Gemini CLI or any other
tool that supports [Agent Skills](https://agentskills.io), install the Acuris agent context. It
teaches your agent the Acuris API: endpoints, headers, error codes and the patterns used here.

```bash
# Claude Code
/plugin marketplace add Acuris-GmbH/acuris-agent-context
/plugin install acuris@acuris-plugins

# Cursor, Copilot, Codex, OpenCode, Gemini CLI and others
npx skills add Acuris-GmbH/acuris-agent-context
```

Source: <https://github.com/Acuris-GmbH/acuris-agent-context>

---

## Docs & links

- API reference: <https://api.acuris-geo.com/docs>
- OpenAPI spec: <https://api.acuris-geo.com/docs/openapi.yaml>
- Get a free API key: <https://api.acuris-geo.com/register?lang=en>
- Pricing: <https://www.acuris-geo.com/acuris-pricing/>
- Terms of Service: <https://api.acuris-geo.com/legal/terms>
- Support: support@acuris-geo.com

---

## More Acuris on GitHub

| Repository | What it does |
| --- | --- |
| [acuris-address-validation-widget](https://github.com/Acuris-GmbH/acuris-address-validation-widget) | Address validation for any HTML form, 240+ countries |
| [acuris-address-autocomplete-widget](https://github.com/Acuris-GmbH/acuris-address-autocomplete-widget) | Address autocomplete (typeahead), 20 countries |
| [acuris-geocoding-widget](https://github.com/Acuris-GmbH/acuris-geocoding-widget) | Address to latitude/longitude with a precision tier |
| [acuris-mcp](https://github.com/Acuris-GmbH/acuris-mcp) | MCP server: address validation and geocoding tools for AI assistants |
| [acuris-agent-context](https://github.com/Acuris-GmbH/acuris-agent-context) | Agent Skills that teach coding agents the Acuris API |
| [acuris-commercetools-connector](https://github.com/Acuris-GmbH/acuris-commercetools-connector) | commercetools checkout widgets + API Extension |
| [acuris-centra-connector](https://github.com/Acuris-GmbH/acuris-centra-connector) | Centra checkout address validation |
| [acuris-scayle-connector](https://github.com/Acuris-GmbH/acuris-scayle-connector) | SCAYLE checkout address validation |

---

## License

Maintained by Acuris GmbH · Support: support@acuris-geo.com

MIT (this widget). The Acuris API itself is a commercial service with a free tier.
