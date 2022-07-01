import { Subject } from "rxjs";

const subject1 = new Subject();
const subject2 = new Subject();

export const dragNodeService = {
  sendDragInfo: id => subject1.next({ draggedNodeId: id }),
  clearDragInfo: () => subject1.next(),
  getDragInfo: () => subject1.asObservable()
};

export const selectNodeService = {
  sendSelectedNodeInfo: id => subject2.next({ selectedNodeId: id }),
  clearSelectedNodeInfo: () => subject2.next(),
  getSelectedNodeInfo: () => subject2.asObservable()
};


export const toSnakeCase = (str) => {
  return str
    .match(
      /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
    )
    .map((x) => x.toLowerCase())
    .join("_");
};


export const isDefiend = (object) => {
  return typeof object !== "undefined" && object !== null;
};
