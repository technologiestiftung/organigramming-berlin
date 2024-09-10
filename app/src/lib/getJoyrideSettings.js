export const getJoyrideSettings = (controlLayer) => {
  return {
    run: false,
    steps: [
      {
        content:
          "Hier können Sie ein neues Dokument anlegen oder ein vorhandenes Organigramm (JSON-Datei) hochladen.",
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        placement: "bottom",
        spotlightPadding: 0,
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        target: controlLayer.current.newDocRef,
        title: "Neues Dokument",
      },
      {
        content:
          "Anschließend können Sie hier die Dokumenteinstellungen wie zum Beispiel Orientierung, Logo oder Papierformat anpassen.",
        placement: "bottom",
        spotlightPadding: 0,
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        target: controlLayer.current.docInfoRef,
        title: "Dokumentinformationen und -einstellungen",
      },
      {
        content:
          "Tragen Sie über diese Maske den Namen Ihrer Behörde als Dokumenttitel ein. Des Weiteren lässt sich die Ausrichtung des Dokuments (Hochformat oder Querformat) und die Ausgabegröße einstellen. In den Dokumentinformationen können Sie ebenfalls ein Logo einbinden. Bisher sind aus Lizenzgründen nur die Logos der Bezirksverwaltungen auswählbar. Sie können aber ganz einfach selbst eine Bilddatei mit einem Logo hochladen. Neben Datum und Name des Verfassers oder der Verfasserin kann hier auch die Fußzeile bearbeitet werden.",
        placement: "right",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        spotlightPadding: 0,
        target: ".sidebar",
        title: "Dokumentinformationen bearbeiten",
      },
      {
        content:
          "Jede Box stellt eine sogenannte Organisationseinheit dar. Um die Informationen in der Box zu bearbeiten, wählen Sie diese per Mausklick aus.",
        placement: "right",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        target: "#n3",
        title: "Bearbeiten einer Organisationseinheit",
      },
      {
        content:
          "Über diese Maske können Sie den Inhalt der Box anpassen. Tragen Sie den Namen (Bezeichnung) der Organisationseinheit ein. Falls Nebenorganisationen auf derselben Ebene generiert werden, muss eine Organisationseinheit als Hauptorganisation festgelegt werden. Sie können Anschrift und Kontaktinformationen der Einheit eintragen, sowie Personen und zugehörige Organisationseinheiten.",
        placement: "right",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        spotlightPadding: 0,
        target: ".sidebar",
        title: "Organisationseinheit bearbeiten",
      },
      {
        content:
          "Im Bereich ‚Verknüpfungen (URIs)‘ wird einer Organisationseinheit eine Art Identifikationsnummer zugeordnet. Falls für dieselbe Organisationseinheit bereits eine weitere Identifikationsnummer vergeben wurde, z.B. über die Gemeinsame Normdatei oder Wikidata, kann der Link manuell eingefügt werden, oder über die Suche aufgerufen werden.",
        placement: "right",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        spotlightPadding: 10,
        target: "[aria-controls='Verknüpfungen (URIs)-collapse']",
        title: "Verknüpfungen herstellen (optional)",
      },
      {
        placement: "right",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        spotlightPadding: 50,
        target: "button.add-array-item",
        title: "Eine Person zur Organisationseinheit hinzufügen",
        content:
          "Wenn Sie eine neue Person hinzufügen möchten, klicken Sie auf das kleine Plus-Symbol in der Personen-Leiste.",
      },
      {
        placement: "right",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        target: ".expand-item",
        title: "Personeninformationen bearbeiten",
        content:
          "Um Daten zu einer Person einzutragen, wie Anrede, Name und Kontaktdaten, öffnen Sie das Dropdown-Menü durch einen Klick auf die Person. Unter 'Verknüpfungen' kann Wikidata nach Einträgen durchsucht und bei Bedarf die URI angepasst werden ",
      },
      {
        content:
          "Sie können die einzelnen Elemente und auch die ganze Organisationseinheit wieder aus dem Organigramm entfernen. Über das Mülleimer-Icon löschen Sie die ausgewählte Organisationeinheit und alle ihr untergeordneten Organisationen.",
        placement: "right",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        spotlightPadding: 50,
        target: ".delete-organisation",
        title: "Organisationseinheit entfernen",
      },
      {
        content:
          "Sie können eine Organisationseinheit mit der Maus per 'Drag-and-drop' umsortieren, indem Sie die Organisationseinheit auf eine grün eingefärbte Organisationseinheit ziehen.",
        placement: "left",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        target: ".chart",
        title: "Organisationseinheiten umsortieren",
      },
      {
        content: (
          <p>
            Mit einem Rechtsklick können Sie das Kontextmenü öffnen.
            Organisationen können auch mit der <code>strg</code> +<code>c</code>{" "}
            kopiert und mit <code>strg</code> + <code>v</code> eingefügt werden.
          </p>
        ),
        placement: "left",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        target: ".chart",
        title: "Kontextmenü",
      },
      {
        content:
          "Mithilfe der Pfeile oben rechts können Sie Schritte rückgängig machen bzw. wiederholen.",
        placement: "bottom",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        target: ".undo-redo-group",
        title: "Undo Redo",
      },
      {
        content:
          "Unten rechts können Sie heran- und herauszoomen, sowie die Ansicht auf das ganze Dokument aktivieren. Alternativ können Sie dafür auch das Scrollrad der Maus benutzen.",
        placement: "right",
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        target: ".navigation-container",
        title: "Navigations Menu",
      },
      {
        content:
          "Sie können ein fertiges Organigramm als PDF, als Bilddatei, als maschinenlesbare JSON-Datei, oder im Linked Open Data Format RDF exportieren. Die JSON-Datei können Sie später nutzen, um das Organigramm wieder einzuladen und daran weiterzuarbeiten.",
        disableBeacon: true,
        spotlightClicks: false,
        disableOverlayClose: true,
        placement: "bottom",
        spotlightPadding: 0,
        styles: {
          options: {
            zIndex: 10000,
          },
        },
        target: ".export-toolbar-item",
        title: "Fertiges Organigramm exportieren",
      },
    ],
  };
};
