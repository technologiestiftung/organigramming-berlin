import { Button, Modal } from "react-bootstrap";

const AlertModal = (props) => {
  return (
    <Modal {...props} size="lg" aria-labelledby="contained-modal-title-vcenter">
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          {props.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{props.children}</Modal.Body>
      <Modal.Footer>
        {props.onSave && (
          <Button variant="outline-success" onClick={props.onSave}>
            Dokument speichern
          </Button>
        )}
        <Button variant="outline-danger" onClick={props.onOkay}>
          Verwerfen
        </Button>
        <Button variant="outline-primary" onClick={props.onHide}>
          Abbrechen
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AlertModal;
