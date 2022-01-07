import definitions from "../../schemas/definitions.json";
import Form from "@rjsf/bootstrap-4";
import React, { useState } from "react";
import FileSelect from "../From/FileSelect";

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
    const base64String = "data:"+type+";name="+fileName+";base64,"+ btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    images.push({
      filename: fileName,
      extension: extension,
      base64String: base64String,
    });
  });
  return images;
};

const preuploads = importAll(
  require.context("../../assets/logos/", false, /\.(png|jpe?g|svg)$/)
);

const DocumentTab = ({ data, sendDataUp }) => {
  const [formData, setFormData] = useState({ ...data });

  const properties = {
    properties: {
      document: {
        $ref: "#/definitions/document",
      },
    },
  };

  const schema = { ...definitions, ...properties };

  const uiSchema = {
    "ui:title": " ",
    "ui:description": " ",
    document: {
      note: {
        "ui:widget": "textarea",
      },
      logo: {
        "ui:widget": FileSelect,
        preuploads: preuploads,
      },
      schemaVersion: {
        "ui:widget": "hidden",
      },
      pageOrientation: {
        "ui:widget": "radio",
        "ui:options": {
          inline: true,
        },
      },
    },
  };

  const onBlur = () => {
    sendDataUp(formData);
  };
  const onChange = (e) => {
    setFormData(e.formData);
    console.log(e);
  };

  return (
    <div className="tab">
      <h1>Organigramm</h1>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        onChange={onChange}
        onBlur={onBlur}
        liveValidate
        showErrorList={false}
      >
        <br />
      </Form>
    </div>
  );
};

export default DocumentTab;
