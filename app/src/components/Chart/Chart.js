import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Button } from "react-bootstrap";
import OrganizationChart from "./ChartContainer";
import JSONDigger from "json-digger";
import { v4 as uuidv4 } from "uuid";

const Chart = forwardRef(({ data, update, sendDataUp, setSelected }, ref) => {
  const orgchart = useRef();

  useImperativeHandle(ref, (exportFileextension) => ({
    exportTo: (exportFileextension) => {
      orgchart.current.exportTo(
        ds.document.title || "organization_chart",
        exportFileextension
      );
    },
  }));


  // const [filename, setFilename] = useState("organization_chart");
  // const [fileextension, setFileextension] = useState("png");

  // const onNameChangeFilename = (event) => {
  //   setFilename(event.target.value);
  // };

  // const onExtensionChange = event => {
  //   setFileextension(event.target.value);
  // };

  const [ds, setDS] = useState(data);
  // const dsDigger = new JSONDigger(ds, "id", "children");
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  // const [newNodeName, setNewNodeName] = useState("");
  // const [newNodeTitle, setNewNodeTitle] = useState("");
  // const [isEditMode, setIsEditMode] = useState(true);
  const [isMultipleSelect, setIsMultipleSelect] = useState(false);
  const [contextMenuStyle, setContextMenuStyle] = useState("");
  const [clipBoard, setClipBoard] = useState({});

  let dsDigger = new JSONDigger(data, "id", "organisations");


  useEffect(() => {
    setDS({...data});
    console.log("Chart", ds);
  }, [data, update]);

  const readSelectedNode = (nodeData) => {
    if (isMultipleSelect) {
      setSelectedNodes((prev) => new Set(prev.add(nodeData)));
    } else {
      setSelectedNodes(new Set([nodeData]));
      setSelected(nodeData);
      setSelectedNode(nodeData);
    }
  };

  const clearSelectedNode = () => {
    setSelectedNodes(new Set());
    setSelected(null);
    setSelectedNode(null);
  };

  const onChanged = (e) => {
    // setDS(e);
    console.log("Chart-> Send Data UP")
    sendDataUp(e);
  };

  const onMultipleSelectChange = (e) => {
    setIsMultipleSelect(e.target.checked);
  };

  const onCloseContextMenu = () => {
    setContextMenuStyle({});
  };

  const onContextMenu = (e) => {
    setContextMenuStyle({
      display: "block",
      position: "fixed",
      top: e.clientY,
      left: e.clientX,
    });
  };



  const getNewNode = () => {
    return { type: "Neue", name: "Organisation", id: "n" + uuidv4() };
  };

  const addSiblingNode = async () => {
    const newNode = getNewNode();
    await dsDigger.addSiblings(selectedNode.id, newNode);
    sendDataUp({ ...dsDigger.ds });
    onCloseContextMenu();
  };

  const addChildNode = async () => {
    const newNode = getNewNode();
    await dsDigger.addChildren(selectedNode.id, newNode);
    sendDataUp({ ...dsDigger.ds });
    onCloseContextMenu();
  };

  const removeNode = async () => {
    await dsDigger.removeNodes(selectedNode.id);
    sendDataUp({ ...dsDigger.ds });
    onCloseContextMenu();
  };
  const copyNode = () => {
    let copyNode = { ...selectedNode };
    setClipBoard(copyNode);
    onCloseContextMenu();
  };

  const cutNode = async () => {
    let copyNode = { ...selectedNode, id: "n" + uuidv4() };
    await dsDigger.removeNodes(selectedNode.id);
    setClipBoard(copyNode);
    setSelected(null);
    onCloseContextMenu();
  };

  const assignNewIds = (node) => {
    const _node = { ...node, id: "n" + uuidv4() };
    console.log("assignNewIds", node);
    if (node.organisations) {
      _node.organisations = node.organisations.map((child) => {
        return assignNewIds(child);
      });
      console.log("assignNewIds", _node.organisations);
    }
    return _node;
  };

  const paseNode = async () => {
    const _clipBoard = assignNewIds(clipBoard);
    await dsDigger.addChildren(selectedNode.id, _clipBoard);
    sendDataUp({ ...dsDigger.ds });
    onCloseContextMenu();
  };

  const handleKeyDown = (e) => {
    console.log(e);
    // e.preDefault();
    let charCode = String.fromCharCode(e.which).toLowerCase();
    if ((e.ctrlKey || e.metaKey) && charCode === "s") {
      alert("CTRL+S Pressed");
    } else if ((e.ctrlKey || e.metaKey) && charCode === "c") {
      alert("CTRL+C Pressed");
    } else if ((e.ctrlKey || e.metaKey) && charCode === "v") {
      alert("CTRL+V Pressed");
    }
  };

  return (
    <div tabIndex="0" onCopy={copyNode} onPaste={paseNode} onCut={cutNode}>
      <OrganizationChart
        tabIndex="0"
        ref={orgchart}
        data={ds}
        update={update}
        collapsible={false}
        multipleSelect={isMultipleSelect}
        onClickNode={readSelectedNode}
        onClickChart={clearSelectedNode}
        sendDataUp={onChanged}
        onContextMenu={onContextMenu}
        onCloseContextMenu={onCloseContextMenu}
        pan={true}
        zoom={true}
        draggable={true}
        contentEditable={true}
      />
      {contextMenuStyle && (
        <ul className="dropdown-menu" style={contextMenuStyle}>
          <li>
            <Button
              onClick={() => {
                copyNode();
              }}
              className="dropdown-item"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi me-1 bi-clipboard"
                viewBox="0 0 16 16"
              >
                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
              </svg>{" "}
              Kopieren
            </Button>
          </li>
          <li>
            <Button
              onClick={() => {
                cutNode();
              }}
              className="dropdown-item"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi me-1 bi-scissors"
                viewBox="0 0 16 16"
              >
                <path d="M3.5 3.5c-.614-.884-.074-1.962.858-2.5L8 7.226 11.642 1c.932.538 1.472 1.616.858 2.5L8.81 8.61l1.556 2.661a2.5 2.5 0 1 1-.794.637L8 9.73l-1.572 2.177a2.5 2.5 0 1 1-.794-.637L7.19 8.61 3.5 3.5zm2.5 10a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0zm7 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z" />
              </svg>{" "}
              Ausschneiden
            </Button>
          </li>
          {clipBoard && (
            <li>
              <Button
                onClick={() => {
                  paseNode();
                }}
                className="dropdown-item"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi me-1 bi-clipboard-plus"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 7a.5.5 0 0 1 .5.5V9H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V10H6a.5.5 0 0 1 0-1h1.5V7.5A.5.5 0 0 1 8 7z"
                  />
                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
                  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
                </svg>{" "}
                Einfühgen
              </Button>
            </li>
          )}
          <li>
            <hr className="dropdown-divider" />
          </li>
          <li>
            <Button
              onClick={() => {
                addChildNode();
              }}
              className="dropdown-item"
            >
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
              </svg>{" "}
              Neue Unterorganisation
            </Button>
          </li>

          <li>
            <Button
              onClick={() => {
                addSiblingNode();
              }}
              className="dropdown-item"
            >
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
              </svg>{" "}
              Neue Nebenorganisation
            </Button>
          </li>
          <li>
            <hr className="dropdown-divider" />
          </li>
          <li>
            <Button
              onClick={() => {
                removeNode();
              }}
              className="dropdown-item"
              variant="danger"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi me-1 bi-trash"
                viewBox="0 0 16 20"
              >
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                <path
                  fillRule="evenodd"
                  d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                />
              </svg>{" "}
              Entfernen
            </Button>
          </li>
        </ul>
      )}
    </div>
  );
});

export default Chart;
