import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

import { Button } from "react-bootstrap";
import PropTypes from "prop-types";
import { selectNodeService } from "./service";
import JSONDigger from "../../services/jsonDigger";
import html2canvas from "html2canvas";
import {
  documentToSVG,
  elementToSVG,
  inlineResources,
  formatXML,
} from "dom-to-svg";
import jsPDF from "jspdf";
import ChartNode from "./ChartNode";
import "./ChartContainer.scss";

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
      pan,
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
      onChanged,
    },
    ref
  ) => {
    const container = useRef();
    const chart = useRef();
    const downloadButton = useRef();

    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [transform, setTransform] = useState("");
    const [enablePan, setEnablePan] = useState(true);
    const [panning, setPanning] = useState(false);
    const [dragging, setDragging] = useState(false);

    const [exporting, setExporting] = useState(false);
    const [dataURL, setDataURL] = useState("");
    const [download, setDownload] = useState("");
    const [ds, setDS] = useState({
      id: "n-root",
      name: "",
      title: "",
      style: "hidden",
      organisations: [...data.organisations],
    });

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
      setDS({
        id: "n-root",
        name: "",
        style: "root",
        organisations: [...data.organisations],
      });
    }, [data]);

    const dsDigger = new JSONDigger(ds, "id", "organisations");

    const changeHierarchy = async (draggedItemData, dropTargetId) => {
      await dsDigger.removeNode(draggedItemData.id);
      await dsDigger.addChildren(dropTargetId, draggedItemData);
      setDS({ ...dsDigger.ds });
      onChanged({ ...data, organisations: [...dsDigger.ds.organisations] });
    };
    const clickChartHandler = (event) => {
      if (!event.target.closest(".oc-node")) {
        if (onClickChart) {
          onClickChart();
        }
        selectNodeService.clearSelectedNodeInfo();
      }
    };

    // const enablePanHandler = () => {
    //   setEnablePan(!enablePan);
    // };

    const onDragNode = (e) => {
      setDragging(e);
      setEnablePan(!e);
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
      if (e.target.closest(".oc-node")) {
        setPanning(false);
        return;
      } else {
        setPanning(true);
        // setCursor("grabbing");
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

    const updateChartScale = (newScale) => {
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
      if (transform !== "") {
        setTransform("");
        let newScale = 0;
        updateChartScale(newScale);
      }
    };

    const zoomHandler = (e) => {
      let newScale = 1 + (e.deltaY > 0 ? -0.2 : 0.2);
      updateChartScale(newScale);
    };
    const zoomInHandler = (e) => {
      let newScale = 1 + 0.2;
      updateChartScale(newScale);
    };
    const zoomOutHandler = (e) => {
      let newScale = 1 - 0.2;
      updateChartScale(newScale);
    };

    const exportSVG = async (canvas, exportFilename, save = false) => {
      const svgDocument = elementToSVG(canvas, true);
      await inlineResources(svgDocument.documentElement);
      const svgString = new XMLSerializer().serializeToString(svgDocument);
      console.log("svgString", svgString);
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      if(save){
      const href = await URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = exportFilename + ".svg";
      window.open(link, '_blank');
      // document.body.appendChild(link);
      // link.click();
      // document.body.removeChild(link);}
      }else{
        return blob;
      }
    };
    const exportSVG2PDF = async (canvas, exportFilename) => {
      console.log(exportSVG(canvas, exportFilename));

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
        setDataURL(canvas.toDataURL());
        setDownload(exportFilename + ".png");
        downloadButton.current.click();
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
          const canvas = chart.current;
          exportSVG(canvas, exportFilename, true).then(() => {
            setExporting(false);
          });
        } else {
          html2canvas(chart.current, {
            width: chart.current.clientWidth,
            height: chart.current.clientHeight,
            onclone: function (clonedDoc) {
              clonedDoc.querySelector(".orgchart").style.background = "none";
              clonedDoc.querySelector(".orgchart").style.transform = "";
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
      <div
        ref={container}
        className={
          "orgchart-container " +
          containerClass +
          (dragging ? " dragging" : "") +
          (panning ? " panning" : "")
        }
        onWheel={zoom ? zoomHandler : undefined}
        onMouseUp={panning ? panEndHandler : undefined}
      >
        <div className="navigation-container">
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
          <Button onClick={resetViewHandler}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              className="bi bi-house"
              viewBox="0 0 16 16"
            >
              <path
                fillRule="evenodd"
                d="M2 13.5V7h1v6.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V7h1v6.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5zm11-11V6l-2-2V2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5z"
              />
              <path
                fillRule="evenodd"
                d="M7.293 1.5a1 1 0 0 1 1.414 0l6.647 6.646a.5.5 0 0 1-.708.708L8 2.207 1.354 8.854a.5.5 0 1 1-.708-.708L7.293 1.5z"
              />
            </svg>
          </Button>
          {/* <Button onClick={enablePanHandler}>🖐</Button> */}
        </div>
        <div
          ref={chart}
          id="#orgchart"
          className={"orgchart " + chartClass}
          style={{ transform: transform }}
          onClick={clickChartHandler}
          onMouseDown={enablePan ? panStartHandler : undefined}
          onMouseMove={enablePan && panning ? panHandler : undefined}
        >
          {data.document && (
            <div className="title-container">
              {data.document.title && <h1>{data.document.title}</h1>}
              {data.document.creator && <span>{data.document.creator}</span>}
              {data.document.version && <span> {data.document.version}</span>}
            </div>
          )}
          <ul>
            <ChartNode
              datasource={attachRel(ds, "00")}
              NodeTemplate={NodeTemplate}
              draggable={draggable}
              collapsible={collapsible}
              multipleSelect={multipleSelect}
              changeHierarchy={changeHierarchy}
              onClickNode={onClickNode}
              onDragNode={onDragNode}
            />
          </ul>
        </div>
        <a
          className="oc-download-btn hidden"
          ref={downloadButton}
          href={dataURL}
          download={download}
        >
          &nbsp;
        </a>
        <div className={`oc-mask ${exporting ? "" : "hidden"}`}>
          <i className="oci oci-spinner spinner"></i>
        </div>
      </div>
    );
  }
);

ChartContainer.propTypes = propTypes;
ChartContainer.defaultProps = defaultProps;

export default ChartContainer;
