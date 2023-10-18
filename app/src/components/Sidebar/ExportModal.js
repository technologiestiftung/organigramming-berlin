import React, { useState, useEffect } from "react";
import { Button, Modal, Row, Col, Alert } from "react-bootstrap";
import definitions from "../../schemas/organization_chart";
import ObjectFieldTemplate from "../From/ObjectFieldTemplate";
import { toSnakeCase } from "../../services/service";
import checkForDuplicatePersons from "../../services/checkForDuplicatePersons";

import Form from "@rjsf/bootstrap-4";

const ExportModal = (props) => {
  const [formData, setFormData] = useState({ ...props.data });
  const [showPDFInfo, setShowPDFInfo] = useState(false);
  const [showRDFInfo, setShowRDFInfo] = useState(false);
  const [warningMultiMainOrgs, setWarningMultiMainOrgs] = useState(false);
  const [duplicatePersons, setDuplicatePersons] = useState([]);

  const properties = {
    properties: {
      export: {
        $ref: "#/definitions/export",
      },
    },
  };

  useEffect(() => {
    // check if there are more than one main org
    if (formData?.organisations) {
      let mainCounter = 0;
      formData.organisations.forEach((org) => {
        if (org.isMainOrganisation) {
          mainCounter++;
        }
      });
      if (mainCounter > 1) {
        setWarningMultiMainOrgs(true);
      }
    }

    const personsDuplicates = checkForDuplicatePersons(formData);
    setDuplicatePersons(personsDuplicates);

    if (
      formData.export.exportType === "pdf" &&
      formData.export.pdfType === "print" &&
      formData.export.saveExport === "export"
    ) {
      setShowPDFInfo(true);
    } else {
      setShowPDFInfo(false);
    }
    if (
      formData.export.exportType === "rdf" &&
      formData.export.saveExport === "export"
    ) {
      setShowRDFInfo(true);
    } else {
      setShowRDFInfo(false);
    }
    if (!formData.export) {
      setFormData({
        ...formData,
        export: { ...formData.export, saveExport: "save" },
      });
    }
    if (!formData.export || !formData.export.filename) {
      setFormData({
        ...formData,
        export: {
          ...formData.export,
          filename: toSnakeCase(
            formData.document.title + ("_" + formData.document.version || "")
          ),
        },
      });
    }
  }, [formData]);

  const schema = { ...definitions, ...properties };

  const uiSchema = {
    "ui:headless": true,
    export: {
      "ui:headless": true,
      saveExport: {
        title:
          "Möchten Sie das Dokument speichern oder als Bild oder Dokument expotieren?",
        "ui:widget": "radio",
      },
    },
  };

  const onExport = () => {
    onBlur();
    console.log("formData", formData);
    if (formData.export.saveExport === "save") {
      props.onSave(true);
    } else {
      switch (formData.export.exportType) {
        case "svg":
          props.onExport("svg", formData.export.includeLogo);
          break;
        case "png":
          props.onExport("png", formData.export.includeLogo);
          break;
        case "rdf":
          props.onExport("rdf", false, false, formData.export.rdfType);
          break;
        case "json":
          props.onSave(formData.export.includeLogo);
          break;
        default:
          if (formData.export.pdfType === "print") {
            document.title = formData.export.filename;
            setTimeout(() => {
              window.print();
            }, 500);
          } else {
            props.onExport(
              "pdf",
              formData.export.includeLogo,
              formData.export.pdfType
            );
          }
          break;
      }
    }
    props.onHide();
  };

  const onBlur = () => {
    props.sendDataUp(formData);
  };

  const onChange = (e) => {
    setFormData(e.formData);
  };

  return (
    <Modal {...props} size="lg" aria-labelledby="contained-modal-title-vcenter">
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          Dokument speichern oder exportieren
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col className="mb-3">
            <Form
              schema={schema}
              uiSchema={uiSchema}
              formData={formData}
              ObjectFieldTemplate={ObjectFieldTemplate}
              onChange={onChange}
              onBlur={onBlur}
              liveValidate
              showErrorList={false}
            >
              {" "}
            </Form>
          </Col>
        </Row>
        {showPDFInfo && (
          <Row>
            <Col className="mb-3">
              <Alert variant="success">
                <p>
                  Dies Funktion erzeugt die besten Ergebnisse in{" "}
                  <b>Chrome-basierten Browsern</b> (Chrome, Edge, etc.). Bitte
                  nehmen Sie folgende Einstellungen im Druckmenu vor:
                  <ol>
                    <li>
                      Ziel: <b>Als PDF speichern</b>
                    </li>
                    <li>
                      Ausrichtung:{" "}
                      <b>
                        {formData.document.paperOrientation === "landscape"
                          ? "Querformat"
                          : "Hochformat"}
                      </b>
                    </li>
                    <li>
                      Weitere Einstellungen:
                      <ol>
                        <li>
                          Papierformat: <b>{formData.document.paperSize}</b>
                        </li>
                        <li>
                          Kopf- und Fußzeile: <b>Aus</b>
                        </li>
                        <li>
                          Hintergrundgrafiken: <b>Ein</b>
                        </li>
                      </ol>
                    </li>
                  </ol>
                </p>
              </Alert>
            </Col>
          </Row>
        )}
        {showRDFInfo && (
          <Row>
            <Col className="mb-3">
              <Alert variant="success">
                <p>
                  Diese Funktion erlaubt es die Daten in verschiedenen
                  RDF-Formaten zu exportieren.{" "}
                </p>
              </Alert>
              {warningMultiMainOrgs && (
                <Alert variant="danger">
                  <p>
                    Sie haben mehrer Organisationen als Hauptorganisation
                    ausgewählt. Bitte wählen Sie nur <b>eine Organisation</b>{" "}
                    als Hauptorganisation aus.
                  </p>
                </Alert>
              )}

              {duplicatePersons && (
                <Alert variant="warning">
                  Achtung. Folgende Personen-Einträge haben den gleichen Namen
                  aber unterschiedliche URIs. Bitte passen sie die URIs
                  gegebenfalls an.
                  <br /> <br />
                  <ul>
                    {Object.keys(duplicatePersons).map((name) => (
                      <li key={name}>
                        <b>{name}</b> erscheint {duplicatePersons[name].counter}{" "}
                        mal mit verschiedenen URIs in folgenden Organisationen
                        <br />
                        <ul>
                          {duplicatePersons[name].orgNames.map((aName, i) => (
                            <li>
                              {/* style={"paddingLeft":"10px"} */}
                              <span key={"span" + aName}>{aName}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Col>
          </Row>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button className="btn btn-danger" onClick={props.onHide}>
          Abbrechen
        </Button>
        <Button
          onClick={onExport}
          disabled={showRDFInfo && warningMultiMainOrgs}
        >
          {formData &&
          formData.export &&
          formData.export.saveExport === "export"
            ? "Exportieren"
            : "Speichern"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ExportModal;
