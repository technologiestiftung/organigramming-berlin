import react, { useState } from "react";
// import { Accordion } from "react-bootstrap";
import { Collapse, Button } from "react-bootstrap";

const CollapsibleField = (_ref) => {
  var title = _ref.schema.title ? _ref.schema.title : "";
  const uiSchema = _ref.uiSchema,
    fields = _ref.registry.fields,
    name = _ref.name;
  const field = uiSchema.collapse.field;
  const CollapseElement = fields[field];
  let _props = { ..._ref };

  title = uiSchema["ui:title"] ? uiSchema["ui:title"] : title ? title : name;

  //For employee object
  if (
    _ref.formData?.title ||
    _ref.formData?.firstName ||
    _ref.formData?.lastName
  ) {
    const contact = _ref.formData;
    let personName = [];
    if (contact.title) {
      personName.push(contact.title);
    }
    if (contact.firstName) {
      personName.push(contact.firstName);
    }
    if (contact.lastName) {
      personName.push(contact.lastName);
    }
    title = personName.join(" ");
  }
  //For employee object
  if (_ref.formData?.name) {
    title = _ref.formData.name;
  }

  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button
        variant="link"
        className="ps-0"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={title + "-collapse"}
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-chevron-up me-1"
            viewBox="0 0 16 16"
          >
            <path
              fillRule="evenodd"
              d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-chevron-down me-1"
            viewBox="0 0 16 16"
          >
            <path
              fillRule="evenodd"
              d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
            />
          </svg>
        )}
        {title}
      </Button>
      <Collapse in={open}>
        <div>{react.createElement(CollapseElement, _props)}</div>
      </Collapse>
    </div>
  );
};

export default CollapsibleField;
