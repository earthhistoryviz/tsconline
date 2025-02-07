// This is suppose to be a component so it nests inside the
import React from "react";

// Something like this if you want to make a template of the page, but I didn't do it for the other pages

const HelpPageTemplate = (header : string, md_file : any) => {
  return (
    <div>
      <h1> {header} </h1>
      <p> Insert md file here: {md_file} </p>
    </div>
  );
};

export default HelpPageTemplate;