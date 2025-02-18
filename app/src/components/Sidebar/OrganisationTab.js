import React, { useState, useEffect, useRef } from "react";
import { Button, Stack } from "react-bootstrap";
import Form from "@rjsf/bootstrap-4";
import { v4 as uuidv4 } from "uuid";
import AlertModal from "./AlertModal";
import getURI from "../../services/getURI";

import ArrayFieldTemplate from "../From/ArrayFieldTemplate";
import ObjectFieldTemplate from "../From/ObjectFieldTemplate";
import CollapsibleField from "../From/CollapsibleField";
import UriSearch from "../From/UriSearch";
import MainOrganisation from "../From/MainOrganisation";

import CustomDropdown from "../From/CustomDropdown";

import { checkErrors } from "../../services/checkErrors";

import { getDefinitions } from "../../services/getDefinitions";
const definitions = getDefinitions();

const OrganisationTab = ({ sendDataUp, selected, setSelected, dsDigger }) => {
  const [formData, setFormData] = useState({ current: selected });
  const [idPrefix, setIdPrefix] = useState("root");
  const [removeNodeAlertModalShow, setRemoveNodeAlertModalShow] =
    useState(false);
  // const dsDigger = new JSONDigger(data, "id", "organisations");
  const timerRef = useRef(null);

  const properties = {
    properties: {
      current: {
        $ref: "#/definitions/organisation",
      },
    },
  };

  const fields = {
    CollapsibleField: CollapsibleField,
    ArrayFieldTemplate: ArrayFieldTemplate,
    UriSearch: UriSearch,
    MainOrganisation: MainOrganisation,
    CustomDropdown: CustomDropdown,
  };

  const schema = { ...definitions, ...properties };
  const uiSchema = {
    "ui:headless": true,
    current: {
      "ui:headless": true,
      id: {
        "ui:widget": "hidden",
      },
      type: {
        "ui:placeholder": "Auswählen o. eingeben z.B. 'Abteilung'",
        "ui:field": CustomDropdown,
      },
      isMainOrganisation: {
        "ui:headless": true,
        "ui:field": "MainOrganisation",
        dsDigger: dsDigger,
        selected: selected,
      },
      relationship: {
        "ui:widget": "hidden",
      },
      positions: {
        "ui:headless": true,
        items: {
          "ui:field": "CollapsibleField",
          collapse: {
            field: "ObjectField",
          },
          uri: {
            "ui:headless": true,
            "ui:field": "UriSearch",
          },
          positionType: {
            "ui:placeholder": "z.B. Senator:in",
            "ui:field": CustomDropdown,
          },
          positionStatus: {
            "ui:placeholder": "z.B. kommisarisch",
            "ui:field": CustomDropdown,
          },
          person: {
            // "ui:headless": true,
            // add a title to the person field
            uri: {
              "ui:headless": true,
              "ui:field": "UriSearch",
            },
          },
        },
      },
      contact: {
        "ui:headless": true,
        "ui:field": "CollapsibleField",
        collapse: {
          field: "ObjectField",
        },
      },
      uri: {
        "ui:headless": true,
        "ui:field": "UriSearch",
      },
      address: {
        "ui:headless": true,
        "ui:field": "CollapsibleField",
        collapse: {
          field: "ObjectField",
        },
      },
      layout: {
        "ui:headless": true,
        "ui:field": "CollapsibleField",
        collapse: {
          field: "ObjectField",
        },
        style: {
          title: "Stil",
        },
        bgColor: {},
        bgStyle: {
          "ui:disabled": !formData.current.layout?.bgColor,
          "ui:widget": "radio",
          "ui:options": {
            inline: true,
          },
        },
      },
      organisations: {
        "ui:headless": true,
        "ui:widget": "hidden",
      },
      departments: {
        items: {
          "ui:headless": true,
          type: {
            "ui:placeholder": "z.B. Büro",
            "ui:field": CustomDropdown,
          },
          uri: {
            "ui:headless": true,
            "ui:field": "UriSearch",
          },
          positions: {
            "ui:headless": true,
            items: {
              "ui:field": "CollapsibleField",
              collapse: {
                field: "ObjectField",
              },
              positionType: {
                "ui:placeholder": "z.B. Referent:in",
                "ui:field": CustomDropdown,
              },
              positionStatus: {
                "ui:placeholder": "z.B. kommisarisch",
                "ui:field": CustomDropdown,
              },
              uri: {
                "ui:headless": true,
                "ui:field": "UriSearch",
              },
              person: {
                // "ui:headless": true,
                uri: {
                  "ui:headless": true,
                  "ui:field": "UriSearch",
                },
              },
            },
          },
        },
      },
      suborganizationOrientation: {
        "ui:widget": "radio",
        "ui:options": {
          inline: true,
        },
      },
    },
  };

  // function whenDataChanges(e) {
  //   console.log("ta1", e.formData.current.uri?.uri);

  //   if (e.formData.current.uri?.uri === "") {
  //     e.formData.current.uri = { uri: getURI("organisation") };
  //     console.log("da2", e.formData.current.uri);
  //   }
  // }

  useEffect(() => {
    if (selected != null) {
      setFormData({ current: { ...selected } });
      setIdPrefix(selected.id);
    } else {
      setIdPrefix("root");
    }
  }, [selected]);

  const handleSendDataUp = async (data) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await dsDigger.updateNode(data);
      sendDataUp(dsDigger.ds);
    }, 500);
  };

  const onChange = async (e) => {
    // fix: if there is no URI for an organisation
    if (e.formData.current.uri?.uri === "") {
      console.log("CALLLEDD");

      setTimeout(() => {
        e.formData.current.uri = { uri: getURI("organisation") };
        setFormData({ ...e.formData });
        handleSendDataUp({ ...e.formData.current });
        return;
      }, 700);
    }

    setFormData({ ...e.formData });
    handleSendDataUp({ ...e.formData.current });
  };

  const onBlur = async () => {
    // handleSendDataUp(formData.current);
  };

  const getNewNode = () => {
    return {
      type: "",
      name: "Organisation",
      id: "n" + uuidv4(),
      uri: { uri: getURI("organisation") },
    };
  };
  const addSiblingNode = async () => {
    const newNode = getNewNode();
    await dsDigger.addSiblings(selected.id, newNode);
    sendDataUp({ ...dsDigger.ds });
    setSelected(newNode);
  };

  const addChildNode = async () => {
    const newNode = getNewNode();
    await dsDigger.addChildren(selected.id, newNode);
    sendDataUp({ ...dsDigger.ds });
    setSelected(newNode);
  };

  const removeNode = async () => {
    await dsDigger.removeNodes(selected.id);
    sendDataUp({ ...dsDigger.ds });
    setSelected(null);
  };

  // Custom validation function
  const customValidate = (formData, errors) => {
    const validatorName = dsDigger?.ds?.settings?.validator;
    return checkErrors(formData, errors, validatorName, "organisation");
  };

  return (
    <div className="tab" id="organisation-tab">
      <AlertModal
        onOkay={removeNode}
        show={removeNodeAlertModalShow}
        onHide={() => setRemoveNodeAlertModalShow(false)}
        title="Organisation entfernen"
        continueButton="Ja, Organisation entfernen"
      >
        Sollen die Informationen dieser Organisation und deren
        Unterorganisationen entfernt werden?
      </AlertModal>
      <Stack direction="horizontal" gap={3}>
        <div>
          {selected && selected.kind && <h3>{selected.kind}</h3>}
          {selected && selected.name && <h2>{selected.name}</h2>}
        </div>
        <Button
          variant="outline-danger"
          className="ms-auto delete-organisation"
          onClick={() => setRemoveNodeAlertModalShow(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-trash"
            viewBox="0 0 16 16"
          >
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
            <path
              fillRule="evenodd"
              d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
            />
          </svg>
        </Button>
      </Stack>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        onChange={(e) => onChange(e)}
        onBlur={onBlur}
        fields={fields}
        idPrefix={idPrefix}
        ArrayFieldTemplate={ArrayFieldTemplate}
        ObjectFieldTemplate={ObjectFieldTemplate}
        liveValidate
        showErrorList={false}
        validate={customValidate}
      >
        <br />
      </Form>
      <Stack direction="horizontal" gap={3}>
        <Button variant="outline-success" onClick={addSiblingNode}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi me-1 bi-arrow-bar-right"
            viewBox="0 0 16 16"
          >
            <path
              fillRule="evenodd"
              d="M6 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.293 7.5H6.5A.5.5 0 0 0 6 8zm-2.5 7a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5z"
            />
          </svg>
          Neue Nebenorganisation
        </Button>
        <Button variant="outline-success" onClick={addChildNode}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi me-1 bi-arrow-bar-down"
            viewBox="0 0 16 16"
          >
            <path
              fillRule="evenodd"
              d="M1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zM8 6a.5.5 0 0 1 .5.5v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 .708-.708L7.5 12.293V6.5A.5.5 0 0 1 8 6z"
            />
          </svg>
          Neue Suborganisation
        </Button>
      </Stack>
    </div>
  );
};
export default OrganisationTab;
