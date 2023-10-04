import React, { useState, useEffect } from "react";
import { Form } from "react-bootstrap";

const MainOrganisation = (props) => {
  const { formData, onChange } = props;
  const [isTopOrg, setIsTopOrg] = useState(false);

  // check if the org is a top level org
  // only top level orgs should have a UI to decided if its the main org
  useEffect(() => {
    const selectedOrgID = props?.uiSchema?.selected?.id;
    if (!selectedOrgID) return;
    const topOrganisations = props.uiSchema.dsDigger.ds?.organisations;
    let topOrg = false;
    topOrganisations?.forEach((org) => {
      if (org.id === selectedOrgID) {
        topOrg = true;
      }
    });
    setIsTopOrg(topOrg);
  }, [props]);

  return (
    isTopOrg && (
      <Form>
        <Form.Check // prettier-ignore
          label={`Als Hauptorganisation festlegen`}
          type={"checkbox"}
          id={`checkbox`}
          checked={formData}
          onChange={() => {
            onChange(!formData);
          }}
        />
      </Form>
    )
  );
};

export default MainOrganisation;
