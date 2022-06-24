import { Row, Navbar, Nav, ButtonGroup, Button } from "react-bootstrap";
import React, { useState, useEffect } from "react";

import initDocument from "../../data/initDocument";
import DocumentTab from "./DocumentTab";
import NewDocumentModal from "./NewDocumetModal";
import OrganisationTab from "./OrganisationTab";
import ExportModal from "./ExportModal";
import InfoModal from "./InfoModal";
import Split from "react-split";

const Sidebar = ({
  data,
  sendDataUp,
  selected,
  setSelected,
  onExport,
  onSave,
  onUndo,
  onRedo,
  enableUndo,
  enableRedo,
}) => {
  const [activeTap, setActiveTap] = useState(null);
  const [newDocumentModalShow, setNewDocumentModalShow] = useState(false);
  const [exportModalShow, setExportModalShow] = useState(false);
  const [infoModalShow, setInfoModalShow] = useState(false);

  const onChange = (e) => {
    sendDataUp(e);
  };

  useEffect(() => {
    setInfoModalShow(data === initDocument);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected === "document") {
      setActiveTap("document");
    } else if (selected != null && selected.id) {
      setActiveTap("organisation");
    } else {
      setActiveTap(null);
    }
  }, [selected]);

  return (
    <>
      {newDocumentModalShow && (
        <NewDocumentModal
          show={newDocumentModalShow}
          onHide={() => setNewDocumentModalShow(false)}
          openExport={() => {
            setExportModalShow(true);
          }}
          sendDataUp={onChange}
        />
      )}
      {exportModalShow && (
        <ExportModal
          show={exportModalShow}
          data={data}
          sendDataUp={onChange}
          onExport={onExport}
          onSave={onSave}
          onHide={() => setExportModalShow(false)}
        />
      )}
      {infoModalShow && (
        <InfoModal
          show={infoModalShow}
          onHide={() => setInfoModalShow(false)}
        />
      )}
      <Row>
        <Navbar bg="transperent" expand="lg">
          <Nav className="me-auto">
            <ButtonGroup aria-label="Toolbar">
              <Button
                variant="light"
                className={newDocumentModalShow ? "active" : ""}
                onClick={() => {
                  setActiveTap(null);
                  setNewDocumentModalShow(true);
                }}
                title="Neues Dokument erstellen oder öffnen"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-file-earmark-plus"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 6.5a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 .5-.5z" />
                  <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
                </svg>
              </Button>
              <Button
                variant="light"
                className={activeTap === "document" ? "active" : ""}
                onClick={() => setActiveTap("document")}
                title="Dokumentinformationen"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-file-earmark-code"
                  viewBox="0 0 16 16"
                >
                  <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
                  <path d="M8.646 6.646a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L10.293 9 8.646 7.354a.5.5 0 0 1 0-.708zm-1.292 0a.5.5 0 0 0-.708 0l-2 2a.5.5 0 0 0 0 .708l2 2a.5.5 0 0 0 .708-.708L5.707 9l1.647-1.646a.5.5 0 0 0 0-.708z" />
                </svg>
              </Button>
              {activeTap === "organisation" && (
                <Button
                  variant="light"
                  className={activeTap === "organisation" ? "active" : ""}
                  onClick={() =>
                    selected != null ? setActiveTap("organisation") : undefined
                  }
                  disabled={selected === null ? true : false}
                  title="Organisationsinformationen"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="bi bi-layers"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8.235 1.559a.5.5 0 0 0-.47 0l-7.5 4a.5.5 0 0 0 0 .882L3.188 8 .264 9.559a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882L12.813 8l2.922-1.559a.5.5 0 0 0 0-.882l-7.5-4zm3.515 7.008L14.438 10 8 13.433 1.562 10 4.25 8.567l3.515 1.874a.5.5 0 0 0 .47 0l3.515-1.874zM8 9.433 1.562 6 8 2.567 14.438 6 8 9.433z" />
                  </svg>
                </Button>
              )}
              <Button
                variant="light"
                className={exportModalShow ? "active" : ""}
                onClick={() => {
                  setActiveTap(null);
                  setExportModalShow(true);
                }}
                title="Dokument speichern oder exportieren"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-download"
                  viewBox="0 0 16 16"
                >
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                </svg>
              </Button>
              <Button
                variant="light"
                className={infoModalShow ? "active" : ""}
                onClick={() => {
                  setActiveTap(null);
                  setInfoModalShow(true);
                }}
                title="Info und Anleitung"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-download"
                  viewBox="0 0 16 16"
                >
                  <path d="M8.91,11.75c0,.42.39.63,1.22.63v.79H5.79v-.79q1.2,0,1.2-.63V7.49c0-.43-.4-.64-1.2-.64v-.8H8.91Zm.17-8a1.17,1.17,0,0,1-.34.84,1.13,1.13,0,0,1-.85.36,1,1,0,0,1-.47-.1A1.22,1.22,0,0,1,7,4.54a1.34,1.34,0,0,1-.26-.38,1.18,1.18,0,0,1-.09-.46A1.12,1.12,0,0,1,7,2.85a1.18,1.18,0,0,1,.85-.34,1.11,1.11,0,0,1,.84.35A1.15,1.15,0,0,1,9.08,3.7Z" />
                </svg>
              </Button>
            </ButtonGroup>
          </Nav>
          <Nav>
            <ButtonGroup className="undo-redo-group">
              <Button
                onClick={onUndo}
                disabled={!enableUndo}
                title="Änderung rückgängig machen"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi me-1 bi-undo"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M8.7,11.5c-1.4,0.2-2.9-0.2-4.1-1l-1.1,1.1c0,0-0.1,0.1-0.2,0.1c-0.1,0-0.3-0.1-0.3-0.2l-0.4-3V8.4c0-0.1,0.1-0.2,0.3-0.2
        l3.1,0.2c0.1,0,0.1,0,0.2,0.1c0.1,0.1,0.1,0.3,0,0.4l-0.9,1c2.3,1.5,5.4,0.8,6.9-1.6c0.6-1,0.9-2.1,0.7-3.2c0-0.3,0.1-0.5,0.4-0.6
        c0.3,0,0.5,0.1,0.6,0.4c0,0,0,0,0,0C14.3,8.1,12,11.1,8.7,11.5z"
                  />
                </svg>
              </Button>
              <Button
                onClick={onRedo}
                disabled={!enableRedo}
                title="Änderung wiederherstellen"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi me-1 bi-redo"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M13.2,7.6c0,0.1-0.1,0.3-0.2,0.3h0L9.9,7.7c-0.1,0-0.2-0.1-0.2-0.3c0-0.1,0-0.1,0.1-0.2l0.9-1
		C8.6,5,6,5.3,4.4,7c-1.1,1.1-1.5,2.6-1.3,4c0,0.3-0.1,0.5-0.4,0.6c-0.3,0-0.5-0.1-0.6-0.4c0,0,0,0,0,0C1.7,7.9,4,4.9,7.3,4.5
		c1.4-0.2,2.9,0.2,4.1,1l1.1-1.1c0.1-0.1,0.2-0.1,0.4,0c0,0,0.1,0.1,0.1,0.1L13.2,7.6z"
                  />
                </svg>
              </Button>
            </ButtonGroup>
          </Nav>
        </Navbar>
      </Row>
      <Split
        sizes={[40, 60]}
        minSize={200}
        snapOffset={30}
        dragInterval={1}
        gutterAlign="center"
        cursor="col-resize"
        className={"split-container" + (activeTap !== null ? " open" : "")}
      >
        <div className="sidebar">
          {activeTap === "document" && (
            <DocumentTab data={data} sendDataUp={onChange} />
          )}
          {activeTap === "organisation" && (
            <OrganisationTab
              data={data}
              sendDataUp={onChange}
              selected={selected}
              setSelected={(e) => setSelected(e)}
            />
          )}
        </div>
        <div
          style={{
            pointerEvents: activeTap === "organisation" ? "none" : "all",
          }}
          onClick={() => {
            activeTap !== null && setActiveTap(null);
          }}
        ></div>
      </Split>
    </>
  );
};

export default Sidebar;
