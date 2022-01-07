import React from "react";

const DescriptionField = (_ref) => {
    var description = _ref.description;
    if(description === " "){
        return ""
    }
    if (description) {
      return React.createElement("div", null, React.createElement("div", {
        className: "mb-3"
      }, description));
    }
  
    return null;
  };
  
  export default DescriptionField