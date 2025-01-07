import { context } from "../../state";
import { ColumnInfo, assertEventSettings, assertPointSettings } from "@tsconline/shared";
import { ColumnContainer, TSCCheckbox, Accordion, CustomTooltip, Lottie  } from "../../components";
import { Box, Tooltip, Typography, useTheme, IconButton  } from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { dualColCompPrefix } from "../../util/constant";
import ExpandIcon from "@mui/icons-material/Expand";
import CompressIcon from "@mui/icons-material/Compress";
import DarkArrowUpIcon from "../../assets/icons/dark-arrow-up.json";
import LightArrowUpIcon from "../../assets/icons/light-arrow-up.json";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import { checkIfDataIsInRange, checkIfDccColumn, checkIfDccDataIsInRange } from "../../util/util";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import "./OverlaySettings.css";
type OverlaySettingsProps = {
  column: ColumnInfo;
};
export const OverlaySettings: React.FC<OverlaySettingsProps> = observer(({ column }) => {
  if (column.columnDisplayType === "Point") {
    assertPointSettings(column.columnSpecificSettings);
  } else if (column.columnDisplayType === "Event") {
    assertEventSettings(column.columnSpecificSettings);
  } else {
    return;
  }
  const { state, actions } = useContext(context);
  const { t } = useTranslation();
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
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <Box sx={{ width: "300px" }}>
        <Typography>Dual Column Comparisons</Typography>
        <Typography sx={{ maxWidth: "300px", overflowY: "auto" }}>
          {column.columnSpecificSettings.drawDualColCompColumn?.split(":")[1]}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <TSCCheckbox
            checked={state.settingsTabs.columnHashMap.get(dualColCompPrefix + column.name) !== undefined}
            className="overlay-checkbox"
            onClick={(event) => {
              if (!state.settingsTabs.columnHashMap.get(dualColCompPrefix + column.name)) {
                actions.addDualColCompColumn(column);
              } else {
                actions.removeDualColCompColumn(column);
              }
            }}
          />
          <Typography>Overlay</Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Typography>Choose Second Column</Typography>
        <Box
          id="DccColumnAccordionWrapper"
          ref={scrollRef}
          border={1}
          borderColor="divider"
          bgcolor="secondaryBackground.main"
          className={`hide-scrollbar dcc-accordion-wrapper ${state.settingsTabs.columnSearchTerm ? "filtered-border" : ""}`}
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
            Object.entries(state.settingsTabs.columns.children).map(([childName, childColumn]) => (
              <ColumnAccordion key={childName} column={childColumn} />
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
      </Box>
    </Box>
  );
});

type ColumnAccordionProps = {
  column: ColumnInfo;
};

const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(({ column }) => {
  const { actions, state } = useContext(context);
  const [expanded, setExpanded] = useState(column.expanded);
  const { t } = useTranslation();
  const theme = useTheme();

  if (!column.show) {
    return null;
  }
  //const selectedClass = details.name === state.columnMenu.columnSelected ? "selected-column" : "";
  const selectedClass = "";

  const dataInRange = checkIfDccColumn(column)
    ? checkIfDccDataIsInRange(
        column,
        state.settings.timeSettings[column.units].topStageAge,
        state.settings.timeSettings[column.units].baseStageAge
      )
    : checkIfDataIsInRange(
        column.minAge,
        column.maxAge,
        state.settings.timeSettings[column.units].topStageAge,
        state.settings.timeSettings[column.units].baseStageAge
      );

  // if there are no children, don't make an accordion
  if (column.children.length == 0) {
    return (
      <div
        className={`column-leaf-row-container ${selectedClass}`}
        onClick={() => {
          if (column.columnDisplayType !== "Event" && column.columnDisplayType !== "Point") {
            return;
          }
          if (!state.columnMenu.columnSelected) {
            return;
          }
          const refColumn = state.settingsTabs.columnHashMap.get(state.columnMenu.columnSelected);
          if (!refColumn) {
            return;
          }
          if (refColumn.columnDisplayType === "Point") {
            assertPointSettings(refColumn.columnSpecificSettings);
          } else if (refColumn.columnDisplayType === "Event") {
            assertEventSettings(refColumn.columnSpecificSettings);
          } else {
            return;
          }
          refColumn.columnSpecificSettings.drawDualColCompColumn =
            `class datastore.${column.columnDisplayType}Column:` + column.name;
        }}
        tabIndex={0}>
        <ColumnContainer
          className={
            column.columnDisplayType !== "Event" && column.columnDisplayType !== "Point"
              ? "dcc-column-leaf-not-allowed"
              : "dcc-column-leaf"
          }>
          {!dataInRange && !(column.name === "Ma" || column.name === "Root") && (
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
          )}
          <Typography
            className={
              column.columnDisplayType !== "Event" && column.columnDisplayType !== "Point"
                ? "dcc-not-allowed"
                : "column-display-name"
            }>
            {column.editName}
          </Typography>
        </ColumnContainer>
      </div>
    );
  }
  // for keeping the selected column hierarchy line highlighted
  // const containsSelectedChild = details.children.some((column) => column.name === state.columnMenu.columnSelected)
  //   ? { opacity: 1 }
  //   : {};
  const containsSelectedChild = {};
  return (
    <div className="dcc-accordion-container">
      {expanded && <Box className="accordion-line" style={containsSelectedChild} bgcolor="accordionLine.main" />}
      <Accordion
        //checks if column name is in expand list
        expanded={expanded}
        className="column-accordion">
        <MuiAccordionSummary
          onClick={() => {}}
          tabIndex={0}
          expandIcon={
            <ArrowForwardIosSharpIcon
              color="icon"
              sx={{ fontSize: "0.9rem" }}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            />
          }
          aria-controls="panel-content"
          className={`column-accordion-summary ${selectedClass}`}>
          <ColumnContainer
            className="column-row-container"
            sx={{
              cursor: column.columnDisplayType !== "Event" && column.columnDisplayType !== "Point" ? "default" : ""
            }}
            onClick={() => setExpanded(!expanded)}>
            <Typography className="column-display-name">{column.editName}</Typography>
          </ColumnContainer>
        </MuiAccordionSummary>
        <MuiAccordionDetails className="column-accordion-details">
          {column.children &&
            Object.entries(column.children).map(([childName, childColumn]) => (
              <ColumnAccordion key={childName} column={childColumn} />
            ))}
        </MuiAccordionDetails>
      </Accordion>
    </div>
  );
});
