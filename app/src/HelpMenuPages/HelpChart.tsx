// This is suppose to be a component so it nests inside the
import React from "react";
import { Outlet } from "react-router-dom";

const HelpChart = () => {
  return (
    <div>

        <h1> Chart </h1>
        <Outlet/>
    </div>
  );
};

export default HelpChart;