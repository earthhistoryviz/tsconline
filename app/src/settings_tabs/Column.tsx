import { observer } from "mobx-react-lite";
import React, { useContext } from "react";
import Typography from "@mui/material/Typography";
import { context } from "../state";
import { ColumnInfo } from "@tsconline/shared";
import { Box, IconButton, TextField } from "@mui/material";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import { ColumnContainer, TSCCheckbox, Accordion } from "../components";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";

import { ColumnMenu } from "./ColumnMenu";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTheme } from "@mui/material/styles";
import { Tooltip } from "@mui/material";
import "./Column.css";
import { checkIfDataIsInRange } from "../util/util";
import { setExpanded } from "../state/actions";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ExpandIcon from "@mui/icons-material/Expand";
import CompressIcon from "@mui/icons-material/Compress";

// column with generate button, and accordion columns
export const Column = observer(function Column() {
  const { state, actions } = useContext(context);
  //state array of column names that are expanded
  return (
    <div className="column-top-level-container">
      <ColumnSearchBar />
      <div className="column-accordion-and-menu-container">
        <Box
          className={`hide-scrollbar column-accordion-wrapper ${state.settingsTabs.columnSearchTerm ? "filtered-border" : ""}`}>
          <div className="column-filter-buttons">
            <IconButton
              disableRipple
              className="expand-collapse-column-buttons"
              onClick={() => {
                if (!state.settingsTabs.columns) return;
                actions.setExpansionOfAllChildren(state.settingsTabs.columns, true);
              }}>
              <ExpandIcon />
            </IconButton>
            <IconButton
              disableRipple
              className="expand-collapse-column-buttons"
              onClick={() => {
                if (!state.settingsTabs.columns) return;
                actions.setExpansionOfAllChildren(state.settingsTabs.columns, false);
              }}>
              <CompressIcon />
            </IconButton>
          </div>
          {state.settingsTabs.columns &&
            Object.entries(state.settingsTabs.columns.children).map(([childName, childDetails]) => (
              <ColumnAccordion key={childName} details={childDetails} />
            ))}
        </Box>
        <ColumnMenu />
      </div>
    </div>
  );
});

type ColumnAccordionProps = {
  details: ColumnInfo;
};

const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(({ details }) => {
  const { actions, state } = useContext(context);
  if (!details.show) {
    return null;
  }
  const selectedClass = details.name === state.settingsTabs.columnSelected ? "selected-column" : "";
  // if there are no children, don't make an accordion
  if (details.children.length == 0) {
    return (
      <div
        className={`column-leaf-row-container ${selectedClass}`}
        onClick={() => actions.setColumnSelected(details.name)}
        tabIndex={0}>
        <ColumnIcon column={details} />
      </div>
    );
  }
  // for keeping the selected column hierarchy line highlighted
  const containsSelectedChild = details.children.some((column) => column.name === state.settingsTabs.columnSelected)
    ? { opacity: 100 }
    : {};
  return (
    <div className="column-accordion-container">
      {details.expanded && <div className="accordion-line" style={containsSelectedChild} />}
      <Accordion
        //checks if column name is in expand list
        expanded={details.expanded}
        className="column-accordion">
        <MuiAccordionSummary
          onClick={() => {
            actions.setColumnSelected(details.name);
          }}
          tabIndex={0}
          expandIcon={
            <ArrowForwardIosSharpIcon
              sx={{ fontSize: "0.9rem" }}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!details.expanded, details);
              }}
            />
          }
          aria-controls="panel-content"
          className={`column-accordion-summary ${selectedClass}`}>
          <ColumnIcon column={details} />
        </MuiAccordionSummary>
        <MuiAccordionDetails className="column-accordion-details">
          {details.children &&
            Object.entries(details.children).map(([childName, childDetails]) => (
              <ColumnAccordion key={childName} details={childDetails} />
            ))}
        </MuiAccordionDetails>
      </Accordion>
    </div>
  );
});

const ColumnIcon = observer(({ column }: { column: ColumnInfo }) => {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const dataInrange = checkIfDataIsInRange(
    column.minAge,
    column.maxAge,
    state.settings.timeSettings[column.units].topStageAge,
    state.settings.timeSettings[column.units].baseStageAge
  );
  const tooltipOrCheckBox =
    !dataInrange && !(column.name === "Ma" || column.name === "Root") ? (
      <Tooltip
        title="Data not included in time range"
        placement="top"
        arrow
        slotProps={{
          popper: {
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [0, -10]
                }
              }
            ]
          }
        }}>
        <ErrorOutlineIcon
          className="column-error-icon"
          style={{
            color: theme.palette.error.main
          }}
        />
      </Tooltip>
    ) : (
      <TSCCheckbox
        checked={column.on}
        className="column-checkbox"
        onClick={(event) => {
          // to stop selection of column when clicking on checkbox
          event.stopPropagation();
          actions.toggleSettingsTabColumn(column);
        }}
      />
    );
  return (
    <ColumnContainer className={`column-row-container ${column.children.length > 0 ? "" : "column-leaf"}`}>
      {tooltipOrCheckBox}
      <Typography className="column-display-name">{column.editName}</Typography>
    </ColumnContainer>
  );
});

const ColumnSearchBar = observer(() => {
  const { state, actions } = useContext(context);
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    actions.setColumnSearchTerm(term);
    actions.searchColumns(term);
  };
  return (
    <div className="column-search-bar-container">
      <TextField
        className="column-search-bar"
        label="Search"
        variant="outlined"
        size="small"
        fullWidth
        onChange={handleSearch}
        value={state.settingsTabs.columnSearchTerm}
      />
      <FilterHelperText helperText={state.settingsTabs.columnSearchTerm} />
    </div>
  );
});

const FilterHelperText = observer(({ helperText }: { helperText: string }) => {
  if (helperText.length > 50) helperText = helperText.substring(0, 50) + "...";
  return (
    <div className="search-filter-helper-text">
      {helperText && (
        <Typography variant="body2" color="textSecondary" id="column-search-term">
          <span style={{ color: "red" }}>Filtered For: &quot;{helperText}&quot;</span>
        </Typography>
      )}
    </div>
  );
});
