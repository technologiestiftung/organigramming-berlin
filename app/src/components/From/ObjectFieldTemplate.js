import React from "react";
import { Container, Row, Col } from "react-bootstrap";

const ObjectFieldTemplate = (_ref) => {
  var DescriptionField = _ref.DescriptionField,
    description = _ref.description,
    TitleField = _ref.TitleField,
    title = _ref.title,
    properties = _ref.properties,
    required = _ref.required,
    uiSchema = _ref.uiSchema,
    idSchema = _ref.idSchema;
  return React.createElement(
    React.Fragment,
    null,
    (uiSchema["ui:title"] || title) &&
      !uiSchema["ui:headless"] &&
      React.createElement(TitleField, {
        id: idSchema.$id + "-title",
        title: title,
        required: required,
      }),
    description &&
      !uiSchema["ui:headless"] &&
      React.createElement(DescriptionField, {
        id: idSchema.$id + "-description",
        description: description,
      }),
    React.createElement(
      Container,
      {
        fluid: true,
        className: "p-0",
      },
      properties.map(function (element, index) {
        return React.createElement(
          Row,
          {
            key: index,
            style: {
              marginBottom: "10px",
            },
            className: element.hidden ? "d-none" : undefined,
          },
          React.createElement(
            Col,
            {
              xs: 12,
            },
            " ",
            element.content
          )
        );
      })
    )
  );
};

export default ObjectFieldTemplate;
