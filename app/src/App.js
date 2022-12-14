import "./global.scss";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { DragDropContext } from "react-beautiful-dnd";
import { useMount, useSetState } from "react-use";
import { Container, Alert } from "react-bootstrap";
import React, { useState, useRef, useEffect } from "react";
import useUndo from "use-undo";
import { fromEvent } from "file-selector";

import AlertModal from "./components/Sidebar/AlertModal";
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
import { getJoyrideSettings } from "./lib/getJoyrideSettings";

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
  const [alertModalShow, setAlertModalShow] = useState(true);
  const [droppedData, setDroppedData] = useState();
  const [importError, setImportError] = useState(null);

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
    setState(getJoyrideSettings(controlLayer));
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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedFiles = await fromEvent(e);
    const reader = new FileReader();
    if (
      !draggedFiles[0] ||
      (draggedFiles[0].type && draggedFiles[0].type !== "application/json")
    ) {
      setImportError(["Keine valide JSON Datei"]);
      return;
    }
    reader.readAsText(draggedFiles[0]);
    reader.onload = () => {
      let result = reader.result;
      try {
        JSON.parse(result);
      } catch (e) {
        setImportError(["Keine valide JSON Datei"]);
        return;
      }
      result = JSON.parse(result);
      const [valid, errors] = validateData(result);
      if (!valid) {
        setImportError(errors);
        return;
      } else {
        setDroppedData(result);
      }
    };
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="App"
      onKeyDown={handleKeyDown}
      onDrop={(e) => handleDrop(e)}
      onDragOver={(e) => handleDragOver(e)}
      onDragEnter={(e) => handleDragEnter(e)}
      onDragLeave={(e) => handleDragLeave(e)}
    >
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

      {droppedData && (
        <AlertModal
          show={alertModalShow}
          onHide={() => {
            setAlertModalShow(false);
          }}
          saveButton={"Importieren"}
          onSave={() => {
            onChange(droppedData);
            setDroppedData(null);
          }}
          title="Dokument importieren"
        >
          Wenn Sie ein neues Dokument öffnen, gehen ungespeicherte Änderungen an
          ihrem aktuellen Dokument verloren.
        </AlertModal>
      )}
      {importError && (
        <AlertModal
          show={alertModalShow}
          onHide={() => {
            setAlertModalShow(false);
            setImportError(null);
          }}
          title="Import Fehlgeschlagen"
        >
          <Alert variant="danger">
            Beim öffnen der Datei ist ein Fehler aufgetreten:
            {importError.map((error, i) => (
              <pre key={"error-" + i} className="mt-2">
                {JSON.stringify(error, null, " ")}
              </pre>
            ))}
          </Alert>
        </AlertModal>
      )}

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
