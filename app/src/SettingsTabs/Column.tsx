import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import Typography from "@mui/material/Typography";
import { context } from "../state";
import { ColumnInfo } from "@tsconline/shared";
import { Box, ToggleButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import {
  ColumnContainer,
  AccordionDetails,
  TSCCheckbox,
  AccordionSummary,
  Accordion,
  TSCButton,
} from "../components";
import { generateChart, setcolumnSelected } from "../state/actions";

const ColumnMenu: React.FC<{
  name: string;
  parents: string[];
}> = ({ name, parents }) => {
  return (
    <div
      style={{
        width: "200px",
        height: "200px",
        backgroundColor: "lightblue",
        display: "flex",
        flexDirection: "column",
      }}
    ></div>
  );
};

//types for recursively creation accordions
type ColumnAccordionProps = {
  name: string;
  details: ColumnInfo[string];
  onToggle: (name: string, parents: string[]) => void;
};
// component for column accordion recursion creation
const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(
  ({ name, details, onToggle }) => {
    const theme = useTheme();
    const [open, setOpen] = useState(true);

    const toggleAccordion = (open: boolean) => {
      setOpen((open) => !open);
    };
    function clickColumnName() {
      toggleAccordion;
      setcolumnSelected(name, details.parents);
    }
    const hasChildren =
      details.children && Object.keys(details.children).length > 0;
    function thing(name: string, parents: string[]) {
      setcolumnSelected(name, parents);
      setOpen(open);
      console.log(open);
    }
    const columnName = (
      <div>
        <Typography sx={{ fontSize: "0.97rem" }} style={{ padding: "10px" }}>
          {name}
        </Typography>
      </div>
    );
    function selected(item: HTMLElement) {
      item.style.backgroundColor = "lighblue";
    }
    const checkbox = (
      <div>
        <ColumnContainer>
          <div
            style={{ display: "flex", cursor: "pointer" }}
            onClick={() => setcolumnSelected(name, details.parents)}
          >
            <TSCCheckbox
              checked={details.on}
              onChange={() => {
                onToggle(name, details.parents);
              }}
              //style={{ backgroundColor: "lightblue" }}
            />
            {columnName}
          </div>
        </ColumnContainer>
      </div>
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
              setcolumnSelected(name, details.parents);
            }}
            //style={{ backgroundColor: "lightblue" }}
          >
            {checkbox}
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <div>
            {details.children &&
              Object.entries(details.children).map(
                ([childName, childDetails]) => (
                  <div>
                    <ColumnAccordion
                      key={childName}
                      name={childName}
                      details={childDetails}
                      onToggle={onToggle}
                    />
                  </div>
                )
              )}
          </div>
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
  const handleChange = () => {
    setOpen(!open);
  };
  function renderColumns(columnInfo: ColumnInfo) {
    return Object.entries(columnInfo).map(([columnName, columnData]) => (
      <ColumnAccordion
        key={columnName}
        name={columnName}
        details={columnData}
        onToggle={actions.toggleSettingsTabColumn}
      />
    ));
  }
  const navigate = useNavigate();
  const handleButtonClick = () => {
    actions.setTab(1);
    actions.setAllTabs(true);

    actions.updateSettings();

    actions.generateChart();

    navigate("/chart");
  };
  return (
    <div
      style={{ display: "flex", justifyContent: "center", minHeight: "100vh" }}
    >
      <Box
        sx={{
          border: `1px solid gray`,
          borderRadius: "4px",
          zIndex: 0,
          padding: "10px",
        }}
      >
        <TSCButton
          style={{
            width: "auto",
            height: "auto",
            fontSize: "0.85rem",
          }}
          onClick={generateChart}
        >
          Generate
        </TSCButton>
        <Accordion
          expanded={open}
          onChange={handleChange}
          style={{ minWidth: "70vh" }}
        >
          <AccordionSummary aria-controls="panel1d-content" id="panel1d-header">
            <Typography sx={{ fontSize: "1.2rem", marginLeft: "15px" }}>
              TimeScale Creator GTS2020 Chart
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {renderColumns(state.settingsTabs.columns)}
          </AccordionDetails>
        </Accordion>
      </Box>
      <div>
        <div style={{ display: "flex", flexDirection: "row", width: "200px" }}>
          <ToggleButton
            value="check"
            selected={openMenu}
            onChange={() => {
              setOpen(!openMenu);
            }}
            size="small"
          >
            <SettingsSharpIcon />
          </ToggleButton>
          <div
            style={{
              display: "flex",
              flexGrow: "1",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "pink",
            }}
          >
            <Typography>Settings</Typography>
          </div>
        </div>

        {state.settingsTabs.columnSelected &&
          ColumnMenu(state.settingsTabs.columnSelected)}
      </div>
    </div>
  );
});
