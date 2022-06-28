import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

import { Button, ButtonGroup } from "react-bootstrap";
import PropTypes from "prop-types";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import { selectNodeService } from "../../services/service";
import JSONDigger from "../../services/jsonDigger";
import html2canvas from "html2canvas";
import { elementToSVG, inlineResources } from "dom-to-svg";
import jsPDF from "jspdf";
import ChartNode from "./ChartNode";
import "./ChartContainer.scss";

import "../../services/registerFiles";
// import SVGtoPDF from "svg-to-pdfkit";

// const PDFDocument = require("pdfkit").default;
// const blobStream = require("blob-stream");

const propTypes = {
  data: PropTypes.object.isRequired,
  pan: PropTypes.bool,
  zoom: PropTypes.bool,
  zoomoutLimit: PropTypes.number,
  zoominLimit: PropTypes.number,
  containerClass: PropTypes.string,
  chartClass: PropTypes.string,
  draggable: PropTypes.bool,
  collapsible: PropTypes.bool,
  multipleSelect: PropTypes.bool,
  onClickNode: PropTypes.func,
  onDragNode: PropTypes.func,
  onClickChart: PropTypes.func,
  sendDataUp: PropTypes.func,
  onContextMenu: PropTypes.func,
  onCloseContextMenu: PropTypes.func,
  onAddInitNode: PropTypes.func,
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
      draggable,
      collapsible,
      multipleSelect,
      onClickNode,
      onClickChart,
      sendDataUp,
      onContextMenu,
      onCloseContextMenu,
      onOpenDocument,
      onAddInitNode,
    },
    ref
  ) => {
    const container = useRef();
    const chart = useRef();
    const topNode = useRef();

    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [transform, setTransform] = useState("");
    const [chartTransform, setChartTransform] = useState("");
    const [enablePan, setEnablePan] = useState(true);
    const [panning, setPanning] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [sizeWarning, setSizeWarning] = useState(false);

    const [node, setNode] = useState({
      id: "n-root",
      name: "TOP LEVEL",
      style: "root",
      organisations: JSON.parse(JSON.stringify(data.organisations)),
    });

    const dsDigger = new JSONDigger(node, "id", "organisations");

    useEffect(() => {
      resetViewHandler();
      setTimeout(() => {
        updateChartHandler();
      }, 50);
    }, []);

    useEffect(() => {
      setNode({
        id: "n-root",
        name: "TOP LEVEL",
        style: "root",
        organisations: JSON.parse(JSON.stringify(data.organisations)),
      });

      setTimeout(() => {
        updateChartHandler();
      }, 50);
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
      const rootNode = chart.current.querySelector("#n-root");
      let rootNodeHeight = 57;
      if (rootNodeHeight) {
        rootNodeHeight = rootNode.clientHeight;
      }

      const paperWidth =
          chart.current.querySelector(".chart-container").clientWidth,
        paperHeight =
          chart.current.querySelector(".chart-container").clientHeight,
        chartWidth = chart.current.querySelector(".chart").clientWidth,
        chartHeight = chart.current.querySelector(".chart").clientHeight;
      let newScale = Math.min(
        paperWidth / chartWidth,
        paperHeight / (chartHeight - rootNodeHeight)
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
          (paperHeight - chartHeight - rootNodeHeight) / 2 +
          ")"
      );
    };

    const exportSVG = async (canvas, exportFilename, save = false) => {
      resetViewHandler();

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

    // const exportSVG2PDF = async (canvas, exportFilename) => {
    //   await exportSVG(canvas, exportFilename).then((svg) => {
    //     // eslint-disable-next-line no-new-func
    //     let doc = new PDFDocument({
    //       size: data.document.paperSize,
    //       layout: data.document.paperOrientation,
    //       compress: true,
    //     }); // It's easier to find bugs with uncompressed files
    //     SVGtoPDF(doc, svg, 0, 0, {
    //       useCSS: false,
    //     });
    //     let stream = doc.pipe(blobStream());
    //     stream.on("finish", function () {
    //       let blob = stream.toBlob("application/pdf");
    //       download(URL.createObjectURL(blob), exportFilename, "pdf");
    //     });
    //     doc.end();
    //   });
    // };

    const exportSVG2PDF = async (canvas, exportFilename) => {
      await exportSVG(canvas, exportFilename).then((svg) => {
        // eslint-disable-next-line no-new-func
        let doc = new jsPDF();
        const canvasWidth = Math.floor(canvas.width);
        const canvasHeight = Math.floor(canvas.height);
        console.log(chart.current.querySelector(".paper"));

        doc.html(chart.current.querySelector(".paper"), {
          callback: function (doc) {
            doc.save(`${exportFilename}.pdf`);
          },
          orientation: data.document.paperOrientation,
          unit: "px",
          format: [canvasWidth, canvasHeight],
          x: 10,
          y: 10,
        });

        // let doc = new PDFDocument({
        //   size: data.document.paperSize,
        //   layout: data.document.paperOrientation,
        //   compress: true,
        // }); // It's easier to find bugs with uncompressed files
        // SVGtoPDF(doc, svg, 0, 0, {
        //   useCSS: false,
        // });
        // let stream = doc.pipe(blobStream());
        // stream.on("finish", function () {
        //   let blob = stream.toBlob("application/pdf");
        //   download(URL.createObjectURL(blob), exportFilename, "pdf");
        // });
        // doc.end();
      });
    };

    const exportPDF = (canvas, exportFilename) => {
      const canvasWidth = Math.floor(canvas.width);
      const canvasHeight = Math.floor(canvas.height);
      // const doc =
      //   canvasWidth > canvasHeight
      //     ? new jsPDF({
      //         orientation: "landscape",
      //         unit: "px",
      //         format: [canvasWidth, canvasHeight],
      //       })
      //     : new jsPDF({
      //         orientation: "portrait",
      //         unit: "px",
      //         format: [canvasHeight, canvasWidth],
      //       });
      const doc = new jsPDF({
        orientation: data.document.paperOrientation,
        unit: "px",
        format: [canvasWidth, canvasHeight],
      });
      doc.addImage(
        canvas.toDataURL("image/jpeg", 1.0),
        "JPEG",
        0,
        0,
        canvasWidth,
        canvasHeight
      );
      doc.save(exportFilename + ".pdf");
    };

    const download = (href, exportFilename, exportFileextension) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = exportFilename + "." + exportFileextension;
      document.body.appendChild(link);
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
        download(canvas.toDataURL("image/png"), exportFilename, "png");
      }
    };

    useImperativeHandle(ref, () => ({
      exportTo: (fileName, fileextension, includeLogo, vectorPdf) => {
        setExporting(true);
        selectNodeService.clearSelectedNodeInfo();
        const exportFilename = fileName || "OrgChart";
        const exportFileextension = fileextension || "png";

        const originalScrollLeft = container.current.scrollLeft;
        container.current.scrollLeft = 0;
        const originalScrollTop = container.current.scrollTop;
        container.current.scrollTop = 0;
        const canvas = chart.current.querySelector(".paper");
        if (!includeLogo && data.document.logo) {
          const logo = canvas.querySelector("#logo");
          if (logo) {
            logo.style.display = "none";
          }
        }
        if (exportFileextension === "svg") {
          exportSVG(canvas, exportFilename, true).then(() => {
            setExporting(false);
          });
        } else if (exportFileextension === "pdf" && vectorPdf) {
          exportSVG2PDF(canvas, exportFilename).then(() => {
            setExporting(false);
          });
        } else {
          html2canvas(canvas, {
            width: canvas.clientWidth,
            height: canvas.clientHeight,
            onclone: function (clonedDoc) {
              clonedDoc.querySelector(".paper").style.background = "none";
              clonedDoc.querySelector(".paper").style.transform = "";
            },
          }).then(
            (canvas) => {
              if (exportFileextension === "pdf") {
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
              if (!includeLogo && data.document.logo) {
                const logo = canvas.querySelector("#logo");
                if (logo) {
                  logo.style.display = "none";
                }
              }
            }
          );
        }
      },
      // expandAllNodes: () => {
      //   chart.current
      //     .querySelectorAll(
      //       ".oc-node.hidden, .oc-hierarchy.hidden, .isSiblingsCollapsed, .isAncestorsCollapsed"
      //     )
      //     .forEach((el) => {
      //       el.classList.remove(
      //         "hidden",
      //         "isSiblingsCollapsed",
      //         "isAncestorsCollapsed"
      //       );
      //     });
      // },
      demoDragMode: (enable, nodeId = "") => {
        topNode.current.demoDragMode(enable, nodeId);
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
              <Button onClick={zoomInHandler} title="Herein zoomen">
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
              <Button onClick={zoomOutHandler} title="Heraus zoomen">
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

              <Button onClick={resetViewHandler} title="Übersicht">
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
              className={`paper ${data.document.paperSize} ${data.document.paperOrientation}`}
              style={{ transform: transform }}
            >
              <span
                className="paper-size-label"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDocument(true);
                }}
              >
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
                  </svg>
                )}
                {data.document.paperSize}
                {data.document.paperOrientation === "landscape" && (
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
                {data.document.paperOrientation === "portrait" && (
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
                  <div className="cell">
                    <Button
                      className="btn-sm btn-edit btn-secondary btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDocument(true);
                      }}
                    >
                      Bearbeiten
                    </Button>
                    {data.document.logo && (
                      <img
                        id="logo"
                        alt="logo"
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
                </div>
              )}
              <div className="chart-container">
                <ul className="chart" style={{ transform: chartTransform }}>
                  <ChartNode
                    ref={topNode}
                    data={node}
                    level={0}
                    update={update}
                    draggable={draggable}
                    collapsible={collapsible}
                    multipleSelect={multipleSelect}
                    changeHierarchy={changeHierarchy}
                    onClickNode={onClickNode}
                    onContextMenu={onContextMenu}
                    onDragNode={onDragNode}
                    onAddInitNode={onAddInitNode}
                  />
                </ul>
              </div>
              {data.document.note && (
                <div className="note-container">
                  <div className="cell">
                    <Button
                      className="btn-sm btn-edit btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDocument(true);
                      }}
                    >
                      Bearbeiten
                    </Button>
                    <MDEditor.Markdown
                      source={data.document.note}
                      rehypePlugins={[[rehypeSanitize]]}
                    />
                  </div>
                </div>
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
