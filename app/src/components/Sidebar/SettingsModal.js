import React, { useState, useEffect, useRef } from "react";
import { Button, Modal, Row, Col } from "react-bootstrap";
import ObjectFieldTemplate from "../From/ObjectFieldTemplate";

import Form from "@rjsf/bootstrap-4";
import { getDefinitions } from "../../services/getDefinitions";
const definitions = getDefinitions();

const SettingsModal = (props) => {
  const [formData, setFormData] = useState({ ...props.data });
  const [initialFormData, setInitialFormData] = useState({});
  const hasMounted = useRef(false);

  const properties = {
    properties: {
      settings: {
        $ref: "#/definitions/settings",
      },
    },
  };

  useEffect(() => {
    if (!hasMounted.current) {
      // This block will only run once
      setInitialFormData({ ...props.data });
      hasMounted.current = true;
    }
  }, [props.data]); // Adding props.data to satisfy the linter

  const schema = { ...definitions, ...properties };

  const uiSchema = {
    "ui:headless": true,
    settings: {
      "ui:headless": true,
    },
  };

  const onBlur = () => {
    props.sendDataUp(formData);
  };

  const onChange = (e) => {
    setFormData(e.formData);
  };

  const resetSetting = () => {
    props.sendDataUp(initialFormData);
  };

  return (
    <Modal {...props} size="lg" aria-labelledby="contained-modal-title-vcenter">
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          Einstellungen
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
            <p>
              Hier können Sie einen Validierung aussuchen. Die Validierung
              checkt ob z.B. Telefonummern im richtigen Format eingegeben
              werden. Bei einer flaschen Eingabe wird eine Warnhinweis
              angezeigt.
            </p>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button
          className="btn btn-danger"
          onClick={() => {
            resetSetting();
            props.onHide();
          }}
        >
          Abbrechen
        </Button>
        <Button
          onClick={() => {
            props.onHide();
          }}
        >
          Übernehmen
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SettingsModal;
