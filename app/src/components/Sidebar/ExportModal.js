import React, { useState, useEffect } from "react";
import { Button, Modal, Row, Col } from "react-bootstrap";
import definitions from "../../schemas/organization_chart";
import ObjectFieldTemplate from "../From/ObjectFieldTemplate";
import { toSnakeCase } from "../../services/service";

import Form from "@rjsf/bootstrap-4";

const ExportModal = (props) => {
  const [formData, setFormData] = useState({ ...props.data });
  const properties = {
    properties: {
      export: {
        $ref: "#/definitions/export",
      },
    },
  };

  useEffect(() => {
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
          props.onExport(
            "pdf",
            formData.export.includeLogo,
            formData.export.pdfType === "svg"
          );
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
