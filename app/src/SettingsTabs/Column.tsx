import { observer } from "mobx-react-lite";
import React, { memo, useContext, useRef, useState } from "react";
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
import "./Column.css";

const ColumnMenu: React.FC<{}> = observer(() => {
  const { state, actions } = useContext(context);
  const [openMenu, setOpenMenu] = useState(false);
  let editName = useRef("");
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
  const name =
    state.settingsTabs.columnSelected === null
      ? ""
      : state.settingsTabs.columnSelected.name;
  function menuContent() {
    return (
      <div>
        <Typography style={{ padding: "5px" }}>Edit Title</Typography>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <TextField
            hiddenLabel
            id="editNameTextField"
            defaultValue={name}
            key={name}
            onChange={(event) => {
              editName.current = event.target.value;
            }}
            variant="filled"
            size="small"
          />
          <div className="edit-title-button">
            <Button
              color="secondary"
              variant="contained"
              onClick={() => {
                actions.updateEditName(editName.current);
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={openMenu ? "column-menu" : ""}>
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
        <div id="ColumnMenuLabel" className="column-menu-label">
          <Typography>Settings</Typography>
        </div>
      </div>
      <div id="ColumnMenu" style={{ display: "none" }}>
        {state.settingsTabs.columnSelected && menuContent()}
      </div>
    </div>
  );
});

//types for recursively creation accordions
type ColumnAccordionProps = {
  name: string;
  details: ColumnInfo[string];
  onToggle: (name: string, parents: string[]) => void;
  setSelected: (name: string) => void;
};
// component for column accordion recursion creation
const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(
  ({ name, details, onToggle, setSelected }) => {
    const theme = useTheme();
    const { state, actions } = useContext(context);
    const [open, setOpen] = useState(true);
    //for keeping the original name for array access
    let ogName = useRef(name);
    const toggleAccordion = (open: boolean) => {
      setOpen((open) => !open);
    };

    function clickColumnName() {
      actions.setcolumnSelected(name, details.parents);
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
      <div>
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
                onToggle(ogName.current, details.parents);
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
                  <div id={childName} key={childName}>
                    <ColumnAccordion
                      key={childName}
                      name={childDetails.editName}
                      details={childDetails}
                      onToggle={onToggle}
                      setSelected={setSelected}
                    />
                  </div>
                )
              )}
          </div>
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
  function renderColumns(columnInfo: ColumnInfo) {
    return Object.entries(columnInfo).map(([columnName, columnData]) => (
      <ColumnAccordion
        key={columnName}
        name={columnName}
        details={columnData}
        onToggle={actions.toggleSettingsTabColumn}
        setSelected={setSelectedWrapper}
      />
    ));
  }
  function renderColumnMenu() {
    return <ColumnMenu />;
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
      {renderColumnMenu()}
    </div>
  );
});
