import "./global.scss";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { DragDropContext } from "react-beautiful-dnd";
import { useMount, useSetState } from "react-use";
import { Container } from "react-bootstrap";
import React, { useState, useRef, useEffect } from "react";
import useUndo from "use-undo";

import Chart from "./components/Chart/Chart";
import Sidebar from "./components/Sidebar/Sidebar";
import initDocument from "./data/initDocument";
import {
  toSnakeCase,
  handleDropEnd,
  isDefiend,
  validateData,
} from "./services/service";
import JSONDigger from "./services/jsonDigger";

const initdata = () => {
  if (localStorage.getItem("data") !== null) {
    try {
      return JSON.parse(localStorage.getItem("data"));
    } catch (error) {
      localStorage.setItem("data", "");
      return initDocument;
    }
  } else {
    return initDocument;
  }
};

const App = () => {
  const chart = useRef();
  const controlLayer = useRef();
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(initdata());
  const [tempData, setTempData] = useState();
  const dsDigger = new JSONDigger(data, "id", "organisations");

  const [{ run, stepIndex, steps }, setState] = useSetState({
    run: false,
    stepIndex: 0,
    steps: [],
  });

  const [
    dataState,
    {
      set: setUndoData,
      // reset: resetData,
      undo: setUndo,
      redo: setRedo,
      canUndo,
      canRedo,
    },
  ] = useUndo(initdata());
  const { present: undoData } = dataState;

  useEffect(() => {
    setData(undoData);
  }, [undoData]);

  const onChange = async (e) => {
    if (isDefiend(e)) {
      const [valid, errors] = validateData(e);
      if (valid) {
        const dataSting = JSON.stringify(e);
        setUndoData(JSON.parse(dataSting));
        localStorage.setItem("data", JSON.stringify(e));
      } else {
        console.error(errors);
      }
    }
  };

  const handleKeyDown = (e) => {
    let charCode = String.fromCharCode(e.which).toLowerCase();
    if ((e.ctrlKey || e.metaKey) && charCode === "z") {
      if (e.shiftKey) {
        setRedo();
      } else {
        setUndo();
      }
    }
  };

  const handleJoyrideStart = () => {
    setTempData({ ...data });
    setData(initDocument);
    setState({ run: true, stepIndex: 0 });
  };

  const onSave = async (includeLogo = true) => {
    const fileName = data.export.filename || toSnakeCase(data.document.title);
    const exportData = includeLogo
      ? { ...data }
      : { ...data, document: { ...data.document, logo: "" } };
    const json = JSON.stringify(exportData);
    const blob = new Blob([json], { type: "application/json" });
    const href = await URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTo = (fileextension, includeLogo = true, pdfType = "") => {
    const fileName = data.export.filename || toSnakeCase(data.document.title);
    chart.current.exportTo(fileName, fileextension, includeLogo, pdfType);
  };

  useMount(() => {
    setState({
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
            "Über diese Maske können Sie den Inhalt der Box anpassen. Tragen Sie den Namen (Bezeichnung) der Organisationseinheit ein. Sie können auch eine Anschrift und Kontaktinformationen der Einheit eintragen. Zu einer Organisationseinheit können außerdem Personen und zugehörige Organisationseinheiten gehören.",
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
            "Um Daten zu einer Person einzutragen, wie Anrede, Name und Kontaktdaten, öffnen Sie das Dropdown-Menü durch einen Klick auf die Person.",
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
              Organisationen können auch mit der <code>strg</code> +
              <code>c</code> kopiert und mit <code>strg</code> + <code>v</code>{" "}
              eingefügt werden.
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
            "Sie können ein fertiges Organigramm als PDF, als Bilddatei oder als maschinenlesbare JSON-Datei exportieren. Die JSON-Datei können Sie später nutzen, um das Organigramm wieder einzuladen und daran weiterzuarbeiten.",
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
    });
  });

  const handleJoyrideCallback = (jRData) => {
    const { action, index, status, type } = jRData;

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      // Update state to advance the tour
      const stepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setState({ stepIndex: stepIndex });
      chart.current.orgchart.demoDragMode(false);
      chart.current.demoContexMenu(false, "n3");
      chart.current.resetViewHandler();
      console.log(controlLayer.current);
      setSelected(null);
      if (stepIndex === 2) {
        setSelected("document");
      } else if (stepIndex > 3 && stepIndex < 8) {
        setSelected(data.organisations[0]);
        if (stepIndex === 7) {
          // const tab = controlLayer.current;
          // document.getElementById("organisation-tab").scrollTo(0, 0);
          const element = document.getElementById("organisation-tab");
          element.scrollIntoView({
            block: "center",
          });
        }
      } else if (stepIndex === 8) {
        chart.current.orgchart.demoDragMode(true, "n6");
      } else if (stepIndex === 9) {
        chart.current.demoContexMenu(true, "n3");
      }
    } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Need to set our running state to false, so we can restart if we click start again.
      setData({ ...tempData });
      setState({ run: false });
      setSelected(null);
      chart.current.demoContexMenu(false, "n3");
      chart.current.orgchart.demoDragMode(false);
    }
  };

  const onDragEnd = async (e) => {
    if (e.type !== "organisation") {
      let _data = await handleDropEnd(e, dsDigger);
      onChange(_data);
      setSelected(await dsDigger.findNodeById(selected.id));
    }
  };

  return (
    <div className="App" onKeyDown={handleKeyDown}>
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        run={run}
        scrollToFirstStep
        showProgress
        showSkipButton
        stepIndex={stepIndex}
        steps={steps}
        locale={{
          back: "Zurück",
          close: "Verlassen",
          last: "Ende",
          next: "Weiter",
          skip: "Tour verlassen",
        }}
        styles={{
          options: { primaryColor: "#132458" },
          tooltip: {
            borderRadius: ".2rem",
          },
          tooltipContainer: {
            textAlign: "left",
          },
          tooltipTitle: {
            margin: 0,
          },
          tooltipContent: {
            padding: "1rem 0",
          },
          buttonNext: {
            borderRadius: ".2rem",
            color: "#fff",
          },
          buttonBack: {
            marginRight: ".2rem",
          },
        }}
      />
      <DragDropContext onDragEnd={onDragEnd}>
        <Container className="control-layer" fluid>
          <Sidebar
            data={data}
            dsDigger={dsDigger}
            sendDataUp={onChange}
            selected={selected}
            setSelected={(e) => setSelected(e)}
            onExport={exportTo}
            onSave={onSave}
            onUndo={setUndo}
            onRedo={setRedo}
            enableUndo={canUndo}
            enableRedo={canRedo}
            onJoyrideStart={handleJoyrideStart}
            ref={controlLayer}
          />
        </Container>
        <Chart
          ref={chart}
          className="chart-layer"
          data={data}
          sendDataUp={onChange}
          setSelected={(e) => {
            setSelected(e);
          }}
        />
      </DragDropContext>
    </div>
  );
};

export default App;
