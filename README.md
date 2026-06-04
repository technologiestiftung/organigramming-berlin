![](https://img.shields.io/badge/Built%20with%20%E2%9D%A4%EF%B8%8F-at%20Technologiestiftung%20Berlin-blue)

# Organigramm-Tool

## A simple organisation chart application for public service of Berlin

This repository contains an app for creating and editing administrative organization charts. The online tool was developed to provide a simple yet sufficient way to create organisational charts and export them as both human- and machine-readable files.

Until now, the organization charts of Berlin's administrative units are created with Excel or PowerPoint and published in pdf format. On the one hand, their graphical format makes them easy for people to read. On the other hand, they are difficult to process automatically. However, the organigrams contain a lot of valuable information and a machine-readable representation could enable various uses and applications.
The json file format allows the data entered to be stored in a simple text format and made available as Open Data. The organizational chart tool also aims to simplify the creation of organizational charts for the Berlin administration and to bring the organizational charts into a more uniform format.

More information and the prototype are accessible through the [ODIS website](https://odis-berlin.de/projekte/organigramme/) (only in German).

## Export Formats

Charts can be exported in the following formats:

- **JSON** – the native, machine-readable source format used by the tool. Suitable as Open Data and for re-importing into the editor. Personal data can optionally be stripped before export.
- **PDF** – a visual rendering of the chart as a print-ready PDF.
- **PNG** – a raster image of the chart for embedding in slides, documents or web pages.
- **SVG** – a vector image of the chart, ideal for further graphical processing.
- **RDF (Linked Open Data)** – Available as **JSON-LD** (`.jsonld`), **Turtle** (`.ttl`) or **N-Quads** (`.nq`).
- **Accessible HTML** – a screen-reader friendly, text-based rendering of the chart with a hierarchical heading structure, a table of contents and inline glossary explanations. Downloadable as a `.html` file.
- **Accessible PDF (PDF/UA)** – a tagged PDF that follows the [Berliner Standards](https://www.berlin.de/lb/digitale-barrierefreiheit/anforderungen/berliner-standards/fuer-pdf-1493292.php) for accessible PDFs and PDF/UA-1 (ISO 14289-1), with embedded fonts, a structure tree and inline glossary explanations.

The accessible HTML view can additionally be served directly in place of the editor by visiting the tool with `?format=html-accessible&dataurl=…` — see [URL Parameters](#url-parameters).

## Getting Started

Clone this repository, go to the directory `app` by:

`cd app`

Then install the required dependencies with:

`yarn install`

## Development

To run the app in the development mode run:

`yarn start`

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

## Production

To build the app for production to the `build` folder run:

`yarn build`

It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### Deployment

The repository is set up for deployment on [Netlify](https://www.netlify.com/).
Netlify uses [`netlify.toml`](./netlify.toml) to wire up the build
(running `yarn build` against the `app/` directory and publishing
`app/build`) together with a small serverless function in
[`netlify/functions/proxy.js`](./netlify/functions/proxy.js). The
function is mounted at `/proxy` and is used as a **CORS fallback** for
the `?dataurl=…` parameter: whenever a direct in-browser fetch of the
remote `.json` file is blocked by the remote host's CORS policy, the
app retries the request through `/proxy?url=<encoded-json-url>`. The
proxy enforces method, scheme, content-type, size and rate-limit
restrictions — see [CORS fallback proxy](#cors-fallback-proxy) below
for the full ruleset. On a static host that does not run Netlify
functions the proxy is unavailable and the fallback step simply fails.

<!-- ## Changelog (added, fixed, changed)

- 12.03.2022 - Added: simple changelog
- 12.03.2022 - Fixed: [Use "overflow-wrap: break-word" for organisation units](https://github.com/technologiestiftung/organigramming-berlin/pull/41)
- 12.03.2022 - Added: [Metadata "about the tool" has been added to the export file](https://github.com/technologiestiftung/organigramming-berlin/pull/37) -->

## URL Parameters

The app supports the following URL query parameters:

| Parameter  | Type    | Description                                                                                                                                                                                                 |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dataurl`  | string  | URL to a remote `.json` file (must be `http:` or `https:` and end with `.json`) that will be offered for import on load.                                                                                    |
| `readonly` | boolean | When set (e.g. `?readonly=true`, `?readonly=1`, or just `?readonly`) the app opens in view-only mode. The chart nodes are not interactive, and the sidebar only exposes the export and the info/help button. Values `false` or `0` keep editing enabled. |
| `format`   | string  | When set to `html-accessible` (in combination with `dataurl`) the app replaces its interactive UI with a static, screen-reader friendly HTML rendering of the chart. Intended as an alternative view for people who cannot use the visual editor. |

Example URLs:

- Load a remote chart: `https://example.com/?dataurl=https://example.org/chart.json`
- Open a remote chart in read-only mode: `https://example.com/?dataurl=https://example.org/chart.json&readonly=true`
- Open the accessible HTML view of a remote chart: `https://example.com/?dataurl=https://example.org/chart.json&format=html-accessible`

### `format=html-accessible` details

- The accessible view requires a valid `dataurl`. Without it, an accessible error page is shown.
- While the remote data is being fetched a brief loading page is rendered.
- If the remote file cannot be loaded or fails validation, an accessible error page lists the issues.
- The accessible page is rendered directly into the current window (no popup), so it is not affected by popup blockers.
- The interactive React app is intentionally **not** mounted in this mode.

### CORS fallback proxy

`dataurl` performs a direct browser fetch of the remote `.json` file. If
the remote host does not send the required CORS headers (typical for
files hosted on static servers without explicit configuration), the
browser will block the request.

To paper over that case the deployed app exposes a lightweight Netlify
function at `/proxy?url=<encoded-json-url>` which is used as an
automatic fallback whenever the direct fetch throws. The proxy is
intentionally narrow:

- Only `GET` is accepted.
- The target URL must use `http:` / `https:` and end with `.json`.
- The remote response must declare a JSON-ish content-type and parse as
  JSON.
- Downloads are hard-capped at **10 MB** (also enforced on the client).
- Each client IP is limited to ~10 requests per minute.

The proxy lives in [`netlify/functions/proxy.js`](./netlify/functions/proxy.js)
and is wired up via [`netlify.toml`](./netlify.toml). On `localhost` (or
any environment without the Netlify function), the fallback simply
fails and the original network error message is shown.

## Development Notes

### Schema

The Charts data structure is defined in [organization_chart.json](./app/src/schemas/organization_chart.json).

### UI Schema

The Organisation UI schema is defined in the [OrganisationTab.js](./app/src/components/Sidebar/OrganisationTab.js) component.

The document UI schema is defined in the [DocumentTab.js](./app/src/components/Sidebar/DocumentTab.js) component.

### Validation rules

If you want to add validation rules you will need to add a new rule to [validationRules.js](./app/src/validation/validationRules.js)

If it's a new set of validation rules (e.g. for a specific organisation), you will also need to add the key name of the organisation to the schema in your [organization_chart.json](./app/src/schemas/organization_chart.json)

You can add validation rules to any property from the list of available properties listed in [validationRules.js](./app/src/validation/validationRules.js) by adding a regex and a warning message.

### Updating RDF vocabulary

The tool uses two distinct vocabulary sources:

1. **The Berlin organisations vocabulary (`berorgs`)** lives in
   the separate [lod-vocabulary](https://github.com/berlin/lod-vocabulary)
   repository (the file
   [`data/berorgs/berorgs.ttl`](https://github.com/berlin/lod-vocabulary/blob/main/data/berorgs/berorgs.ttl)).
   This Turtle file is the source of truth for all vocabulary **terms,
   their labels and their `rdfs:comment` definitions**. The accessible
   HTML and PDF exports fetch this file at runtime from
   `https://raw.githubusercontent.com/berlin/lod-vocabulary/main/data/berorgs/berorgs.ttl`,
   parse it and use the German `rdfs:comment` strings as inline
   glossary explanations. RDF/Linked Open Data exports reference the
   same vocabulary via the namespace
   `https://berlin.github.io/lod-vocabulary/berorgs/`.
   If you need to add or change a term definition, do it in the
   `lod-vocabulary` repository.

2. **The local lookup table
   [`typeVocabLookup.json`](./app/src/services/typeVocabLookup.json)**
   maps the human-friendly German labels users pick in the editor (e.g.
   `"Abteilung"`, `"Bezirksamt"`, `"Hauptamt"`, `"Leitung"`) to entries
   in the berorgs vocabulary. Each entry has the shape
   ```json
   "Abteilung": {
     "vocab": "berorgs",
     "name": "Abteilung",
     "type": "org"
   }
   ```
   where `name` is the term slug used inside the `berorgs.ttl`,
   `vocab` is the vocabulary prefix and `type` is either `"org"`
   (organisation unit type) or `"positionStatus"` (e.g. acting,
   deputy). When a new type is offered in the editor, add it to this
   lookup file so the RDF export emits the correct `@id` and the
   accessible exports can pick up the matching glossary entry.

When introducing a brand-new organisation or position type the typical
workflow is therefore:

1. Add (or update) the term in `lod-vocabulary/data/berorgs/berorgs.ttl`
   with German `rdfs:label` and `rdfs:comment`.
2. Add the matching mapping entry to
   [`typeVocabLookup.json`](./app/src/services/typeVocabLookup.json).

## Acknowledgement

This project relies on the projects of Dabeng's [react-orgchart](https://github.com/dabeng/react-orgchart) and therefore on its precursor, Wesnolte's [jOrgChart](https://github.com/wesnolte/jOrgChart).

The icons used in this app came from [icons.getbootstrap.com/](https://icons.getbootstrap.com/).

The included files of Berlin's coats of arms came from [https://de.wikipedia.org/wiki/Liste_der_Wappen_in_Berlin](https://de.wikipedia.org/wiki/Liste_der_Wappen_in_Berlin).

## Contributors

Thanks go to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center"><a href="https://github.com/Lisa-Stubert"><img src="https://avatars.githubusercontent.com/u/61182572?v=4?s=64" width="64px;" alt="Lisa-Stubert"/><br /><sub><b>Lisa-Stubert</b></sub></a><br /><a href="https://github.com/technologiestiftung/organigramming-berlin/commits?author=Lisa-Stubert" title="Code">💻</a> <a href="#data-Lisa-Stubert" title="Data">🔣</a></td>
      <td align="center"><a href="https://github.com/ester-t-s"><img src="https://avatars.githubusercontent.com/u/91192024?v=4?s=64" width="64px;" alt="Ester"/><br /><sub><b>Ester</b></sub></a><br /><a href="https://github.com/technologiestiftung/organigramming-berlin/commits?author=ester-t-s" title="Code">💻</a> <a href="#data-ester-t-s" title="Data">🔣</a></td>
      <td align="center"><a href="https://github.com/tihartma"><img src="https://avatars.githubusercontent.com/u/15090548?v=4?s=64" width="64px;" alt="tihartma"/><br /><sub><b>tihartma</b></sub></a><br /><a href="https://github.com/technologiestiftung/organigramming-berlin/commits?author=tihartma" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/dnsos"><img src="https://avatars.githubusercontent.com/u/15640196?v=4?s=64" width="64px;" alt="Dennis Ostendorf"/><br /><sub><b>Dennis Ostendorf</b></sub></a><br /><a href="https://github.com/technologiestiftung/organigramming-berlin/commits?author=dnsos" title="Code">💻</a></td>
      <td align="center"><a href="https://vogelino.com/"><img src="https://avatars.githubusercontent.com/u/2759340?v=4?s=64" width="64px;" alt="Lucas Vogel"/><br /><sub><b>Lucas Vogel</b></sub></a><br /><a href="https://github.com/technologiestiftung/organigramming-berlin/commits?author=vogelino" title="Documentation">📖</a></td>
      <td align="center"><a href="https://fabianmoronzirfas.me"><img src="https://avatars.githubusercontent.com/u/315106?v=4?s=64" width="64px;" alt="Fabian Morón Zirfas"/><br /><sub><b>Fabian Morón Zirfas</b></sub></a><br /><a href="#infra-ff6347" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
      <td align="center"><a href="https://github.com/m-b-e"><img src="https://avatars.githubusercontent.com/u/36029603?v=4?s=64" width="64px;" alt="Max B. Eckert"/><br /><sub><b>Max B. Eckert</b></sub></a><br /><a href="https://github.com/technologiestiftung/organigramming-berlin/commits?author=m-b-e" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center"><a href="https://hanshack.com/"><img src="https://avatars.githubusercontent.com/u/8025164?v=4?s=64" width="64px;" alt="Hans Hack"/><br /><sub><b>Hans Hack</b></sub></a><br /><a href="https://github.com/technologiestiftung/organigramming-berlin/commits?author=hanshack" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## Credits

<table>
  <tr>
    <td>
      <a href="https://odis-berlin.de">
        <br />
        <br />
        <img width="200" src="https://logos.citylab-berlin.org/logo-odis-berlin-black.svg" />
      </a>
    </td>
    <td>
      Together with: <a href="https://citylab-berlin.org/en/start/">
        <br />
        <br />
        <img width="200" src="https://logos.citylab-berlin.org/logo-citylab-berlin.svg" />
      </a>
    </td>
    <td>
      A project by: <a href="https://www.technologiestiftung-berlin.de/en/">
        <br />
        <br />
        <img width="150" src="https://logos.citylab-berlin.org/logo-technologiestiftung-berlin-en.svg" />
      </a>
    </td>
     <td>
      Supported by <a href="https://www.berlin.de/rbmskzl/">
        <br />
        <br />
        <img width="80" src="https://logos.citylab-berlin.org/logo-berlin-senatskanzelei-de.svg" />
      </a>
    </td>
  </tr>
</table>
