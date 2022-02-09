import React, { useState } from "react";
import MDEditor, { commands } from "@uiw/react-md-editor";
import { OverlayTrigger, Popover } from "react-bootstrap";
import rehypeSanitize from "rehype-sanitize";
import PropTypes from "prop-types";

const propTypes = {
  schema: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  options: PropTypes.shape({
    rows: PropTypes.number,
  }),
  value: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  readonly: PropTypes.bool,
  autofocus: PropTypes.bool,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
};

const defaultProps = {
  autofocus: false,
  options: {},
};

const MDEditorWidget = (props) => {
  var id = props.id,
    options = props.options,
    placeholder = props.placeholder,
    value = props.value,
    required = props.required,
    disabled = props.disabled,
    readonly = props.readonly,
    autofocus = props.autofocus,
    onChange = props.onChange,
    onBlur = props.onBlur,
    onFocus = props.onFocus;

  const [isChanged, setIsChanged] = useState(false);

  const _onChange = (value) => {
    // var value = _ref.target.value;
    setIsChanged(true);
    return onChange(value === "" ? options.emptyValue : value);
  };
  const _onBlur = (value) => {
    // var value = _ref.target.value;
    setIsChanged(false);
    onBlur();
  };

  return (
    <div className="mb-0">
      <label className="form-label">{props.label}</label>
      <OverlayTrigger
        trigger="click"
        placement="right"
        overlay={
          <Popover
            id="markdownhelp"
            style={{ maxWidth: "none", fontSize: "0.8em" }}
          >
            <Popover.Header as="h3">Markdown</Popover.Header>
            <Popover.Body>
              <table>
                <tbody>
                <tr>
                  <td>#&nbsp;Überschrift&nbsp;1</td>
                  <td>
                    <h1 style={{ fontSize: "1.2rem" }}>Überschrift&nbsp;1</h1>
                  </td>
                </tr>
                <tr>
                  <td>##&nbsp;Überschrift&nbsp;2</td>
                  <td>
                    <h2 style={{ fontSize: "1rem" }}>Überschrift&nbsp;2</h2>
                  </td>
                </tr>
                <tr>
                  <td>###&nbsp;Überschrift&nbsp;3</td>
                  <td>
                    <h3 style={{ fontSize: "0.8rem" }}>Überschrift&nbsp;3</h3>
                  </td>
                </tr>
                <tr>
                  <td>**Fett**</td>
                  <td>
                    <b>Fett</b>
                  </td>
                </tr>
                <tr>
                  <td>*kursiv*</td>
                  <td>
                    <i>kursiv</i>
                  </td>
                </tr>
                <tr>
                  <td>[link](url)</td>
                  <td>
                    <a href="#section">Link</a>
                  </td>
                </tr>
                <tr>
                  <td>`code`</td>
                  <td>
                    <code>code</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    - Liste
                    <br />- Liste
                    <br />- Liste
                  </td>
                  <td>
                    <ul>
                      <li>Liste</li>
                      <li>Liste</li>
                      <li>Liste</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <td>
                    1. Liste
                    <br />2. Liste
                    <br />3. Liste
                  </td>
                  <td>
                    <ol>
                      <li>Liste</li>
                      <li>Liste</li>
                      <li>Liste</li>
                    </ol>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    Um einen Zeilenumbruch oder eine neue Zeile zu erzeugen,
                    <br />beenden Sie eine Zeile mit zwei Leerzeichen.
                  </td>
                </tr>
                </tbody>
              </table>
            </Popover.Body>
          </Popover>
        }
      >
        <button className="btn btn-sm float-end btn-link">Hilfe</button>
      </OverlayTrigger>
      <MDEditor
        className="form-control"
        style={{ overflow: "hidden" }}
        id={id}
        value={typeof value === "undefined" ? "" : value}
        onChange={_onChange}
        preview="edit"
        onFocus={
          onFocus &&
          ((e) => {
            return onFocus(id, value);
          })
        }
        previewOptions={{
          rehypePlugins: [[rehypeSanitize]],
        }}
        highlightEnable={true}
        commandsFilter={(cmd) => {
          if (
            cmd &&
            cmd.name &&
            /(quote|strikethrough|image|preview|checked-list)/.test(cmd.name)
          ) {
            return false;
          }
          return cmd;
        }}
        commands={[
          // Custom Toolbars

          commands.group([commands.title2, commands.title3, commands.title4], {
            name: "title",
            groupName: "title",
            buttonProps: { "aria-label": "Insert title" },
          }),
          commands.bold,
          commands.italic,
          commands.hr,
          commands.divider,
          commands.link,
          commands.code,
          commands.divider,
          commands.list,
        ]}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readonly}
        autoFocus={autofocus}
        rows={options.rows}
      />
      <button
        className={
          "btn mt-2 btn-sm float-end " +
          (isChanged ? "btn-primary" : "btn-light")
        }
        disabled={!isChanged}
        onClick={_onBlur}
      >
        Übernehmen
      </button>
    </div>
  );
};

MDEditorWidget.propTypes = propTypes;
MDEditorWidget.defaultProps = defaultProps;

export default MDEditorWidget;
