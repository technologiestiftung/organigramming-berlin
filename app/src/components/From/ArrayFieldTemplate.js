const ArrayFieldTemplate = (props) => {
  return (
    <div className="bg-light mt-2 mb-1">
      <div className="header d-flex justify-content-between align-items-center ps-2">
        <h5 className="m-0">{props.title}</h5>
        {props.canAdd && (
          <button
            type="button"
            className="btn btn-light btn-sm add-array-item"
            onClick={props.onAddClick}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              className="bi bi-plus-circle"
              viewBox="0 0 16 16"
            >
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
            </svg>
          </button>
        )}
      </div>
      <ul className="content list-group list-group-flush">
        {props.items.map((element) => (
          <li
            className="item list-group-item bg-white m-1 p-0 d-flex align-center-top "
            key={element.key}
          >
            <div
              className="d-flex flex-shrink-1 flex-column"
            >
              <div className="flex-grow-1 d-flex" style={{ minHeight: "29px"}}>
                {element.hasMoveUp && (
                  <button
                    type="button"
                    className="btn btn-sm m-1 btn-light flex-grow-1"
                    onClick={element.onReorderClick(
                      element.index,
                      element.index - 1
                    )}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="bi bi-arrow-up-circle"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fillRule="evenodd"
                        d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-7.5 3.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex-grow-1 d-flex"  style={{ minHeight: "29px"}}>
                {element.hasMoveDown && (
                  <button
                    type="button"
                    className="btn btn-sm m-1 btn-light flex-grow-1"
                    onClick={element.onReorderClick(
                      element.index,
                      element.index + 1
                    )}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="bi bi-arrow-up-circle"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fillRule="evenodd"
                        d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex-grow-1 p-1 expand-item align-self-center">
              {element.children}
            </div>
            {element.hasRemove && (
              <button
                type="button"
                className="btn btn-danger btn-sm m-1 btn-light flex-shrink-1"
                onClick={element.onDropIndexClick(element.index)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-plus-circle"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ArrayFieldTemplate;
