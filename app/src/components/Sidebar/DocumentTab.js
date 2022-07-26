import definitions from "../../schemas/organization_chart";
import Form from "@rjsf/bootstrap-4";
import React, { useState, useRef } from "react";
import FileSelect from "../From/FileSelect";
import ObjectFieldTemplate from "../From/ObjectFieldTemplate";
import MDEditorWidget from "../From/MDEditor";

const importAll = (r) => {
  let images = [];
  r.keys().map((item) => {
    const arrayBuffer = new Uint8Array(r(item)),
      fileName = item.replace("./", ""),
      extension = fileName.split(".").pop();
    let type;
    switch (extension) {
      case "svg":
        type = "image/svg+xml";
        break;
      default:
        type = "image/jpeg";
        break;
    }
    const base64String =
      "data:" +
      type +
      ";name=" +
      fileName +
      ";base64," +
      btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

    images.push({
      filename: fileName,
      extension: extension,
      base64String: base64String,
    });

    return item;
  });
  return images;
};

const preuploads = importAll(
  require.context("../../assets/logos/", false, /\.(png|jpe?g|svg)$/)
);

const DocumentTab = ({ data, sendDataUp }) => {
  const [formData, setFormData] = useState({ ...data });
  
  const timerRef = useRef(null);


  const properties = {
    properties: {
      document: {
        $ref: "#/definitions/document",
      },
    },
  };

  const schema = { ...definitions, ...properties };

  const uiSchema = {
    "ui:headless": true,
    document: {
      "ui:headless": true,
      note: {
        title: "Fußzeile",
        "ui:widget": MDEditorWidget,
      },
      logo: {
        "ui:widget": FileSelect,
        preuploads: preuploads,
      },
      schemaVersion: {
        "ui:widget": "hidden",
      },
      paperOrientation: {
        "ui:widget": "radio",
        "ui:options": {
          inline: true,
        },
      },
    },
  };

  const handleSendDataUp = (data) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      sendDataUp(data);
    }, 200);
  };

  const onChange = async (e) => {
    setFormData({ ...e.formData });
    handleSendDataUp({ ...e.formData });
  };

  // const onBlur = () => {
  //   sendDataUp(formData);
  // };
  // const onChange = (e) => {
  //   setFormData(e.formData);
  // };

  return (
    <div className="tab">
      <h2>Dokument</h2>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        ObjectFieldTemplate={ObjectFieldTemplate}
        onChange={onChange}
        // onBlur={onBlur}
        liveValidate
        showErrorList={false}
      >
        <br />
      </Form>
    </div>
  );
};

export default DocumentTab;
