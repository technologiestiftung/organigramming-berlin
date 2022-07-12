import { Button, Modal, Container, Row, Col } from "react-bootstrap";

const InfoModal = (props) => {
  console.log(props);
  return (
    <Modal
      {...props}
      size="lg"
      centered
      aria-labelledby="contained-modal-title-vcenter"
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          Organigramm-Tool
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ paddingBottom: "32px" }}>
        <Container>
          <Row>
            <p>
              Das Organigramm-Tool hat zum Ziel, die Erstellung der Organigramme
              der Berliner Verwaltung zu vereinfachen und die Organigramme in
              ein einheitlicheres und maschinenlesbares Format zu bringen.
            </p>
            <p>
              Es handelt sich derzeit noch um einen ersten Prototypen, es kann also sein,
              dass das Tool noch einzelne Programmierfehler enthält. Das Tool funktioniert direkt im Browser, 
              ein Download oder eine Anmeldung sind nicht nötig. Am besten funktioniert die Anwendung in den Browsern Chrome und Microsoft Edge.
            </p>
          </Row>
          <Row>
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <Button
                variant="primary"
                onClick={() => {
                  props.onHide();
                  props.onJoyrideStart();
                }}
              >
                Tour Starten
              </Button>
              <Button variant="primary" onClick={props.onHide}>
                Ausprobieren
              </Button>
              <Button
                href="http://odis-berlin.de/projekte/organigramme/guide"
                target="_blank"
                rel="noopener noreferrer"
                variant="outline-primary"
              >
                <span style={{ marginRight: "4px" }}>Kurzanleitung</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="20px"
                  viewBox="0 0 24 24"
                  width="20px"
                  fill="#101f4b"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                </svg>
              </Button>
            </div>
          </Row>
        </Container>
      </Modal.Body>
      <Modal.Footer
        style={{
          display: "block",
        }}
      >
        <Container>
          <Row>
            <Col xs={12} md={5}>
              <p style={{ marginBottom: "4px", fontSize: "11px" }}>
                Das Tool wurde von der{" "}
                <a target="blank" href="http://odis-berlin.de">
                  Open Data Informationsstelle Berlin (ODIS)
                </a>
                {""} entwickelt, einem Projekt der Technologiestiftung Berlin,
                gefördert von der Senatsverwaltung für Wirtschaft, Energie und
                Betriebe.
                <a
                  target="blank"
                  href="https://www.technologiestiftung-berlin.de/impressum"
                  style={{ display: "block", marginTop: "8px" }}
                >
                  Impressum
                </a>
              </p>
            </Col>
            <Col xs={12} md={7}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "24px",
                  justifyContent: "flex-end",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                }}
              >
                <img
                  src="images/odis.svg"
                  alt="Logo der Open Data Informationsstelle Berlin"
                  style={{ width: "156px" }}
                />
                <img
                  src="images/tsb.svg"
                  alt="Logo der Technologiestiftung Berlin"
                  style={{ width: "116px" }}
                />
                <img
                  src="images/senweb.svg"
                  alt="Logo der Senatsverwaltung für Wirtschaft, Energie und Betriebe"
                  style={{ width: "96px" }}
                />
              </div>
            </Col>
          </Row>
        </Container>
      </Modal.Footer>
    </Modal>
  );
};

export default InfoModal;
