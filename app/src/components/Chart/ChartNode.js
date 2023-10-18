import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "react-bootstrap";

import PropTypes from "prop-types";
import {
  dragNodeService,
  selectNodeService,
  isDefiend,
  getContrastTextColor,
} from "../../services/service";
import "./ChartNode.scss";

const propTypes = {
  props: PropTypes.object,
  data: PropTypes.object,
  draggable: PropTypes.bool,
  collapsible: PropTypes.bool,
  multipleSelect: PropTypes.bool,
  changeHierarchy: PropTypes.func,
  onClickNode: PropTypes.func,
  onContextMenu: PropTypes.func,
  onDragNode: PropTypes.func,
  onAddInitNode: PropTypes.func,
};

const defaultProps = {
  draggable: false,
  collapsible: true,
  multipleSelect: true,
};

const ChartNode = forwardRef(
  (
    {
      data,
      draggable,
      collapsible,
      multipleSelect,
      changeHierarchy,
      onClickNode,
      onContextMenu,
      onDragNode,
      level,
      onAddInitNode,
    },
    ref
  ) => {
    const node = useRef();
    const innerRef = useRef();
    const [allowedDrop, setAllowedDrop] = useState(false);
    const [selected, setSelected] = useState(false);
    const [ds, setDs] = useState(data);

    useImperativeHandle(ref, () => ({
      demoDragMode: (enable, nodeId = "") => {
        if (enable) {
          filterAllowedDropNodes(nodeId);
          document.body.classList.add("drag-demo");
        } else {
          dragNodeService.clearDragInfo();
          document.body.classList.remove("drag-demo");
          onDragNode(false);
        }
      },
      innerRef: innerRef.current,
    }));

    useEffect(() => {
      setDs(data);
    }, [data]);

    useEffect(() => {
      const subs1 = dragNodeService.getDragInfo().subscribe((draggedInfo) => {
        if (draggedInfo) {
          setAllowedDrop(
            !document
              .querySelector("#" + draggedInfo.draggedNodeId)
              .closest("li")
              .querySelector("#" + node.current.id)
              ? true
              : node.current.id === "n-root"
              ? true
              : false
          );
        } else {
          setAllowedDrop(false);
        }
      });

      const subs2 = selectNodeService
        .getSelectedNodeInfo()
        .subscribe((selectedNodeInfo) => {
          if (selectedNodeInfo) {
            if (multipleSelect) {
              if (selectedNodeInfo.selectedNodeId === data.id) {
                setSelected(true);
              }
            } else {
              setSelected(selectedNodeInfo.selectedNodeId === data.id);
            }
          } else {
            setSelected(false);
          }
        });

      return () => {
        subs1.unsubscribe();
        subs2.unsubscribe();
      };
    }, [multipleSelect, data.id]);

    const filterAllowedDropNodes = (id) => {
      dragNodeService.sendDragInfo(id);
    };

    const clickNodeHandler = (event) => {
      if (onClickNode) {
        onClickNode(ds);
      }
      selectNodeService.sendSelectedNodeInfo(ds.id);
    };

    const dragStartHandler = (event) => {
      const copyDS = { ...ds };
      onDragNode(true);
      delete copyDS.relationship;
      event.dataTransfer.setData("text/plain", JSON.stringify(copyDS));
      // highlight all potential drop targets
      filterAllowedDropNodes(node.current.id);
    };

    const dragOverHandler = (event) => {
      // prevent default to allow drop
      event.preventDefault();
    };

    const dragendHandler = () => {
      // reset background of all potential drop targets
      dragNodeService.clearDragInfo();
      onDragNode(false);
    };

    const dropHandler = (event) => {
      onDragNode(false);
      if (!event.currentTarget.classList.contains("allowedDrop")) {
        return;
      }
      dragNodeService.clearDragInfo();
      changeHierarchy(
        JSON.parse(event.dataTransfer.getData("text/plain")),
        event.currentTarget.id
      );
    };

    const contextMenuHandler = (e) => {
      e.preventDefault();
      if (onClickNode) {
        onClickNode(ds);
      }
      selectNodeService.sendSelectedNodeInfo(ds.id);
      onContextMenu(e);
    };

    return (
      <li className={"oc-hierarchy level-" + level}>
        <div
          id={ds.id}
          ref={node}
          className={
            "oc-node " +
            (allowedDrop ? " allowedDrop" : "") +
            (selected ? " selected" : "") +
            (ds.layout?.style ? " " + ds.layout?.style : "") +
            (ds.organisations && ds.organisations.length > 0
              ? ds.organisations.length > 1
                ? " has-children"
                : " has-child"
              : " end-node")
          }
          draggable={
            ds.layout?.style !== "root"
              ? draggable
                ? "true"
                : undefined
              : undefined
          }
          onClick={ds.layout?.style !== "root" ? clickNodeHandler : null}
          onDragStart={ds.layout?.style !== "root" ? dragStartHandler : null}
          onDragOver={dragOverHandler}
          onDragEnd={dragendHandler}
          onDrop={dropHandler}
          onContextMenu={
            ds.layout?.style !== "root" ? contextMenuHandler : null
          }
        >
          <div
            className={`oc-container${
              ds.layout?.grid !== "none" ? " grid" : ""
            }`}
            style={{
              backgroundColor:
                ds?.layout && ds.layout?.bgColor ? ds.layout?.bgColor : "",
            }}
          >
            <div
              className="oc-heading"
              style={{
                backgroundColor:
                  ds.layout && ds.layout?.bgStyle === "default"
                    ? ds.layout?.bgColor
                    : "",
                backgroundImage:
                  ds.layout &&
                  ds.layout?.bgColor &&
                  ds.layout?.bgStyle === "half"
                    ? `linear-gradient(to bottom left, rgba(0,0,0,0) 50%,${ds.layout.bgColor} 50%)`
                    : "",
                color: `${getContrastTextColor(ds.background?.color)}`,
              }}
            >
              <h1>{ds.name}</h1>
              {ds.altName && (
                <h3 className="text-start">
                  <span>({ds.altName})</span>
                </h3>
              )}
              {ds.purpose && (
                <h3
                  className="text-end"
                  style={{
                    fontStyle: "normal",
                  }}
                >
                  <span>{ds.purpose}</span>
                </h3>
              )}
            </div>
            {(ds.departments || ds.employees || ds.contact || ds.address) && (
              <div className="oc-content">
                {ds.employees && (
                  <ul
                    className={`employees${
                      ds.layout?.grid !== "none"
                        ? " grid " + ds.layout?.grid
                        : ""
                    }`}
                  >
                    {ds.employees &&
                      ds.employees.map(
                        (employee, j) =>
                          isDefiend(employee) && (
                            <li
                              className="d-flex align-items-top"
                              key={
                                j +
                                data.name +
                                "-" +
                                ds.name +
                                "- " +
                                employee.lastName
                              }
                            >
                              <div className="ms-1 mb-1">
                                {employee.position && (
                                  <span className="position">
                                    {employee.position}
                                  </span>
                                )}
                                <h4 className="person">
                                  {employee.salutation}
                                  {employee.title && " "}
                                  {employee.title}
                                  {employee.firstName && " "}
                                  {employee.firstName}
                                  {employee.lastName && " "}
                                  {employee.lastName}
                                </h4>
                                {employee.contact && (
                                  <ul className="contact">
                                    {employee.contact.telephone && (
                                      <li>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          fill="currentColor"
                                          className="me-1 bi bi-telephone"
                                          viewBox="0 0 16 16"
                                        >
                                          <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z" />
                                        </svg>
                                        {employee.contact.telephone}
                                      </li>
                                    )}
                                    {employee.contact.fax && (
                                      <li>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          fill="currentColor"
                                          className="me-1 bi bi-printer"
                                          viewBox="0 0 16 16"
                                        >
                                          <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />
                                          <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z" />
                                        </svg>
                                        {employee.contact.fax}
                                      </li>
                                    )}
                                    {employee.contact.email && (
                                      <li>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          fill="currentColor"
                                          className="me-1 bi bi-envelope"
                                          viewBox="0 0 16 16"
                                        >
                                          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z" />
                                        </svg>
                                        {employee.contact.email}
                                      </li>
                                    )}
                                    {employee.contact.website && (
                                      <li>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          fill="currentColor"
                                          className="me-1 bi bi-link-45deg"
                                          viewBox="0 0 16 16"
                                        >
                                          <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z" />
                                          <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z" />
                                        </svg>
                                        {employee.contact.website}
                                      </li>
                                    )}
                                  </ul>
                                )}
                              </div>
                            </li>
                          )
                      )}
                  </ul>
                )}
                {ds.departments && ds.departments.length > 0 && (
                  <hr className="mb-2"></hr>
                )}
                <ul
                  className={`departments${
                    ds.layout?.grid !== "none" ? " grid " + ds.layout?.grid : ""
                  }`}
                >
                  {ds.departments &&
                    ds.departments.map((department, i) => (
                      <li
                        key={i + ds.name + "-" + department.name}
                        className="mb-3"
                      >
                        <h3 className="mb-1">{department.name}</h3>
                        {ds.purpose && (
                          <h3 className="fw-normal mb-2 mt-0">
                            {department.purpose}
                          </h3>
                        )}

                        {department.employees && (
                          <ul className="employees">
                            {department.employees &&
                              department.employees.map(
                                (employee, j) =>
                                  isDefiend(employee) && (
                                    <li
                                      className="d-flex align-items-top mb-2"
                                      key={
                                        i +
                                        j +
                                        data.name +
                                        "-" +
                                        department.name +
                                        "- " +
                                        employee.lastName
                                      }
                                    >
                                      <div>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          fill="currentColor"
                                          className={
                                            employee.position
                                              ? "mt-2 bi bi-person"
                                              : "bi bi-person"
                                          }
                                          viewBox="0 0 16 16"
                                        >
                                          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                                        </svg>
                                      </div>{" "}
                                      <div className="ms-1">
                                        {employee.position && (
                                          <span className="position">
                                            {employee.position}
                                          </span>
                                        )}
                                        <h4 className="name">
                                          {employee.salutation}
                                          {employee.title && " "}
                                          {employee.title}
                                          {employee.firstName && " "}
                                          {employee.firstName}
                                          {employee.lastName && " "}
                                          {employee.lastName}
                                        </h4>
                                        {employee.contact && (
                                          <ul className="contact">
                                            {employee.contact.telephone && (
                                              <li>
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="16"
                                                  height="16"
                                                  fill="currentColor"
                                                  className="me-1 bi bi-telephone"
                                                  viewBox="0 0 16 16"
                                                >
                                                  <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z" />
                                                </svg>
                                                {employee.contact.telephone}
                                              </li>
                                            )}
                                            {employee.contact.fax && (
                                              <li>
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="16"
                                                  height="16"
                                                  fill="currentColor"
                                                  className="me-1 bi bi-printer"
                                                  viewBox="0 0 16 16"
                                                >
                                                  <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />
                                                  <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z" />
                                                </svg>
                                                {employee.contact.fax}
                                              </li>
                                            )}
                                            {employee.contact.email && (
                                              <li>
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="16"
                                                  height="16"
                                                  fill="currentColor"
                                                  className="me-1 bi bi-envelope"
                                                  viewBox="0 0 16 16"
                                                >
                                                  <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z" />
                                                </svg>
                                                {employee.contact.email}
                                              </li>
                                            )}
                                            {employee.contact.website && (
                                              <li>
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="16"
                                                  height="16"
                                                  fill="currentColor"
                                                  className="me-1 bi bi-link-45deg"
                                                  viewBox="0 0 16 16"
                                                >
                                                  <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z" />
                                                  <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z" />
                                                </svg>
                                                {employee.contact.website}
                                              </li>
                                            )}
                                          </ul>
                                        )}
                                      </div>
                                    </li>
                                  )
                              )}
                          </ul>
                        )}
                      </li>
                    ))}
                </ul>

                {ds.contact && (
                  <ul className="contact">
                    {ds.contact.telephone && (
                      <li>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          className="me-1 bi bi-telephone"
                          viewBox="0 0 16 16"
                        >
                          <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z" />
                        </svg>
                        {ds.contact.telephone}
                      </li>
                    )}
                    {ds.contact.fax && (
                      <li>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          className="me-1 bi bi-printer"
                          viewBox="0 0 16 16"
                        >
                          <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />
                          <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z" />
                        </svg>
                        {ds.contact.fax}
                      </li>
                    )}
                    {ds.contact.email && (
                      <li>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          className="me-1 bi bi-envelope"
                          viewBox="0 0 16 16"
                        >
                          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z" />
                        </svg>
                        {ds.contact.email}
                      </li>
                    )}
                    {ds.contact.website && (
                      <li>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          className="me-1 bi bi-link-45deg"
                          viewBox="0 0 16 16"
                        >
                          <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z" />
                          <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z" />
                        </svg>
                        {ds.contact.website}
                      </li>
                    )}
                  </ul>
                )}

                {ds.address.street && (
                  <div className="address">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      fill="currentColor"
                      className="me-1 bi bi-signpost"
                      viewBox="0 0 16 16"
                    >
                      <path d="M7 1.414V4H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h5v6h2v-6h3.532a1 1 0 0 0 .768-.36l1.933-2.32a.5.5 0 0 0 0-.64L13.3 4.36a1 1 0 0 0-.768-.36H9V1.414a1 1 0 0 0-2 0zM12.532 5l1.666 2-1.666 2H2V5h10.532z" />
                    </svg>
                    {ds.address.street} {ds.address.housenumber && " "}
                    {ds.address.housenumber}
                    {ds.address.building && " "}
                    {ds.address.building}
                    {ds.address.room && "-"}
                    {ds.address.room}
                    {ds.address.zipCode && ", "}
                    {ds.address.zipCode}
                    {ds.address.city && " "}
                    {ds.address.city}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {ds.organisations && ds.organisations.length > 0 ? (
          // <Droppable
          //   droppableId={"organisation-" + ds.id}
          //   type={"organisation"}
          // >
          //   {(provided, snapshot) => (
          <ul
            className={
              "sub-organisations " +
              (ds.suborganizationOrientation
                ? ds.suborganizationOrientation
                : "horizontal")
            }
            // style={getListStyle(snapshot.isDraggingOver)}
            // {...provided.droppableProps}
            // ref={provided.innerRef}
            // ref={(e) => {
            //   console.log("Droppable", e);
            //   provided.innerRef(e);
            // }}
          >
            {ds.organisations.map((node, index) => (
              <ChartNode
                index={index}
                data={node}
                level={level + 1}
                id={node.id}
                key={node.id}
                draggable={draggable}
                collapsible={collapsible}
                multipleSelect={multipleSelect}
                changeHierarchy={changeHierarchy}
                onClickNode={onClickNode}
                onContextMenu={onContextMenu}
                onDragNode={onDragNode}
              />
            ))}
            {/* {provided.placeholder} */}
          </ul>
        ) : (
          //   )}
          // </Droppable>
          ""
          // <Droppable
          //   droppableId={"organisation-" + ds.id}
          //   type={"organisation"}
          // >
          //   {(provided, snapshot) => (
          //     <ul
          //       className={
          //         "sub-organisations " +
          //         (ds.suborganizationOrientation
          //           ? ds.suborganizationOrientation
          //           : "horizontal")
          //       }
          //       style={getListStyle(snapshot.isDraggingOver)}
          //       {...provided.droppableProps}
          //       ref={provided.innerRef}
          //     >
          //       <li>Hier</li>
          //       {provided.placeholder}
          //     </ul>
          //   )}
          // </Droppable>
        )}

        {ds.organisations &&
          ds.organisations.length < 1 &&
          ds.layout?.style === "root" && (
            <Button variant="outline-success" onClick={() => onAddInitNode()}>
              Neue Organisation anlegen
            </Button>
          )}
      </li>
      //   ))}
      // </Draggable>
    );
  }
);

ChartNode.propTypes = propTypes;
ChartNode.defaultProps = defaultProps;

export default ChartNode;
