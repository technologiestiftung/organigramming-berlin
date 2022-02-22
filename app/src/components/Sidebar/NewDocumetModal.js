import React, { useState } from "react";
import { Button, Modal, Row, Col, Form, Alert } from "react-bootstrap";
import initDocument from "../../data/initDocument";
import AlertModal from "./AlertModal";
import definitions from "../../schemas/organization_chart";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const NewDocumetModal = (props) => {
  const [alertModalShow, setAlertModalShow] = useState(false);
  const [hideModal, setHideModal] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importData, setImportData] = useState(null);

  const onCreateNew = () => {
    setHideModal(true);
    setAlertModalShow(true);
    setImportData(initDocument)
  };

  const onFileImpotChange = (e) => {
    const ajv = new Ajv();
    
    //add custom formats to validate against
    addFormats(ajv);
    ajv.addFormat(
      "data-url",
      /^data:([a-z]+\/[a-z0-9-+.]+)?;(?:name=(.*);)?base64,(.*)$/
    );
    ajv.addFormat("integer", /([0-9])/);
    ajv.addFormat(
      "color",
      /^(#?([0-9A-Fa-f]{3}){1,2}\b|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow|(rgb\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|(rgb\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\)))$/
    );
    ajv.addVocabulary(["version", "enumNames"])

    const validate = ajv.compile(definitions);
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const data = JSON.parse(text);
      const valid = validate(data);
      if (!valid) {
        setImportError(validate.errors);
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
        onHide={() => {setHideModal(false); setAlertModalShow(false)}}
        onSave={props.openExport}
        title="Aktuelles Dokument verwerfen"
      >
        Wenn Sie ein neues Dokument öffnen, gehen ungespeicherte Änderungen an ihrem aktuellen Dokument verloren. Wollen Sie das aktuelle Dokument speichern?
      </AlertModal>
      {!hideModal && <Modal
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
            <Col>
              <Form.Group controlId="formFile" className="mb-3">
                <Form.Label>Bestehendes Dokument öffnen</Form.Label>
                <Form.Control
                  onChange={(e) => onFileImpotChange(e)}
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
      </Modal>}
    </>
  );
};

export default NewDocumetModal;
