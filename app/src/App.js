import "./global.scss";
import { Container } from "react-bootstrap";
import React, { useState, useRef } from "react";
import useUndo from "use-undo";

import Chart from "./components/Chart/Chart";
import Sidebar from "./components/Sidebar/Sidebar";
import initDocument from "./data/initDocument";
import { toSnakeCase } from "./services/service";

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
  const [selected, setSelected] = useState(null);
  const [update, setUpdate] = useState(false);
  const [
    dataState,
    {
      set: setData,
      // reset: resetData,
      undo: setUndo,
      redo: setRedo,
      canUndo,
      canRedo,
    },
  ] = useUndo(initdata());
  const { present: data } = dataState;

  const onChange = (e) => {
    const dataSting = JSON.stringify(e);
    setData(JSON.parse(dataSting));
    setUpdate(!update);
    localStorage.setItem("data", JSON.stringify(e));
  };

  const handleKeyDown = (e) => {
    let charCode = String.fromCharCode(e.which).toLowerCase();
    if ((e.ctrlKey || e.metaKey) && charCode === "z") {
      if (e.shiftKey) {
        onRedo();
      } else {
        onUndo();
      }
    }
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

  const exportTo = (fileextension, includeLogo = true, vectorPdf = true) => {
    const fileName = data.export.filename || toSnakeCase(data.document.title);
    chart.current.exportTo(fileName, fileextension, includeLogo, vectorPdf);
  };

  const onUndo = () => {
    setUndo();
    setUpdate(!update);
  };

  const onRedo = () => {
    setRedo();
    setUpdate(!update);
  };

  return (
    <div className="App" onKeyDown={handleKeyDown}>
      <Container className="control-layer" fluid>
        <Sidebar
          data={data}
          sendDataUp={onChange}
          selected={selected}
          setSelected={(e) => setSelected(e)}
          onExport={exportTo}
          onSave={onSave}
          onUndo={onUndo}
          onRedo={onRedo}
          enableUndo={canUndo}
          enableRedo={canRedo}
        />
      </Container>
      <Chart
        ref={chart}
        className="chart-layer"
        data={data}
        update={update}
        sendDataUp={onChange}
        setSelected={(e) => {
          setSelected(e);
        }}
      />
    </div>
  );
};

export default App;
