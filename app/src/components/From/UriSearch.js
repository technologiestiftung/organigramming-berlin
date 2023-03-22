import React, { useState, useEffect, useRef } from "react";
import { Form, OverlayTrigger, Button, Tooltip } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import { useDebounce } from "use-debounce";

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
          ref={ref}
          id={"typeahead" + schema.id}
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
            <Button
              variant="outline-primary"
              size="sm"
              style={{
                padding: "0.0em 0.65em",
                fontSize: "0.75em",
                fontWeight: 700,
                marginLeft: "0px",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-download"
                viewBox="0 0 16 16"
              >
                <path d="M8.91,11.75c0,.42.39.63,1.22.63v.79H5.79v-.79q1.2,0,1.2-.63V7.49c0-.43-.4-.64-1.2-.64v-.8H8.91Zm.17-8a1.17,1.17,0,0,1-.34.84,1.13,1.13,0,0,1-.85.36,1,1,0,0,1-.47-.1A1.22,1.22,0,0,1,7,4.54a1.34,1.34,0,0,1-.26-.38,1.18,1.18,0,0,1-.09-.46A1.12,1.12,0,0,1,7,2.85a1.18,1.18,0,0,1,.85-.34,1.11,1.11,0,0,1,.84.35A1.15,1.15,0,0,1,9.08,3.7Z"></path>
              </svg>
            </Button>
          </OverlayTrigger>

          <Button
            variant="outline-primary"
            size="sm"
            style={{
              padding: "0.0em 0.65em",
              fontSize: "0.75em",
              fontWeight: 700,
              marginLeft: "5px",
            }}
            title="link aufheben"
            onClick={unlink}
          >
            <svg
              height="16"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1000 928.6"
            >
              <path d="M245 709.3L102.1 852.1q-6.1 5 -12.8 5t-12.8 -5q-5.1 -5.6 -5.1 -12.8t5.1 -12.8L219.3 683.6q5.6 -5 12.8 -5t12.9 5q5 5.6 5 12.8t-5 12.9zm94.3 22.8v178.6q0 7.8 -5 12.8t-12.9 5.1 -12.8 -5.1 -5 -12.8V732.1q0 -7.8 5 -12.8t12.8 -5 12.9 5 5 12.8zm-125 -125q0 7.9 -5 12.9t-12.9 5H17.9Q10 625 5 620T0 607.1t5 -12.8 12.9 -5h178.5q7.8 0 12.9 5t5 12.8zm705.3 71.5q0 66.9 -47.4 113.3l-82 81.4q-46.3 46.3 -113.3 46.3 -67.5 0 -113.8 -47.4L376.7 685.3Q365 673.5 353.2 654l133.4 -10L639 796.9q15 15 37.9 15.3t37.9 -14.8L796.9 716q15.6 -15.7 15.6 -37.4 0 -22.3 -15.6 -38L644 487.2l10 -133.4q19.5 11.7 31.3 23.4l187.5 187.5q46.8 48 46.8 113.9zm-344.3 -404l-133.3 10L289.6 131.7Q274 116.1 251.7 116.1q-21.8 0 -38 15l-82 81.5q-15.6 15.6 -15.6 37.4 0 22.3 15.6 37.9l152.9 152.9 -10 134Q255 563.1 243.3 551.3L55.8 363.8Q8.9 315.8 8.9 250q0 -67 47.5 -113.3l82 -81.5Q184.7 8.9 251.7 8.9q67.5 0 113.8 47.5l186.4 186.9q11.7 11.7 23.4 31.3zm353.3 46.8q0 7.8 -5.1 12.9t-12.8 5H732.1q-7.8 0 -12.8 -5t-5 -12.9 5 -12.8 12.8 -5h178.6q7.8 0 12.8 5t5.1 12.8zM625 17.9v178.5q0 7.8 -5 12.9t-12.9 5 -12.8 -5 -5 -12.9V17.9q0 -7.9 5 -12.9t12.8 -5T620 5t5 12.9zm227.1 84.2L709.3 245q-6.2 5 -12.9 5t-12.8 -5q-5 -5.6 -5 -12.9t5 -12.8L826.5 76.5q5.5 -5.1 12.8 -5.1t12.8 5.1q5 5.5 5 12.8t-5 12.8z" />
            </svg>
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
