//inspiert by https://github.com/TreeHacks/root/blob/9f21f350416493e1f90fed5102330f4c8f8f1d0c/src/FormPage/FormPage.tsx%23L27-L52
import FileWidget from "react-jsonschema-form/lib/components/widgets/FileWidget";
import SelectWidget from "react-jsonschema-form/lib/components/widgets/SelectWidget";

import React, { useState, useEffect } from "react";

const FilePreview = (props) => {
  if (!props.value) {
    return <div>No file uploaded.</div>;
  }
  return (
    <div>
      <img
        src={props.value}
        style={Object.assign(
          {
            maxHeight: "10rem",
            width: "auto",
            maxWidth: "100%",
            marginBottom: "1rem",
          },
          props.style
        )}
      ></img>
    </div>
  );
};

const FilePreviewWidget = (props) => {
  const [selected, setSelected] = useState(props.value);
  const [file, setFile] = useState(props.value || undefined);

  const enumOptions = [
    { label: "Datei hochlanden", value: "upload" },
    ...props.uiSchema.preuploads.map((e) => {
      return {
        label: e.filename,
        value: e.filename,
      };
    }),
  ];


  useEffect(() => {
    if (props.value) {
      const splitted = props.value.split(","), // Split params
        params = splitted[0].split(";"), // Get mime-type from params
        properties = params.filter(function (param) {
          return param.split("=")[0] === "name";
        }); // Look for the name and use unknown if no name property.

      var name;

      if (properties.length !== 1) {
        name = "unknown";
      } else {
        // Because we filtered out the other property,
        // we only have the name case here.
        name = properties[0].split("=")[1];
      } // Built the Uint8Array Blob parameter from the base64 string.
      setSelected(name);
    }
  }, []);

  const onSelect = (e) => {
    console.log(e);
    if (e !== "upload") {
      const _file = props.uiSchema.preuploads.find((s) => s.filename === e),
        base64String = _file.base64String;

      setSelected(e);
      setFile(base64String);

      props.onChange(base64String);
      setTimeout(() => {
        props.onBlur();
      }, 100);
    } else {
      setSelected("");
    }
    console.log("onSelect", selected);
  };

  return (
    <>
      {props.value && <FilePreview key="preview" {...props} />}
      {props.uiSchema.preuploads && (
        <SelectWidget
          {...props}
          options={{ enumOptions: enumOptions }}
          id={props.id + "-select"} 
          schema={{
            ...props.schema,
            default:"none",
          }}
          placeholder="Auswählen"
          onChange={(e) => onSelect(e)}
          multiple={false}
          value={selected}
        />
      )}
      {!selected && (
        <FileWidget
          key="file"
          {...props}
          value={file}
          onChange={(v) => {
            props.onChange(v);
            setTimeout(() => {
              props.onBlur();
            }, 100);
            // }
          }}
        />
      )}
    </>
  );
};

export default FilePreviewWidget;
