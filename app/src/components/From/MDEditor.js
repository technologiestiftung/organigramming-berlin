import React from "react";
import MDEditor, { commands } from "@uiw/react-md-editor";
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

  const _onChange = (value) => {
    // var value = _ref.target.value;
    return onChange(value === "" ? options.emptyValue : value);
  };

  return (
    <div className="mb-0">
      <label className="form-label">{props.label}</label>
      <button className="btn align-baseline float-end">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          className="bi bi-info-circle"
          viewBox="0 0 16 16"
        >
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
          <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
        </svg>
      </button>
      <MDEditor
        className="form-control"
        style={{ overflow: "hidden" }}
        id={id}
        value={typeof value === "undefined" ? "" : value}
        onChange={_onChange}
        onBlur={
          onBlur &&
          ((e) => {
            return onBlur(id, value);
          })
        }
        onFocus={
          onFocus &&
          ((e) => {
            return onFocus(id, value);
          })
        }
        previewOptions={{
          rehypePlugins: [[rehypeSanitize]],
        }}
        highlightEnable={false}
        commandsFilter={(cmd) => {
          if (
            cmd &&
            cmd.name &&
            /(live|edit|quote|strikethrough|image|preview|checked-list)/.test(
              cmd.name
            )
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
    </div>
  );
};

MDEditorWidget.propTypes = propTypes;
MDEditorWidget.defaultProps = defaultProps;

export default MDEditorWidget;
