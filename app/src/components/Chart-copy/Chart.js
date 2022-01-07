import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import OrganizationChart from "./ChartContainer";
import JSONDigger from "json-digger";
import { v4 as uuidv4 } from "uuid";



const Chart = forwardRef( ( { data, setData, setSelected }, ref ) => {
  
  const orgchart = useRef();

  useImperativeHandle(ref, (exportFileextension) => ({
    exportTo: (exportFileextension) => {
      orgchart.current.exportTo(
        ds.document.title || "organization_chart",
        exportFileextension
      );
    },
  }));

  useEffect(() => {
    setDS(data);
    console.log("Chart", data);
  }, [data]);

  const [filename, setFilename] = useState("organization_chart");
  // const [fileextension, setFileextension] = useState("png");

  const onNameChangeFilename = (event) => {
    setFilename(event.target.value);
  };

  // const onExtensionChange = event => {
  //   setFileextension(event.target.value);
  // };

  const [ds, setDS] = useState(data);
  const dsDigger = new JSONDigger(ds, "id", "children");
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [isEditMode, setIsEditMode] = useState(true);
  const [isMultipleSelect, setIsMultipleSelect] = useState(false);

  const readSelectedNode = (nodeData) => {
    if (isMultipleSelect) {
      setSelectedNodes((prev) => new Set(prev.add(nodeData)));
    } else {
      setSelectedNodes(new Set([nodeData]));
      setSelected(nodeData);
    }
  };

  const clearSelectedNode = () => {
    setSelectedNodes(new Set());
    setSelected(null);
  };

  const updateNodes = async () => {
    await dsDigger.updateNodes(
      [...selectedNodes].map((node) => node.id),
      { id: uuidv4(), name: newNodeName, title: newNodeTitle }
    );
    setDS({ ...dsDigger.ds });
  };

  const onChanged = (e) => {
    setDS(e);
    setData(e);
  };

  const onMultipleSelectChange = (e) => {
    setIsMultipleSelect(e.target.checked);
  };

  const onModeChange = (e) => {
    setIsEditMode(e.target.checked);
    if (e.target.checked) {
      orgchart.current.expandAllNodes();
    }
  };

  return (
    <>
      <OrganizationChart
        ref={orgchart}
        data={ds}
        collapsible={false}
        multipleSelect={isMultipleSelect}
        onClickNode={readSelectedNode}
        onClickChart={clearSelectedNode}
        onChanged={onChanged}
        pan={true}
        zoom={true}
        draggable={true}
      />
    </>
  );
});

export default Chart;
