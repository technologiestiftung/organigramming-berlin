import React, { useState, useEffect, useRef } from "react";
import { Form, Button } from "react-bootstrap";
import { Typeahead, TypeaheadInputMulti } from "react-bootstrap-typeahead";
import { useDebounce } from "use-debounce";
import "react-bootstrap-typeahead/css/Typeahead.css";

const UriSearch = (props) => {
  const { value, formData, onChange, schema } = props;
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState(value);
  const [debouncedInputValue] = useDebounce(inputValue, 700);
  const [isLoading, setIsLoading] = useState(false);

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
            console.log("response: ", data);
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
      uri: "",
      uriLabel: "",
      uriDescription: "",
    };

    onChange(data);
    setOptions([]);
  }

  return (
    <>
      <Form.Group className={"org-uri"}>
        <Form.Label>{schema.title}</Form.Label>
        <Typeahead
          className="uri-ui"
          ref={ref}
          id={"typeahead" + schema.id}
          labelKey={labelKey}
          options={options}
          placeholder={
            "Nach Wikidata suchen oder selbstdefinierte URIs hinzufügen"
          }
          disabled={formData.uri}
          onChange={(selected) => {
            // when something is selected
            ref.current?.clear();
            if (!selected[0]) return;

            const data = {
              uri: selected[0][valueKey],
              uriLabel: selected[0]["label"],
              uriDescription: selected[0]["description"],
            };
            // remove focus from input
            ref.current?.blur();
            onChange(data);
          }}
          onInputChange={(text) => {
            setInputValue(text);
          }}
          emptyLabel="Keine Verlinkungen gefunden"
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
            <TypeaheadInputMulti {...inputProps} selected={formData.uri}>
              {formData.uri && (
                <div
                  style={{
                    width: "100%",
                    marginBottom: "5px",
                    paddingTop: "0px",
                    cursor: "default",
                    paddingRight: "22px",
                  }}
                >
                  {formData.uriLabel}
                  <br></br>
                  <a href={formData.uri} target="blank">
                    <small>{formData.uriDescription}</small>
                  </a>
                </div>
              )}
            </TypeaheadInputMulti>
          )}
        >
          {formData.uri && (
            <Button
              style={{ top: 0, right: 0, position: "absolute", zIndex: 10 }}
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
      </Form.Group>
    </>
  );
};

export default UriSearch;
