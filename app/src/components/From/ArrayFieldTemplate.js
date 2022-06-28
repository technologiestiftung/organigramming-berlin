
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
          <li className="item list-group-item bg-white m-1 d-flex align-items-top" key={element.key}>
            {element.hasRemove && (
              <div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm m-1 btn-light"
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
              </div>
            )}
            <div className="flex-grow-1 p-1 expand-item">{element.children}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ArrayFieldTemplate;
