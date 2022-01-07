import React from "react";

const TitleField = (_ref) =>{

    var title = _ref.title;
    if(title === " "){
        return ""
    }
    return (
        <div className="my-1">
            <h5>{title}</h5>
        </div>
    )
  };
  

export default TitleField;