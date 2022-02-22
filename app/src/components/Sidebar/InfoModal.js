import { Button, Modal } from "react-bootstrap";

const InfoModal = (props) => {
  return (
    <Modal {...props} size="lg" aria-labelledby="contained-modal-title-vcenter">
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          Informationen und Anleitung
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
      <div>Das Organigramm-Tool hat zum Ziel, die Erstellung der Organigramme der Berliner Verwaltung zu vereinfachen und die Organigramme in ein einheitlicheres und maschinenlesbares Format zu bringen.
        Eine Kurzanleitung zum Tool finden Sie  
        {' '}<a
      target="blank"
      href="http://odis-berlin.de/projekte/organigramme/guide"
    >
      hier
    </a>{''}.
    </div>
    <div> <br></br> </div>
      <div>Es handelt sich um einen ersten Prototypen, es kann also sein, dass das Tool nicht immer reibungslos läuft und Fehler enthält.{"\n"} 
      Das Tool wurde von der {' '}<a
      target="blank"
      href="http://odis-berlin.de"
    >
      Open Data Informationsstelle Berlin (ODIS)
    </a>{''} entwickelt, einem Projekt der Technologiestiftung Berlin, gefördert von der Senatsverwaltung für Wirtschaft, Energie und Betriebe.
      </div>
      </Modal.Body>
      <Modal.Footer>
      {' '}<a
      target="blank"
      href="https://www.technologiestiftung-berlin.de/impressum"
    >
      Impressum
    </a>{''}
        <Button variant="outline-primary" onClick={props.onHide}>
          Schließen
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InfoModal;
