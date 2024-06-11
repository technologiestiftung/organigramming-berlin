import React, { useState, useEffect, useRef } from "react";
import { Form, Button, Collapse } from "react-bootstrap";
import { Typeahead, TypeaheadInputMulti } from "react-bootstrap-typeahead";
import { useDebounce } from "use-debounce";
import "react-bootstrap-typeahead/css/Typeahead.css";

const UriSearch = (props) => {
  const { value, formData, onChange, schema } = props;
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState(value);
  const [debouncedInputValue] = useDebounce(inputValue, 700);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editURI, setEditURI] = useState(false);

  const ref = useRef();
  const url =
    "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&errorformat=plaintext&language=de&origin=*&uselang=de&type=item&search=";
  const labelKey = "label";
  const valueKey = "url";

  useEffect(() => {
    if (debouncedInputValue) {
      // the input value includes http -> take this as the URI
      if (debouncedInputValue.includes("http")) {
        setOptions([
          {
            label: debouncedInputValue,
            description: "selbstdefinierte URI",
            id: "id",
            url: debouncedInputValue,
          },
        ]);
      } else {
        setIsLoading(true);

        fetch(url + debouncedInputValue)
          .then((response) => response.json())
          .then((data) => {
            setIsLoading(false);
            const opts = data.search.map((d) => {
              return {
                label: d.label,
                description: d.description,
                id: d.id,
                url: d.concepturi,
              };
            });
            setOptions(opts);
          });
      }
    }
  }, [debouncedInputValue]);

  function unlink() {
    const data = {
      uri: formData.uri,
      uriSameAs: "",
      uriSameAsLabel: "",
      uriSameAsDescription: "",
    };
    onChange(data);
    setOptions([]);
  }

  return (
    <>
      <div>
        <Button
          variant="link"
          className="ps-0"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={schema.title + "-collapse"}
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
          {schema.title}
        </Button>
        <Collapse in={open}>
          <div>
            {" "}
            <Form.Group className={"org-uri"} style={{ overflow: "auto" }}>
              <Form.Label>{schema.properties.uri.title}</Form.Label>
              <Form.Control
                type="text"
                value={formData.uri}
                onChange={(e) => {
                  let data = { ...formData };
                  data.uri = e.target.value;
                  onChange(data);
                }}
                disabled={!editURI}
              />
              <div
                style={{
                  paddingTop: "0px",
                  fontSize: "12px",
                  display: "flex",
                }}
              >
                <p>{"nur ändern wenn sie sich ganz sicher sind"}</p>
                <Form.Check
                  style={{
                    paddingLeft: "5px",
                  }}
                  onChange={(e) => setEditURI(!editURI)}
                  checked={editURI}
                />
              </div>

              <Form.Label>{schema.properties.uriSameAs.title}</Form.Label>
              <Typeahead
                className="uri-ui"
                ref={ref}
                id={"typeahead" + schema.id}
                labelKey={labelKey}
                options={options}
                placeholder={"Wikidata durchsuchen oder andere URI einfügen"}
                // disabled={formData.uriSameAs}
                onChange={(selected) => {
                  // when something is selected
                  ref.current?.clear();
                  if (!selected || !selected[0]) return;
                  const data = {
                    uriSameAs: selected[0][valueKey],
                    uriSameAsLabel: selected[0]["label"],
                    uriSameAsDescription: selected[0]["description"],
                    uri: formData.uri,
                  };
                  // remove focus from input
                  ref.current?.blur();
                  onChange(data);
                }}
                onInputChange={(text) => {
                  setInputValue(text);
                }}
                emptyLabel="Keine URI gefunden"
                isLoading={isLoading}
                filterBy={() => true}
                renderMenuItemChildren={(option) => (
                  <div>
                    {option.label}
                    <div>
                      <small>{option.description}</small>
                    </div>
                  </div>
                )}
                renderInput={(inputProps, props) => (
                  <TypeaheadInputMulti
                    {...inputProps}
                    selected={formData.uriSameAs}
                  >
                    {formData.uriSameAs && (
                      <div
                        style={{
                          width: "100%",
                          marginBottom: "5px",
                          paddingTop: "0px",
                          cursor: "default",
                          paddingRight: "22px",
                        }}
                      >
                        {formData.uriSameAsLabel}
                        <br></br>
                        <a
                          href={formData.uriSameAs}
                          target="blank"
                          rel="noreferrer"
                        >
                          <small>{formData.uriSameAsDescription}</small>
                        </a>
                      </div>
                    )}
                  </TypeaheadInputMulti>
                )}
              >
                {formData.uriSameAs && (
                  <Button
                    style={{
                      top: 0,
                      right: 0,
                      position: "absolute",
                      zIndex: 10,
                    }}
                    variant="link"
                    onClick={unlink}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="bi bi-x-lg"
                      viewBox="0 0 16 16"
                    >
                      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                    </svg>
                  </Button>
                )}
              </Typeahead>
              <br></br>
              <br></br>
            </Form.Group>
          </div>
        </Collapse>
      </div>
    </>
  );
};

export default UriSearch;
