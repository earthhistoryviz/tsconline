import { observer } from "mobx-react-lite";
import React, { useContext, useRef, useState } from "react";
import Typography from "@mui/material/Typography";
import { context } from "../state";
import { ColumnInfo } from "@tsconline/shared";
import { Box, Button, TextField, ToggleButton } from "@mui/material";
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
import { updateEditName } from "../state/GeneralActions";

type ColumnMenuProps = {
  name: string;
  parents: string[];
};

const ColumnMenu: React.FC<ColumnMenuProps> = observer(({ name, parents }) => {
  const { state, actions } = useContext(context);
  let editName = useRef("");
  return (
    <div
      style={{
        width: "300px",
        height: "300px",
        backgroundColor: "lightblue",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography style={{ padding: "5px" }}>Edit Title</Typography>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <TextField
          hiddenLabel
          id="editNameTextField"
          defaultValue={name}
          key={name}
          onChange={(event) => {
            actions.updateEditName(event.target.value);
          }}
          variant="filled"
          size="small"
        />
        <div
          style={{
            display: "flex",
            flexGrow: "1",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Button
            color="secondary"
            variant="contained"
            onClick={() => {
              console.log(state.settingsTabs.columnSelected?.name);
              //updateEditName(state.settingsTabs.columnSelected?.name);
            }}
          >
            Revert
          </Button>
        </div>
      </div>
    </div>
  );
});

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
    const { state, actions } = useContext(context);
    const [open, setOpen] = useState(true);

    const toggleAccordion = (open: boolean) => {
      setOpen((open) => !open);
    };
    function clickColumnName() {
      actions.setcolumnSelected(name, details.parents);
    }
    let color = "transparent";
    if (state.settingsTabs.columnSelected) {
      color = state.settingsTabs.columnSelected.name === name ? "lightblue" : "transparent";
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
      <div>
        <ColumnContainer>
          <div
            style={{ display: "flex", cursor: "pointer", backgroundColor: color }}
            onClick={() => clickColumnName()}
          >
            <TSCCheckbox
              checked={details.on}
              onChange={() => {
                onToggle(name, details.parents);
              }}
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
              //setcolumnSelected(name, details.parents);
            }}
          >
            {checkbox}
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <div>
            {details.children &&
              Object.entries(details.children).map(
                ([childName, childDetails]) => (
                  <div key={childName}>
                    <ColumnAccordion
                      key={childName}
                      name={childDetails.editName}
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
  function renderColumnMenu() {
    if (state.settingsTabs.columnSelected !== null) {
      return (
        <ColumnMenu
          name={state.settingsTabs.columnSelected.name}
          parents={state.settingsTabs.columnSelected.parents}
        />
      );
    }
  }
  function showMenu() {
    let menu = document.getElementById("ColumnMenu");
    let label = document.getElementById("ColumnMenuLabel");
    if (menu !== null && label !== null) {
      if (!openMenu) {
        menu.style.display = "flex";
        label.style.display = "flex";
        setOpenMenu(true);
      } else {
        menu.style.display = "none";
        label.style.display = "none";
        setOpenMenu(false);
      }
    }
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
          onClick={actions.generateChart}
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
        <div style={{ display: "flex", flexDirection: "row", width: "300px" }}>
          <div style={{ backgroundColor: "lightgray" }}>
            <ToggleButton
              value="check"
              selected={openMenu}
              onChange={() => {
                showMenu();
              }}
              size="small"
            >
              <SettingsSharpIcon />
            </ToggleButton>
          </div>

          <div
            id="ColumnMenuLabel"
            style={{
              display: "none",
              justifyContent: "center",
              alignItems: "center",
              flexGrow: "1",
              backgroundColor: "lightblue",
            }}
          >
            <Typography>Settings</Typography>
          </div>
        </div>
        <div id="ColumnMenu" style={{ display: "none" }}>
          {state.settingsTabs.columnSelected && renderColumnMenu()}
        </div>
      </div>
    </div>
  );
});
