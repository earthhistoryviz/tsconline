import { context } from "../../state";
import { ColumnInfo, assertEventSettings, assertPointSettings } from "@tsconline/shared";
import { ColumnContainer, TSCCheckbox, Lottie, StyledScrollbar, CustomDivider, Accordion } from "../../components";
import { Box, Tooltip, Typography, useTheme, IconButton } from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import DarkArrowUpIcon from "../../assets/icons/dark-arrow-up.json";
import LightArrowUpIcon from "../../assets/icons/light-arrow-up.json";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";

import {
  checkIfDataIsInRange,
  checkIfDccColumn,
  discardTscPrefix,
  prependDualColCompColumnName
} from "../../util/util";
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
    <StyledScrollbar>
      <Box className="data-mining-settings-container">
        <Typography className="advanced-settings-header" variant="h6">
          {t("settings.column.overlay-menu.title")}
        </Typography>
        <CustomDivider className="settings-header-divider" />
        <div className="overlay-settings-content">
          <Box className="overlay-settings-container">
            <Box className="overlay-name-and-checkbox">
              <Typography>{t("settings.column.overlay-menu.current-overlay")}</Typography>
              {column.columnSpecificSettings.drawDualColCompColumn ? (
                <Typography className="overlay-name">
                  {discardTscPrefix(column.columnSpecificSettings.drawDualColCompColumn)}
                </Typography>
              ) : (
                <Typography className="empty-overlay-name">
                  {t("settings.column.overlay-menu.choose-column-empty")}
                </Typography>
              )}

              <Box className="overlay-checkbox-container">
                <TSCCheckbox
                  checked={
                    state.settingsTabs.columnHashMap.get(prependDualColCompColumnName(column.name)) !== undefined
                  }
                  className="overlay-checkbox"
                  onClick={() => {
                    if (!state.settingsTabs.columnHashMap.get(prependDualColCompColumnName(column.name))) {
                      actions.addDualColCompColumn(column);
                    } else {
                      actions.removeDualColCompColumn(column);
                    }
                  }}
                />
                <Typography>{t("settings.column.overlay-menu.display-overlay")}</Typography>
              </Box>
            </Box>
            <Box>
              <Box
                id="DccColumnAccordionWrapper"
                ref={scrollRef}
                border={1}
                borderColor="divider"
                bgcolor="secondaryBackground.main"
                className={`hide-scrollbar dcc-accordion-wrapper ${state.settingsTabs.columnSearchTerm ? "filtered-border" : ""}`}
                position="relative">
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
        </div>
      </Box>
    </StyledScrollbar>
  );
});

type ColumnAccordionProps = {
  column: ColumnInfo;
};

function checkIfDccDataIsInRange(dccColumn: ColumnInfo, userTopAge: number, userBaseAge: number) {
  const { state } = useContext(context);
  if (userBaseAge <= userTopAge) {
    return false;
  }
  let reachedFirstRef = false;
  while (!reachedFirstRef) {
    if (
      !(
        (dccColumn.minAge <= userTopAge && dccColumn.maxAge >= userBaseAge) ||
        (dccColumn.minAge > userTopAge && dccColumn.minAge < userBaseAge) ||
        (dccColumn.maxAge < userBaseAge && dccColumn.maxAge > userTopAge)
      )
    ) {
      return false;
    }
    if (dccColumn.columnDisplayType === "Event") {
      assertEventSettings(dccColumn.columnSpecificSettings);
    } else if (dccColumn.columnDisplayType === "Point") {
      assertPointSettings(dccColumn.columnSpecificSettings);
    } else {
      console.warn("WARNING: dccColumn is not a valid column type");
      return false;
    }
    //reached end of ref list
    if (!dccColumn.columnSpecificSettings.dualColCompColumnRef) {
      reachedFirstRef = true;
      break;
    }
    const refCol = state.settingsTabs.columnHashMap.get(dccColumn.columnSpecificSettings.dualColCompColumnRef);
    if (!refCol) {
      console.log("WARNING: tried to get reference while checking dcc column, but is undefined");
      return false;
    }
    dccColumn = refCol;
  }
  return true;
}

const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(({ column }) => {
  const { state } = useContext(context);
  const { t } = useTranslation();
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  function getSelectedOverlayColumn(): string | null {
    if (!state.columnMenu.columnSelected) {
      return null;
    }
    const selectedColumn = state.settingsTabs.columnHashMap.get(state.columnMenu.columnSelected);
    if (!selectedColumn) {
      return null;
    }
    if (selectedColumn.columnDisplayType === "Point") {
      assertPointSettings(selectedColumn.columnSpecificSettings);
    } else if (selectedColumn.columnDisplayType === "Event") {
      assertEventSettings(selectedColumn.columnSpecificSettings);
    } else {
      return null;
    }
    return discardTscPrefix(selectedColumn.columnSpecificSettings.drawDualColCompColumn);
  }

  const selectedClass = column.name === getSelectedOverlayColumn() ? "selected-column" : "";

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
          if (
            (column.columnDisplayType !== "Event" && column.columnDisplayType !== "Point") ||
            column.name === state.columnMenu.columnSelected
          ) {
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
        <ColumnContainer className="dcc-column-leaf">
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
              (column.columnDisplayType !== "Event" && column.columnDisplayType !== "Point") ||
              column.name === state.columnMenu.columnSelected
                ? "dcc-not-allowed"
                : "column-display-name"
            }>
            {column.editName}
          </Typography>
        </ColumnContainer>
      </div>
    );
  }
  //for keeping the selected column hierarchy line highlighted
  const containsSelectedChild = column.children.some((column) => column.name === getSelectedOverlayColumn())
    ? { opacity: 1 }
    : {};
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
              opacity: 1,
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
