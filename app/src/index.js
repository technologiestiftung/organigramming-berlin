import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { getDataURL } from './services/getDataURL';
import { getExternalData } from './services/getExternalData';
import { exportAccessibleHTML } from './services/exportAccessibleHTML';
import {
  renderAccessibleLoading,
  renderAccessibleError,
} from './services/accessibleViewPages';

const params = getDataURL();
const isAccessibleHtmlMode = params.format === 'html-accessible';

if (isAccessibleHtmlMode) {
  // Accessible HTML view is tied to the dataurl parameter. The
  // interactive app is not intended for users that rely on the
  // accessible view, so we replace the page content with a static
  // accessible document (or an accessible error/loading view) and
  // never mount the React app.
  if (params.error) {
    renderAccessibleError(params.error);
  } else if (!params.url) {
    renderAccessibleError([
      "Für die barrierearme Ansicht muss zusätzlich der Parameter \"dataurl\" mit einer gültigen JSON-URL angegeben werden.",
    ]);
  } else {
    renderAccessibleLoading();

    getExternalData(params.url)
      .then(({ error, data }) => {
        if (error) {
          renderAccessibleError(error);
          return;
        }

        const exportFilename =
          (data && data.document && data.document.title) || 'Organigramm';

        exportAccessibleHTML(data, exportFilename, {
          replaceCurrentWindow: true,
        }).catch((err) => {
          renderAccessibleError([
            'Beim Erstellen der barrierearmen Ansicht ist ein Fehler aufgetreten.',
            err && err.message ? err.message : err,
          ]);
        });
      })
      .catch((err) => {
        renderAccessibleError([
          'Die Daten konnten nicht geladen werden.',
          err && err.message ? err.message : err,
        ]);
      });
  }
} else {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
