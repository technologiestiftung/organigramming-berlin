import definitions from "../../schemas/organization_chart";
import React, { useState, useEffect, useRef } from "react";
import { Button, Stack } from "react-bootstrap";
import Form from "@rjsf/bootstrap-4";
import JSONDigger from "../../services/jsonDigger";
import { v4 as uuidv4 } from "uuid";
import { DragDropContext } from "react-beautiful-dnd";

import AlertModal from "./AlertModal";

import ArrayFieldTemplate from "../From/ArrayFieldTemplate";
import ObjectFieldTemplate from "../From/ObjectFieldTemplate";
import CollapsibleField from "../From/CollapsibleField";
import { isDefiend } from "../../services/service";

// const findObject = (obj, id) => findObjectAux([obj], id);
// const findObjectAux = (arr, id) => {
//   for (const obj of arr) {
//     if (obj.id === id) return obj;
//     const nestedObj = findObjectAux(obj.organisations, id);
//     if (nestedObj) return nestedObj;
//   }
// }

// const loop = (arr, target, index, path) => {
//   if (arr[index].id === target) {
//     path.push(arr[index]);
//   } else if (arr[index].organisations.length) {
//     path.push(arr[index]);
//     arr[index].organisations.forEach((_, i, a) => {
//       loop(a, target, i, path);
//     });

//     if (path[path.length - 1].id === arr[index].id) path.pop();
//   }
// };

// let getPath = (arr, target) => {
//   let path = [];
//   arr.forEach((_, i, a) => loop(a, target, i, path));
//   return path;
// };

const OrganisationTab = ({ data, sendDataUp, selected, setSelected }) => {
  const [formData, setFormData] = useState({ current: selected });
  const [idPrefix, setIdPrefix] = useState("root");
  const [removeNodeAlertModalShow, setRemoveNodeAlertModalShow] =
    useState(false);
  const dsDigger = new JSONDigger(data, "id", "organisations");
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
  };

  const schema = { ...definitions, ...properties };
  const uiSchema = {
    "ui:headless": true,
    current: {
      "ui:headless": true,
      id: {
        "ui:widget": "hidden",
      },
      relationship: {
        "ui:widget": "hidden",
      },
      employees: {
        "ui:headless": true,
        items: {
          "ui:field": "CollapsibleField",
          collapse: {
            field: "ObjectField",
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
      address: {
        "ui:headless": true,
        "ui:field": "CollapsibleField",
        collapse: {
          field: "ObjectField",
        },
      },
      style: {
        title: "Stil",
      },
      organisations: {
        "ui:headless": true,
        "ui:widget": "hidden",
      },
      departments: {
        items: {
          "ui:headless": true,
          employees: {
            "ui:headless": true,
            items: {
              "ui:field": "CollapsibleField",
              collapse: {
                field: "ObjectField",
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
    setFormData({ ...e.formData });
    handleSendDataUp({ ...e.formData.current });
  };

  const onBlur = async () => {
    // handleSendDataUp(formData.current);
  };

  const getNewNode = () => {
    return { type: "", name: "Organisation", id: "n" + uuidv4() };
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

  const getItemByPath = (obj, path) =>
    path.reduce((obj, item) => obj[item], obj);

  const deleteByPath = (obj, path) => {
    var last = path.pop();
    delete path.reduce((obj, item) => obj[item], obj)[last];
  };

  const createItemByPath = (obj, path, value) => {
    // If a value is given, remove the last name and keep it for later:
    var lastKey = path.pop();

    // Walk the hierarchy, creating new objects where needed.
    // If the lastKey was removed, then the last object is not set yet:
    for (var i = 0; i < path.length; i++) {
      obj = obj[path[i]] = obj[path[i]] || {};
    }

    // If a value was given, set it to the last name:
    if (lastKey) obj = obj[lastKey] = value;

    // Return the last object in the hierarchy:
    return obj;
  };

  const onDragEnd = async (e) => {
    if (!e.destination || e.destination.index === e.source.index) {
      return;
    }
    // no movement
    if (e.destination.index === e.source.index) {
      return;
    }
    const sourcePath = e.source.droppableId.split("_");
    const destinationPath = e.destination.droppableId.split("_");

    let sourceNode = await dsDigger.findNodeById(sourcePath[0]);
    sourcePath.shift();
    const sourceList = getItemByPath(sourceNode, sourcePath);

    const item = await JSON.parse(JSON.stringify(sourceList[e.source.index]));
    sourceList.splice(e.source.index, 1);

    createItemByPath(sourceNode, sourcePath, sourceList);

    await dsDigger.updateNode(sourceNode);

    let destinationNode = await dsDigger.findNodeById(destinationPath[0]);
    destinationPath.shift();

    let destinationList = getItemByPath(destinationNode, destinationPath);

    if (isDefiend(destinationList)) {
      destinationList.splice(e.destination.index, 0, item);
    } else {
      createItemByPath(destinationNode, destinationPath, [item]);
    }

    await dsDigger.updateNode(destinationNode);
    setFormData({ current: destinationNode });
    await sendDataUp({ ...dsDigger.ds });
  };

  return (
    <div className="tab">
      <AlertModal
        onOkay={removeNode}
        show={removeNodeAlertModalShow}
        onHide={() => setRemoveNodeAlertModalShow(false)}
        title="Organisation entfernen"
      >
        Soll die Informatinen dieser Organisation und deren Unterorganisationen
        entfert werden?
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
      <DragDropContext onDragEnd={onDragEnd}>
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
        >
          <br />
        </Form>
      </DragDropContext>
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
