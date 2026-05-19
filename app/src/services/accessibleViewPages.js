// Helpers that render simple accessible HTML pages directly in the
// current window. Used when the app is opened with
// `format=html-accessible` to show loading and error states before
// (or instead of) the full accessible organigram view.

const BASE_STYLE = `
  body {
    font-family: Arial, sans-serif;
    line-height: 1.4;
    margin: 2rem;
    color: #111;
  }
  h1 {
    font-size: 1.8rem;
    margin-bottom: .5rem;
  }
  p {
    font-size: 1.1rem;
  }
  ul {
    margin-left: 1.2rem;
  }
  a {
    color: #0b57d0;
    text-decoration: underline;
  }
`;

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const writeToCurrentWindow = (html, title) => {
  document.open();
  document.write(html);
  document.close();
  document.title = title;
};

export const renderAccessibleLoading = () => {
  const title = "Organigramm wird geladen";
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${BASE_STYLE}</style>
</head>
<body>
  <main aria-busy="true" aria-live="polite">
    <h1>${escapeHtml(title)}</h1>
    <p>Die barrierearme Ansicht des Organigramms wird vorbereitet. Bitte einen Moment Geduld.</p>
  </main>
</body>
</html>`;

  writeToCurrentWindow(html, title);
};

export const renderAccessibleError = (errors = []) => {
  const title = "Organigramm konnte nicht geladen werden";
  const errorList = Array.isArray(errors) ? errors : [errors];
  const itemsHtml = errorList
    .filter(Boolean)
    .map((err) => {
      if (err && typeof err === "object") {
        return `<li>${escapeHtml(err.message || JSON.stringify(err))}</li>`;
      }
      return `<li>${escapeHtml(err)}</li>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${BASE_STYLE}</style>
</head>
<body>
  <main aria-live="assertive">
    <h1>${escapeHtml(title)}</h1>
    <p>Beim Laden der barrierearmen Ansicht ist ein Fehler aufgetreten:</p>
    ${itemsHtml ? `<ul>${itemsHtml}</ul>` : ""}
    <p>Bitte überprüfen Sie den in der URL angegebenen Parameter <code>dataurl</code>.</p>
  </main>
</body>
</html>`;

  writeToCurrentWindow(html, title);
};
