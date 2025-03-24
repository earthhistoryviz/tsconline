import { context } from "../../state";
import { ColumnInfo, assertEventSettings, assertPointSettings } from "@tsconline/shared";
import { ColumnContainer, TSCCheckbox, Lottie, StyledScrollbar, CustomDivider, Accordion } from "../../components";
import { Box, Typography, useTheme, IconButton } from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import DarkArrowUpIcon from "../../assets/icons/dark-arrow-up.json";
import LightArrowUpIcon from "../../assets/icons/light-arrow-up.json";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { CustomTooltip } from "../../components";
import { discardTscPrefix, prependDualColCompColumnName } from "../../util/util";
import "./OverlaySettings.css";
type OverlaySettingsProps = {
  column: ColumnInfo;
};

function getSelectedOverlayColumn(): string | null {
  const { state } = useContext(context);
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
              <Box>
                <Typography>{t("settings.column.overlay-menu.overlay-column-header")}</Typography>
                {column.columnSpecificSettings.drawDualColCompColumn ? (
                  <Typography
                    sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      padding: "2px 5px"
                    }}
                    className="overlay-name">
                    {discardTscPrefix(column.columnSpecificSettings.drawDualColCompColumn)}
                  </Typography>
                ) : (
                  <Typography
                    color="gray"
                    sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      padding: "2px 5px"
                    }}>
                    {t("settings.column.overlay-menu.column-not-selected")}
                  </Typography>
                )}
                <Typography>{t("settings.column.overlay-menu.overlay-column-preposition")}</Typography>
                <Typography
                  style={{
                    border: `1px solid ${theme.palette.divider}`,
                    padding: "2px 5px"
                  }}
                  className="overlay-name">
                  {state.columnMenu.columnSelected}
                </Typography>
              </Box>
              <Box className="overlay-checkbox-container">
                <TSCCheckbox
                  checked={
                    state.settingsTabs.columnHashMap.get(prependDualColCompColumnName(column.name)) !== undefined
                  }
                  className="overlay-checkbox"
                  disabled={getSelectedOverlayColumn() !== "" ? false : true}
                  onClick={() => {
                    if (!state.settingsTabs.columnHashMap.get(prependDualColCompColumnName(column.name))) {
                      const dccName = actions.addDualColCompColumn(column);
                      if (dccName && state.settingsTabs.columnHashMap.get(dccName)) {
                        actions.toggleSettingsTabColumn(state.settingsTabs.columnHashMap.get(dccName)!);
                      }
                    } else {
                      actions.removeDualColCompColumn(column);
                    }
                  }}
                />
                {getSelectedOverlayColumn() !== "" ? (
                  <Typography>{t("settings.column.overlay-menu.display-overlay")}</Typography>
                ) : (
                  <Typography color={"gray"}>{t("settings.column.overlay-menu.display-overlay")}</Typography>
                )}
              </Box>
            </Box>
            <Box className="dcc-accordion-and-caption">
              <Typography variant="caption" className="dcc-accordion-caption">
                {t("settings.column.overlay-menu.overlay-accordion-caption")}
              </Typography>
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

const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(({ column }) => {
  const { state } = useContext(context);
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  const selectedClass = column.name === getSelectedOverlayColumn() ? "selected-column" : "";

  //column can be chosen for overlay column
  const validForOverlay = column.columnDisplayType == "Event" || column.columnDisplayType == "Point";

  // if there are no children, don't make an accordion
  if (column.children.length == 0) {
    const ValidOverlay = () => (
      <ColumnContainer
        sx={{
          cursor: "pointer"
        }}
        className="dcc-column-leaf">
        <Typography className="column-display-name">{column.editName}</Typography>
      </ColumnContainer>
    );
    const NotValidOverlay = () => (
      <CustomTooltip
        title={t("settings.column.overlay-menu.invalid-column-mouseover")}
        placement="left"
        offset={[0, 10]}>
        <ColumnContainer
          sx={{
            opacity: 1,
            cursor: "default"
          }}
          className="dcc-column-leaf">
          <Typography className="dcc-not-allowed column-display-name">{column.editName}</Typography>
        </ColumnContainer>
      </CustomTooltip>
    );
    return (
      <div
        className={`column-leaf-row-container ${selectedClass}`}
        onClick={() => {
          if (!validForOverlay || !state.columnMenu.columnSelected) {
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
        {validForOverlay ? <ValidOverlay /> : <NotValidOverlay />}
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
          tabIndex={0}
          expandIcon={<ArrowForwardIosSharpIcon color="icon" sx={{ fontSize: "0.9rem" }} />}
          onClick={(e) => {
            setExpanded(!expanded);
            e.stopPropagation();
          }}
          aria-controls="panel-content"
          className={`column-accordion-summary ${selectedClass}`}>
          <ColumnContainer className="column-row-container" onClick={() => setExpanded(!expanded)}>
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
