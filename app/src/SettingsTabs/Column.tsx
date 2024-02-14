import { observer } from "mobx-react-lite";
import React, { useContext, useRef, useState } from "react";
import Typography from "@mui/material/Typography";
import { context } from "../state";
import { ColumnInfo } from "@tsconline/shared";
import { Box } from "@mui/material";
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

import { ColumnMenu } from "./ColumnMenu";

type ColumnAccordionProps = {
  name: string;
  details: ColumnInfo;
};

const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(
  ({ name, details }) => {
    const theme = useTheme();
    const { state, actions } = useContext(context);
    const [open, setOpen] = useState(false);
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
    function checkbox(leaf: string) {
      return (
        <>
          <ColumnContainer>
            <div
              className={leaf}
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
                }}
              />
              {columnName}
            </div>
          </ColumnContainer>
        </>
      );
    }

    // if there are no children, don't make an accordion
    if (!hasChildren) {
      return checkbox("column-leaf");
    }
    return (
      <Accordion expanded={open} onChange={() => toggleAccordion(open)}>
        <AccordionSummary aria-controls="panel-content" id="panel-header">
          <div
            onClick={() => {
              toggleAccordion(open);
            }}
          >
            {checkbox("")}
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <>
            {details.children &&
              Object.entries(details.children).map(
                ([childName, childDetails]) => (
                  <ColumnAccordion
                    key={childName}
                    name={childDetails.editName}
                    details={childDetails}
                  />
                )
              )}
          </>
        </AccordionDetails>
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
  const navigate = useNavigate();
  const handleButtonClick = () => {
    // actions.updateSettings();
    actions.generateChart();
    navigate("/chart");
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <TSCButton
        style={{
          margin: "2vh auto 2vh",
          width: "200px",
          fontSize: "1rem",
        }}
        onClick={handleButtonClick}
      >
        Generate
      </TSCButton>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          minHeight: "100vh",
        }}
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
          {state.settingsTabs.columns && (
            <ColumnAccordion
              name={state.settingsTabs.columns.name}
              details={state.settingsTabs.columns}
            />
          )}
        </Box>
        <ColumnMenu />
      </div>
    </div>
  );
});
