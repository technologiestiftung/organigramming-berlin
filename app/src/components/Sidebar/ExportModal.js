import React, { useState, useEffect } from "react";
import { Button, Modal, Row, Col, Alert } from "react-bootstrap";
import definitions from "../../schemas/organization_chart";
import ObjectFieldTemplate from "../From/ObjectFieldTemplate";
import { toSnakeCase } from "../../services/service";

import Form from "@rjsf/bootstrap-4";

const ExportModal = (props) => {
  const [formData, setFormData] = useState({ ...props.data });
  const [showInfo, setShowInfo] = useState(false);
  const properties = {
    properties: {
      export: {
        $ref: "#/definitions/export",
      },
    },
  };

  useEffect(() => {
    if (
      formData.export.exportType === "pdf" &&
      formData.export.pdfType === "print" &&
      formData.export.saveExport === "export"
    ) {
      setShowInfo(true);
    } else {
      setShowInfo(false);
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
        {showInfo && (
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
      </Modal.Body>
      <Modal.Footer>
        <Button className="btn btn-danger" onClick={props.onHide}>
          Abbrechen
        </Button>
        <Button onClick={onExport}>
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
