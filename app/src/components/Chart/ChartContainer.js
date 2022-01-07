import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

import { Button, ButtonGroup } from "react-bootstrap";
import PropTypes from "prop-types";
import { selectNodeService } from "./Service";
import JSONDigger from "../../services/jsonDigger";
import html2canvas from "html2canvas";
import { elementToSVG, inlineResources } from "dom-to-svg";
import jsPDF from "jspdf";
import ChartNode from "./ChartNode";
import "./ChartContainer.scss";

import "./RegisterFiles";
import SVGtoPDF from "svg-to-pdfkit";

const PDFDocument = require("pdfkit").default;
const blobStream = require("blob-stream");

const propTypes = {
  data: PropTypes.object.isRequired,
  pan: PropTypes.bool,
  zoom: PropTypes.bool,
  zoomoutLimit: PropTypes.number,
  zoominLimit: PropTypes.number,
  containerClass: PropTypes.string,
  chartClass: PropTypes.string,
  NodeTemplate: PropTypes.elementType,
  draggable: PropTypes.bool,
  collapsible: PropTypes.bool,
  multipleSelect: PropTypes.bool,
  onClickNode: PropTypes.func,
  onDragNode: PropTypes.func,
  onClickChart: PropTypes.func,
};

const defaultProps = {
  pan: false,
  zoom: false,
  zoomoutLimit: 0.5,
  zoominLimit: 7,
  containerClass: "",
  chartClass: "",
  draggable: true,
  collapsible: false,
  multipleSelect: false,
};

const ChartContainer = forwardRef(
  (
    {
      data,
      update,
      zoom,
      zoomoutLimit,
      zoominLimit,
      containerClass,
      chartClass,
      NodeTemplate,
      draggable,
      collapsible,
      multipleSelect,
      onClickNode,
      onClickChart,
      sendDataUp,
      onContextMenu,
      onCloseContextMenu,
    },
    ref
  ) => {
    const container = useRef();
    const chart = useRef();

    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [transform, setTransform] = useState("");
    const [chartTransform, setChartTransform] = useState("");
    const [enablePan, setEnablePan] = useState(true);
    const [panning, setPanning] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [sizeWarning, setSizeWarning] = useState(false);

    const rootNode = {
      id: "n-root",
      name: "",
      style: "root",
      organisations: [],
    };
    // const [ds, setDS] = useState({rootNode, organisations: [...data.organisations]});
    const [node, setNode] = useState({});

    let dsDigger = new JSONDigger(node, "id", "organisations");

    const attachRel = (data, flags) => {
      data.relationship =
        flags + (data.organisations && data.organisations.length > 0 ? 1 : 0);
      if (data.organisations) {
        data.organisations.forEach(function (item) {
          attachRel(item, "1" + (data.organisations.length > 1 ? 1 : 0));
        });
      }
      return data;
    };

    useEffect(() => {
      resetViewHandler();
    }, []);

    useEffect(() => {
      setNode({
        ...rootNode,
        organisations: JSON.parse(JSON.stringify(data.organisations)),
      });
      setTimeout(() => {
        updateChartHandler();
      }, 100);
    }, [update, data]);

    const changeHierarchy = async (draggedItemData, dropTargetId) => {
      await dsDigger.removeNode(draggedItemData.id);
      await dsDigger.addChildren(dropTargetId, draggedItemData);
      sendDataUp({ ...data, organisations: [...dsDigger.ds.organisations] });
    };

    const clickChartHandler = (event) => {
      if (!event.target.closest(".oc-node")) {
        if (onClickChart) {
          onClickChart();
        }
        selectNodeService.clearSelectedNodeInfo();
        onCloseContextMenu();
      }
    };

    const onDragNode = (e) => {
      setDragging(e);
      setEnablePan(!e);
      onCloseContextMenu();
    };

    const panEndHandler = () => {
      setPanning(false);
    };

    const panHandler = (e) => {
      let newX = 0;
      let newY = 0;
      if (!e.targetTouches) {
        // pand on desktop
        newX = e.pageX - startX;
        newY = e.pageY - startY;
      } else if (e.targetTouches.length === 1) {
        // pan on mobile device
        newX = e.targetTouches[0].pageX - startX;
        newY = e.targetTouches[0].pageY - startY;
      } else if (e.targetTouches.length > 1) {
        return;
      }
      if (transform === "") {
        if (transform.indexOf("3d") === -1) {
          setTransform("matrix(1,0,0,1," + newX + "," + newY + ")");
        } else {
          setTransform(
            "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0," + newX + ", " + newY + ",0,1)"
          );
        }
      } else {
        let matrix = transform.split(",");
        if (transform.indexOf("3d") === -1) {
          matrix[4] = newX;
          matrix[5] = newY + ")";
        } else {
          matrix[12] = newX;
          matrix[13] = newY;
        }
        setTransform(matrix.join(","));
      }
    };

    const panStartHandler = (e) => {
      onCloseContextMenu();
      if (e.target.closest(".oc-node")) {
        setPanning(false);
        return;
      } else {
        setPanning(true);
      }
      let lastX = 0;
      let lastY = 0;
      if (transform !== "") {
        let matrix = transform.split(",");
        if (transform.indexOf("3d") === -1) {
          lastX = parseInt(matrix[4]);
          lastY = parseInt(matrix[5]);
        } else {
          lastX = parseInt(matrix[12]);
          lastY = parseInt(matrix[13]);
        }
      }
      if (!e.targetTouches) {
        // pand on desktop
        setStartX(e.pageX - lastX);
        setStartY(e.pageY - lastY);
      } else if (e.targetTouches.length === 1) {
        // pan on mobile device
        setStartX(e.targetTouches[0].pageX - lastX);
        setStartY(e.targetTouches[0].pageY - lastY);
      } else if (e.targetTouches.length > 1) {
        return;
      }
    };

    const updateViewScale = (newScale) => {
      let matrix = [];
      let targetScale = 1;
      if (transform === "") {
        setTransform("matrix(" + newScale + ", 0, 0, " + newScale + ", 0, 0)");
      } else {
        matrix = transform.split(",");
        if (transform.indexOf("3d") === -1) {
          targetScale = Math.abs(window.parseFloat(matrix[3]) * newScale);
          if (targetScale > zoomoutLimit && targetScale < zoominLimit) {
            matrix[0] = "matrix(" + targetScale;
            matrix[3] = targetScale;
            setTransform(matrix.join(","));
          }
        } else {
          targetScale = Math.abs(window.parseFloat(matrix[5]) * newScale);
          if (targetScale > zoomoutLimit && targetScale < zoominLimit) {
            matrix[0] = "matrix3d(" + targetScale;
            matrix[5] = targetScale;
            setTransform(matrix.join(","));
          }
        }
      }
    };

    const resetViewHandler = () => {
      const containerWidth = chart.current.clientWidth,
        containerHeight = chart.current.clientHeight,
        chartWidth = chart.current.querySelector(".paper").clientWidth,
        chartHeight = chart.current.querySelector(".paper").clientHeight,
        newScale = Math.min(
          (containerWidth - 32) / chartWidth,
          (containerHeight - 32) / chartHeight
        );

      setTransform(
        "matrix(" +
          newScale +
          ", 0, 0, " +
          newScale +
          ", " +
          (containerWidth - chartWidth) / 2 +
          ", " +
          (containerHeight - chartHeight) / 2 +
          ")"
      );
    };

    const zoomHandler = (e) => {
      let newScale = 1 + (e.deltaY > 0 ? -0.01 : 0.01);
      updateViewScale(newScale);
    };
    const zoomInHandler = (e) => {
      let newScale = 1 + 0.2;
      updateViewScale(newScale);
    };
    const zoomOutHandler = (e) => {
      let newScale = 1 - 0.2;
      updateViewScale(newScale);
    };

    const updateChartHandler = () => {
      const paperWidth = chart.current.querySelector(".chart-container")
          .clientWidth,
        paperHeight = chart.current.querySelector(".chart-container")
          .clientHeight,
        chartWidth = chart.current.querySelector(".chart").clientWidth,
        chartHeight = chart.current.querySelector(".chart").clientHeight;
      let newScale = Math.min(
        paperWidth / chartWidth,
        paperHeight / chartHeight
      );

      //Minimum Scale
      if (newScale < 0.75) {
        newScale = 0.75;
        setSizeWarning(true);
      } else if (newScale > 1.2) {
        //Maximum Scale
        newScale = 1.2;
        setSizeWarning(false);
      } else {
        setSizeWarning(false);
      }

      setChartTransform(
        "matrix(" +
          newScale +
          ", 0, 0, " +
          newScale +
          ", " +
          (paperWidth - chartWidth) / 2 +
          ", " +
          (paperHeight - chartHeight) / 2 +
          ")"
      );
    };

    const exportSVG = async (canvas, exportFilename, save = false) => {
      resetViewHandler();
      selectNodeService.clearSelectedNodeInfo();
      // await timeout(600);
      const svgDocument = elementToSVG(canvas, true);
      await inlineResources(svgDocument.documentElement);
      const svgString = new XMLSerializer().serializeToString(svgDocument);
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      if (save) {
        download(URL.createObjectURL(blob), exportFilename, "svg");
      } else {
        return svgString;
      }
    };

    const exportSVG2PDF = async (canvas, exportFilename) => {
      const canvasWidth = Math.floor(canvas.width);
      const canvasHeight = Math.floor(canvas.height);
      exportSVG(canvas, exportFilename).then((e) => {
        // eslint-disable-next-line no-new-func
        let doc = new PDFDocument({
          size: data.document.paperSize,
          layout: data.document.pageOrientation,
          compress: true,
        }); // It's easier to find bugs with uncompressed files
        SVGtoPDF(doc, e, 0, 0, {
          width: canvasWidth,
          height: canvasHeight,
          useCSS: false,
        });
        let stream = doc.pipe(blobStream());
        stream.on("finish", function () {
          let blob = stream.toBlob("application/pdf");
          download(URL.createObjectURL(blob), exportFilename, "pdf");
        });
        doc.end();
      });
    };

    const exportPDF = (canvas, exportFilename) => {
      const canvasWidth = Math.floor(canvas.width);
      const canvasHeight = Math.floor(canvas.height);
      const doc =
        canvasWidth > canvasHeight
          ? new jsPDF({
              orientation: "landscape",
              unit: "px",
              format: [canvasWidth, canvasHeight],
            })
          : new jsPDF({
              orientation: "portrait",
              unit: "px",
              format: [canvasHeight, canvasWidth],
            });
      doc.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0);
      doc.save(exportFilename + ".pdf");
    };

    const download = (href, exportFilename, exportFileextension) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = exportFilename + "." + exportFileextension;
      document.body.appendChild(link);
      // window.open(link, "_blank");
      link.click();
      document.body.removeChild(link);
    };

    const exportPNG = (canvas, exportFilename) => {
      const isWebkit = "WebkitAppearance" in document.documentElement.style;
      const isFf = !!window.sidebar;
      const isEdge =
        navigator.appName === "Microsoft Internet Explorer" ||
        (navigator.appName === "Netscape" &&
          navigator.appVersion.indexOf("Edge") > -1);

      if ((!isWebkit && !isFf) || isEdge) {
        window.navigator.msSaveBlob(canvas.msToBlob(), exportFilename + ".png");
      } else {
        console.log(canvas.toDataURL("image/png"));
        download(canvas.toDataURL("image/png"), exportFilename, "png");
      }
    };

    useImperativeHandle(ref, () => ({
      exportTo: (exportFilename, exportFileextension) => {
        exportFilename = exportFilename || "OrgChart";
        exportFileextension = exportFileextension || "png";
        setExporting(true);
        const originalScrollLeft = container.current.scrollLeft;
        container.current.scrollLeft = 0;
        const originalScrollTop = container.current.scrollTop;
        container.current.scrollTop = 0;
        if (exportFileextension.toLowerCase() === "svg") {
          const canvas = chart.current.querySelector(".paper");
          console.log(canvas);
          exportSVG(canvas, exportFilename, true).then(() => {
            setExporting(false);
          });
        } else if (exportFileextension.toLowerCase() === "pdf") {
          const canvas = chart.current.querySelector(".paper");
          exportSVG2PDF(canvas, exportFilename).then(() => {
            setExporting(false);
          });
        } else {
          html2canvas(chart.current.querySelector(".paper"), {
            width: chart.current.querySelector(".paper").clientWidth,
            height: chart.current.querySelector(".paper").clientHeight,
            onclone: function (clonedDoc) {
              clonedDoc.querySelector(".paper").style.background = "none";
              clonedDoc.querySelector(".paper").style.transform = "";
            },
          }).then(
            (canvas) => {
              if (exportFileextension.toLowerCase() === "pdf") {
                exportPDF(canvas, exportFilename);
              } else {
                exportPNG(canvas, exportFilename);
              }
              setExporting(false);
              container.current.scrollLeft = originalScrollLeft;
              container.current.scrollTop = originalScrollTop;
            },
            () => {
              setExporting(false);
              container.current.scrollLeft = originalScrollLeft;
              container.current.scrollTop = originalScrollTop;
            }
          );
        }
      },
      expandAllNodes: () => {
        chart.current
          .querySelectorAll(
            ".oc-node.hidden, .oc-hierarchy.hidden, .isSiblingsCollapsed, .isAncestorsCollapsed"
          )
          .forEach((el) => {
            el.classList.remove(
              "hidden",
              "isSiblingsCollapsed",
              "isAncestorsCollapsed"
            );
          });
      },
    }));

    return (
      <>
        <div
          ref={container}
          className={
            "view-container " +
            containerClass +
            (dragging ? " dragging" : "") +
            (panning ? " panning" : "") +
            (exporting ? "exporting" : "")
          }
          onWheel={zoom ? zoomHandler : undefined}
          onMouseUp={panning ? panEndHandler : undefined}
        >
          <div className="navigation-container">
            <ButtonGroup aria-label="navigation" vertical>
              <Button onClick={zoomInHandler}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-zoom-in"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"
                  />
                  <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z" />
                  <path
                    fillRule="evenodd"
                    d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5z"
                  />
                </svg>
              </Button>
              <Button onClick={zoomOutHandler}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-zoom-out"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"
                  />
                  <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z" />
                  <path
                    fillRule="evenodd"
                    d="M3 6.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"
                  />
                </svg>
              </Button>

              <Button onClick={resetViewHandler}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-arrows-fullscreen"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707zm0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707zm-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707z"
                  />
                </svg>
              </Button>
            </ButtonGroup>
          </div>
          <div
            ref={chart}
            className={"editor " + chartClass + (exporting ? " exporting" : "")}
            onClick={clickChartHandler}
            onMouseDown={enablePan ? panStartHandler : undefined}
            onMouseMove={enablePan && panning ? panHandler : undefined}
          >
            <div
              className={`paper ${data.document.paperSize} ${data.document.pageOrientation}`}
              style={{ transform: transform }}
            >
              <span className="paper-size-lable">
                ‭
                {sizeWarning && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    fill="danger"
                    className="bi me-1 mb-1 bi-exclamation-triangle-fill"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />{" "}
                    ‬ ‭
                  </svg>
                )}
                {data.document.paperSize}
                {data.document.pageOrientation === "landscape" && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    className="bi ms-1 mb-1 bi-file-earmark"
                    viewBox="0 0 16 16"
                  >
                    <path d="M4.5,2H14c1.1,0,2,0.9,2,2v8c0,1.1-0.9,2-2,2H2c-1.1,0-2-0.9-2-2V6.5L4.5,2z M4.5,5c0,0.8-0.7,1.5-1.5,1.5H1V12c0,0.6,0.4,1,1,1h12c0.6,0,1-0.4,1-1V4c0-0.6-0.4-1-1-1H4.5V5z" />
                  </svg>
                )}
                {data.document.pageOrientation === "portrait" && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    className="b ms-1 mb-1 bi-file-earmark"
                    viewBox="0 0 16 16"
                  >
                    <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
                  </svg>
                )}
              </span>
              {data.document && (
                <div className="title-container">
                  {data.document.logo && (
                    <img
                      style={{ height: "5rem", width: "auto" }}
                      src={data.document.logo}
                    />
                  )}

                  {data.document.title && (
                    <div className="title-content">
                      <h1>{data.document.title}</h1>
                      {data.document.creator && (
                        <span>{data.document.creator}</span>
                      )}
                      {data.document.version && (
                        <span> {data.document.version}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="chart-container">
                <ul className="chart" style={{ transform: chartTransform }}>
                  <ChartNode
                    data={node}
                    update={update}
                    NodeTemplate={NodeTemplate}
                    draggable={draggable}
                    collapsible={collapsible}
                    multipleSelect={multipleSelect}
                    changeHierarchy={changeHierarchy}
                    onClickNode={onClickNode}
                    onContextMenu={onContextMenu}
                    onDragNode={onDragNode}
                  />
                </ul>
              </div>
              {data.document.note && (
                <div className="node-container">{data.document.note}</div>
              )}
            </div>
          </div>
        </div>
        <div className={`oc-mask ${exporting ? "" : "hidden"}`}>
          <i className="oci oci-spinner spinner"></i>
        </div>
      </>
    );
  }
);

ChartContainer.propTypes = propTypes;
ChartContainer.defaultProps = defaultProps;

export default ChartContainer;
