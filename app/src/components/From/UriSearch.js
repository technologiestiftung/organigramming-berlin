import React, { useState, useEffect, useRef } from "react";
import { Form, OverlayTrigger, Button, Tooltip, Badge } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import { useDebounce } from "use-debounce";

const UriSearch = (props) => {
  console.log("prrrprprprprprprprprp", props);
  const { value, formData, onChange, schema, uiSchema } = props;
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState(value);
  const [debouncedInputValue] = useDebounce(inputValue, 700);
  const [isLoading, setIsLoading] = useState(false);

  const ref = useRef();
  const url =
    "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&errorformat=plaintext&language=de&origin=*&uselang=de&type=item&search=";
  const labelKey = "label";
  const valueKey = "url";
  //   const labelKey = uiSchema["ui:options"].labelKey;
  //   const valueKey = uiSchema["ui:options"].valueKey;

  useEffect(() => {
    if (debouncedInputValue) {
      // the input value includes http -> take this as the URI
      if (debouncedInputValue.includes("http")) {
        setOptions([
          {
            label: debouncedInputValue,
            description: "spezifische URI",
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

  return (
    <>
      <Form.Group>
        <Form.Label>{schema.title}</Form.Label>
        <Typeahead
          ref={ref}
          id={schema.title}
          labelKey={labelKey}
          options={options}
          placeholder={formData.uri ? formData.uri : "Suche..."}
          //   placeholder={value}
          onChange={(selected) => {
            ref.current?.clear();
            if (!selected[0]) return;

            const data = {
              uri: selected[0][valueKey],
              uriLabel: selected[0]["label"],
              uriDescription: selected[0]["description"],
            };

            onChange(data);
          }}
          onInputChange={(text) => {
            setInputValue(text);
          }}
          emptyLabel="Keine Verlinkungen gefunden"
          isLoading={isLoading}
          filterBy={() => true}
          //   selected={options.filter((option) => option[valueKey] === value)}
          renderMenuItemChildren={(option) => (
            <div>
              {option.label}
              <div>
                <small>{option.description}</small>
              </div>
            </div>
          )}
        />
      </Form.Group>

      {formData.uri && (
        <div>
          <OverlayTrigger
            key={"top"}
            placement={"top"}
            overlay={
              <Tooltip id={`tooltip`}>
                <span className="text-start">
                  {formData.uriLabel}
                  <br />
                  <small>{formData.uriDescription}</small>
                </span>
              </Tooltip>
            }
          >
            <Badge bg="secondary">info</Badge>
          </OverlayTrigger>

          <Button
            variant="danger"
            size="sm"
            style={{
              padding: "0.0em 0.65em",
              fontSize: "0.75em",
              fontWeight: 700,
              marginLeft: "10px",
            }}
            onClick={() => {
              const data = {
                uri: "",
                uriLabel: "",
                uriDescription: "",
              };

              onChange(data);
            }}
          >
            löschen
          </Button>

          <a
            className="uri-link"
            rel="noreferrer"
            target="_blank"
            href={formData.uri}
            style={{ display: "inline-block", marginLeft: "10px" }}
          >
            Link öffnen
          </a>
        </div>
      )}
    </>
  );
};

export default UriSearch;
