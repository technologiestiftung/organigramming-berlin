![](https://img.shields.io/badge/Built%20with%20%E2%9D%A4%EF%B8%8F-at%20Technologiestiftung%20Berlin-blue)

# Organigramm-Tool

**Notice: This application and the documentation is still a work in progress.**

## A simple organisation chart application for public service of Berlin

This repository contains an app for creating and editing administrative organization charts in machine-readable json format and as a graphical representation in pdf format. The online tool was developed with the aim to provide a simple yet sufficient tool to create organisational charts to export human as well as machine readable files.

Until now, the organization charts of Berlin's administrative units are created with Excel or PowerPoint and published in pdf format. On the one hand, their graphical format makes them easy for people to read. On the other hand, this means that they cannot be read by machines or code, or can only be read inadequately. However, the organigrams contain a lot of valuable information and a machine-readable preparation could enable various uses and applications. 
The json file format allows the data entered to be stored in a simple text format and made available as Open Data. The organizational chart tool also aims to simplify the creation of organizational charts for the Berlin administration and to bring the organizational charts into a more uniform format.

More information and the protoype is accessible through the [ODIS website](https://odis-berlin.de/projekte/organigramme/) (only in German).

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


## Changelog (added, fixed, changed)

- 12.03.2022 - Added: simple changelog
- 12.03.2022 - Fixed: [Use overflow-wrap: break-word for organisation units](https://github.com/technologiestiftung/organigramming-berlin/pull/41)
- 12.03.2022 - Added: [Added metadata to the export file about the tool](https://github.com/technologiestiftung/organigramming-berlin/pull/37)

## Acknowledgement

This project relies on the projects of Dabeng's [react-orgchart](https://github.com/dabeng/react-orgchart) and therefore on its precursor, Wesnolte's [jOrgChart](https://github.com/wesnolte/jOrgChart).

The icons used in this app came from [icons.getbootstrap.com/](https://icons.getbootstrap.com/).

The included files of Berlin's coats of arms came from [https://de.wikipedia.org/wiki/Liste_der_Wappen_in_Berlin](https://de.wikipedia.org/wiki/Liste_der_Wappen_in_Berlin).

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

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
        <img width="200" src="https://logos.citylab-berlin.org/logo-odis-berlin.svg" />
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
      Supported by: <a href="https://www.berlin.de/sen/inneres/">
        <br />
        <br />
        <img width="100" src="https://logos.citylab-berlin.org/logo-berlin-seninnds-en.svg" />
      </a>
    </td>
  </tr>
</table>
