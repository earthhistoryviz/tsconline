import { observer } from "mobx-react-lite";
import React, { useContext, useState, useEffect, useRef } from "react";
import Typography from "@mui/material/Typography";
import { context } from "../state";
import { ColumnInfo } from "@tsconline/shared";
import { Box, IconButton, TextField } from "@mui/material";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import { ColumnContainer, TSCCheckbox, Accordion, CustomTooltip, Lottie } from "../components";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";

import { ColumnMenu } from "./column_menu/ColumnMenu";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTheme } from "@mui/material/styles";
import { Tooltip } from "@mui/material";
import "./Column.css";
import { checkIfDataIsInRange } from "../util/util";
import { setExpanded } from "../state/actions";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ExpandIcon from "@mui/icons-material/Expand";
import CompressIcon from "@mui/icons-material/Compress";
import DarkArrowUpIcon from "../assets/icons/dark-arrow-up.json";
import LightArrowUpIcon from "../assets/icons/light-arrow-up.json";
import { useTranslation } from "react-i18next";

// column with generate button, and accordion columns
export const Column = observer(function Column() {
  return (
    <div className="column-top-level-container">
      <ColumnSearchBar />
      <div className="column-accordion-and-menu-container">
        <ColumnDisplay />
        <ColumnMenu />
      </div>
    </div>
  );
});

export const ColumnDisplay = observer(() => {
  const { state, actions } = useContext(context);
  const [showScroll, setShowScroll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  // Below scroll features refers to code for button that scrolls to top of settings page when it is clicked
  const handleScroll = () => {
    if (scrollRef.current && scrollRef.current.scrollTop > 200) {
      setShowScroll(true);
    } else {
      setShowScroll(false);
    }
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (ref) {
        ref.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);
  return (
    <Box
      id="ResizableColumnAccordionWrapper"
      ref={scrollRef}
      border={1}
      borderColor="divider"
      bgcolor="secondaryBackground.main"
      className={`hide-scrollbar column-accordion-wrapper ${state.settingsTabs.columnSearchTerm ? "filtered-border" : ""}`}
      position="relative">
      <div className="column-filter-buttons">
        <CustomTooltip title="Expand All" placement="top">
          <IconButton
            disableRipple
            className="expand-collapse-column-buttons"
            onClick={() => {
              if (!state.settingsTabs.columns) return;
              actions.setExpansionOfAllChildren(state.settingsTabs.columns, true);
            }}>
            <ExpandIcon />
          </IconButton>
        </CustomTooltip>
        <CustomTooltip title="Collapse All" placement="top">
          <IconButton
            disableRipple
            className="expand-collapse-column-buttons"
            onClick={() => {
              if (!state.settingsTabs.columns) return;
              actions.setExpansionOfAllChildren(state.settingsTabs.columns, false);
            }}>
            <CompressIcon />
          </IconButton>
        </CustomTooltip>
      </div>
      {state.settingsTabs.columns &&
        Object.entries(state.settingsTabs.columns.children).map(([childName, childDetails]) => (
          <ColumnAccordion key={childName} details={childDetails} />
        ))}
      {/* Button to take users to top of column menu when scrolling */}

      <IconButton onClick={scrollToTop} className={`scroll-to-top-button ${showScroll ? "show" : ""}`}>
        <Lottie
          key="settings-arrow-up"
          style={{ width: "28px", height: "28px" }}
          animationData={theme.palette.mode === "light" ? DarkArrowUpIcon : LightArrowUpIcon}
          playOnClick
        />
      </IconButton>
    </Box>
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
  const selectedClass = details.name === state.columnMenu.columnSelected ? "selected-column" : "";
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
  const containsSelectedChild = details.children.some((column) => column.name === state.columnMenu.columnSelected)
    ? { opacity: 1 }
    : {};
  return (
    <div className="column-accordion-container">
      {details.expanded && (
        <Box className="accordion-line" style={containsSelectedChild} bgcolor="accordionLine.main" />
      )}
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
              color="icon"
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
  const { t } = useTranslation();
  const theme = useTheme();
  const dataInrange = checkIfDataIsInRange(
    column.minAge,
    column.maxAge,
    state.settings.timeSettings[column.units]?.topStageAge || 0,
    state.settings.timeSettings[column.units]?.baseStageAge || 0
  );
  const tooltipOrCheckBox =
    !dataInrange && !(column.name === "Ma" || column.name === "Root") ? (
      <Tooltip
        title={t("settings.column.tooltip.not-in-range")}
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
    actions.searchColumns(term);
  };
  const { t } = useTranslation();
  return (
    <div className="column-search-bar-container">
      <TextField
        className="column-search-bar"
        label={t("settings.search.search-bar")}
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
