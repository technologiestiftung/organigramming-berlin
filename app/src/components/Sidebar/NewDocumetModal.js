import React, { useState } from "react";
import { Button, Modal, Row, Col, Form, Alert } from "react-bootstrap";
import emptyDocument from "../../data/emptyDocument";

import AlertModal from "./AlertModal";
import { validateData } from "../../services/service";
import { upgradeDataStructure } from "../../services/upgradeDataStructure";

const NewDocumetModal = (props) => {
  const [alertModalShow, setAlertModalShow] = useState(false);
  const [hideModal, setHideModal] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importData, setImportData] = useState(null);

  const onCreateNew = () => {
    setHideModal(true);
    setAlertModalShow(true);
    const newInitDocument = upgradeDataStructure(emptyDocument);
    setImportData(newInitDocument);
  };

  const templateSelected = (e) => {
    const fileToLoad = e.target?.value;
    if (!fileToLoad) return;
    setHideModal(true);
    setAlertModalShow(true);

    const fetchData = async (fileToLoad) => {
      try {
        const response = await fetch(`data/templates/${fileToLoad}.json`); // Fetch the JSON file from the public directory
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const jsonData = await response.json();
        const newInitDocument = upgradeDataStructure(jsonData);
        setImportData(newInitDocument);
      } catch (error) {
        console.error("Error fetching the JSON data:", error);
      }
    };

    fetchData(fileToLoad);
  };

  const onFileImportChange = (e) => {
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      let data = JSON.parse(text);
      data = upgradeDataStructure(data);
      const [valid, errors] = validateData(data);
      if (!valid) {
        setImportError(errors);
      } else {
        setImportError(null);
        setImportData(data);
        setAlertModalShow(true);
      }
    };
    reader.readAsText(e.target.files[0]);
  };

  return (
    <>
      <AlertModal
        onOkay={() => {
          props.sendDataUp(importData);
          setAlertModalShow(false);
          props.onHide();
        }}
        show={alertModalShow}
        onHide={() => {
          setHideModal(false);
          setAlertModalShow(false);
        }}
        onSave={props.openExport}
        title="Aktuelles Dokument verwerfen"
      >
        Wenn Sie ein neues Dokument öffnen, gehen ungespeicherte Änderungen an
        ihrem aktuellen Dokument verloren. Wollen Sie das aktuelle Dokument
        speichern?
      </AlertModal>
      {!hideModal && (
        <Modal
          {...props}
          size="lg"
          aria-labelledby="contained-modal-title-vcenter"
        >
          <Modal.Header closeButton>
            <Modal.Title id="contained-modal-title-vcenter">
              Neues Dokument
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col className="mb-3">
                <Button onClick={onCreateNew}>Neues Dokument erstellen</Button>
              </Col>
            </Row>
            <Row>
              <Col className="mb-3">
                <Form.Group controlId="formFile" className="mb-3">
                  <Form.Label>Template laden</Form.Label>
                  <Form.Select
                    aria-label="Default select example"
                    onChange={(e) => templateSelected(e)}
                  >
                    <option>Wählen Sie ein Template aus der Liste aus</option>
                    <option value="berSen">Berliner Senatsverwaltung</option>
                    <option value="berBez">Berliner Bezirk</option>
                    <option value="beispielOrg">Beispiel Organisation</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Group controlId="formFile" className="mb-3">
                  <Form.Label>
                    Bestehendes Dokument öffnen oder Datei auf die Anwendung
                    ziehen
                  </Form.Label>
                  <Form.Control
                    onChange={(e) => onFileImportChange(e)}
                    type="file"
                    accept=".json"
                  />
                </Form.Group>
                {importError && (
                  <Alert variant="danger">
                    Beim öffnen der Datei ist ein Fehler aufgetreten:
                    {importError.map((error) => (
                      <pre className="mt-2">
                        {JSON.stringify(error, null, " ")};
                      </pre>
                    ))}
                  </Alert>
                )}
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={props.onHide}>Abbrechen</Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export default NewDocumetModal;
