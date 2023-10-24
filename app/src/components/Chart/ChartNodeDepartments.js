import React, { forwardRef } from "react";

import { isDefiend } from "../../services/service";
import "./ChartNode.scss";

const ChartNodeDepartments = forwardRef(({ ds, data, departments }, ref) => {
  return (
    <ul
      className={`departments${
        ds.layout?.grid !== "none" ? " grid " + ds.layout?.grid : ""
      }`}
    >
      {departments &&
        departments.map((department, i) => (
          <li key={i + ds.name + "-" + department.name} className="mb-3">
            <h3 className="mb-1">{department.name}</h3>
            {ds.purpose && (
              <h3 className="fw-normal mb-2 mt-0">{department.purpose}</h3>
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
  );
});

export default ChartNodeDepartments;
