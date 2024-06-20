import React, { useState, useEffect, useRef } from "react";
import { Button, Modal, Row, Col } from "react-bootstrap";
import ObjectFieldTemplate from "../From/ObjectFieldTemplate";

import { validationRules } from "../../validation/validationRules";

import Form from "@rjsf/bootstrap-4";
import { getDefinitions } from "../../services/getDefinitions";
const definitions = getDefinitions();

const SettingsModal = (props) => {
  const [formData, setFormData] = useState({ ...props.data });
  const [warningMessages, setWarningMessages] = useState([]);

  const [initialFormData, setInitialFormData] = useState({});
  const hasMounted = useRef(false);

  function getErrorMsg(d) {
    const validator = d.settings.validator;
    let rules = validationRules[validator];
    let warningMessages = [];
    for (const key in rules) {
      warningMessages.push(rules[key].warning);
    }
    return warningMessages;
  }
  const properties = {
    properties: {
      settings: {
        $ref: "#/definitions/settings",
      },
    },
  };

  useEffect(() => {
    const warningMessages = getErrorMsg(props.data);
    setWarningMessages(warningMessages);

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
    const warningMessages = getErrorMsg(e.formData);
    setWarningMessages(warningMessages);

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
              Hier können Sie eine Validierung auswählen. Die Validierung
              überprüft, ob z.B. Telefonnummern im richtigen Format eingegeben
              werden. Bei einer falschen Eingabe wird eine Warnmeldung
              angezeigt.
            </p>
            {warningMessages.length !== 0 && (
              <>
                <p>Es gelten folgende Regeln:</p>
                <ul>
                  {warningMessages &&
                    warningMessages.map((errorMsg, i) => (
                      <li key={"warningkey-" + i}>{errorMsg}</li>
                    ))}
                </ul>
              </>
            )}
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
