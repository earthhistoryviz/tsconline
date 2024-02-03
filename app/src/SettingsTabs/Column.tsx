import { observer } from "mobx-react-lite";
import React, { useContext, useRef, useState } from "react";
import Typography from "@mui/material/Typography";
import { context } from "../state";
import { ColumnInfo } from "@tsconline/shared";
import { Box, Button, TextField, ToggleButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import {
  ColumnContainer,
  AccordionDetails,
  TSCCheckbox,
  AccordionSummary,
  Accordion,
  TSCButton,
} from "../components";
import "./Column.css";
import { ColumnMenu } from "./ColumnMenu";

type ColumnAccordionProps = {
  name: string;
  details: ColumnInfo;
};

const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(
  ({ name, details }) => {
    const theme = useTheme();
    const { state, actions } = useContext(context);
    const [open, setOpen] = useState(true);
    //for keeping the original name for array access
    let ogName = useRef(name);
    const toggleAccordion = (open: boolean) => {
      setOpen((open) => !open);
    };

    function clickColumnName() {
      actions.setcolumnSelected(ogName.current);
      //setSelected(name);
    }
    const hasChildren =
      details.children && Object.keys(details.children).length > 0;
    const columnName = (
      <div>
        <Typography
          className="ColumnName"
          sx={{ fontSize: "0.97rem" }}
          style={{ padding: "6px" }}
        >
          {details.editName}
        </Typography>
      </div>
    );
    const checkbox = (
      <>
        <ColumnContainer>
          <div
            // className={
            //   selected === name ? "column-selected-color" : "column-base-color"
            // }
            style={{
              display: "flex",
              cursor: "pointer",
            }}
            onClick={() => clickColumnName()}
          >
            <TSCCheckbox
              checked={details.on}
              onChange={() => {
                actions.toggleSettingsTabColumn(ogName.current);
                //console.log(name);
                //console.log(state.settingsTabs.columns);
              }}
            />
            {columnName}
          </div>
        </ColumnContainer>
      </>
    );

    // if there are no children, don't make an accordion
    if (!hasChildren) {
      return checkbox;
    }
    return (
      <Accordion expanded={open} onChange={() => toggleAccordion(open)}>
        <AccordionSummary aria-controls="panel-content" id="panel-header">
          <div
            onClick={() => {
              toggleAccordion(open);
              //setcolumnSelected(name, details.parents);
            }}
          >
            {checkbox}
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <>
            {details.children &&
              Object.entries(details.children).map(
                ([childName, childDetails]) => (
                  <div id={childName} key={childName}>
                    <ColumnAccordion
                      key={childName}
                      name={childDetails.editName}
                      details={childDetails}
                    />
                  </div>
                )
              )}
          </>
        </AccordionDetails>
        {/* <div>{console.log("rerender", name)}</div> */}
      </Accordion>
    );
  }
);

// column with generate button, and accordion columns
export const Column = observer(function Column() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const [open, setOpen] = useState(true);
  const [openMenu, setOpenMenu] = useState(false);
  const [selected, setSelected] = useState("");
  const handleChange = () => {
    setOpen(!open);
  };
  const setSelectedWrapper = (name: string) => {
    setSelected(name);
  };
  // function renderColumns(columnInfo: ColumnInfo) {
  //   return Object.entries(columnInfo.children).map(([columnName, columnData]) => (
  //     <ColumnAccordion
  //       key={columnName}
  //       name={columnName}
  //       details={columnData}
  //       onToggle={actions.toggleSettingsTabColumn}
  //       setSelected={setSelectedWrapper}
  //     />
  //   ));
  // }
  function renderColumnMenu() {
    return <ColumnMenu />;
  }
  const navigate = useNavigate();
  const handleButtonClick = () => {
    // actions.updateSettings();
    actions.generateChart();
    navigate("/chart");
  };
  return (
    <div
      style={{ display: "flex", justifyContent: "center", minHeight: "100vh" }}
    >
      <Box
        className="hide-scrollbar"
        sx={{
          border: `1px solid gray`,
          borderRadius: "4px",
          zIndex: 0,
          padding: "10px",
        }}
        style={{ overflowX: "auto", width: "1000px", maxHeight: "80vh" }}
      >
        <TSCButton
          style={{
            width: "auto",
            height: "auto",
            fontSize: "0.85rem",
          }}
          onClick={handleButtonClick}
        >
          Generate
        </TSCButton>
            {state.settingsTabs.columns &&
              <ColumnAccordion 
              name={state.settingsTabs.columns.name}
              details={state.settingsTabs.columns}
              />}
      </Box>
      {renderColumnMenu()}
    </div>
  );
});
