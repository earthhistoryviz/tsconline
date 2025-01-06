import {
  ColumnInfo,
  assertEventSettings,
  assertPointSettings,
  isEventFrequency,
  isDataMiningPointDataType,
  assertDataMiningSettings,
  assertChronSettings,
  isDataMiningChronDataType
} from "@tsconline/shared";
import { ColumnContainer, CustomDivider, GenericTextField, StyledScrollbar, TSCCheckbox } from "../../components";
import { Box, Button, Dialog, Tooltip, Typography, useTheme } from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import "./DataMiningSettings.css";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";
import { context } from "../../state";
import { useTranslation } from "react-i18next";
import { dualColCompPrefix } from "../../util/constant";

type DataMiningSettingsProps = {
  column: ColumnInfo;
};
export const DataMiningModal: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  const [openMenu, setOpenMenu] = useState(false);
  const { t } = useTranslation();
  if (column.columnDisplayType !== "Event" && column.columnDisplayType !== "Point") return;
  return (
    <div>
      <Button onClick={() => setOpenMenu(true)} variant="contained">
        {t("settings.column.datamining-menu.title")}
      </Button>
      <Dialog open={openMenu} onClose={() => setOpenMenu(false)}>
        <DataMiningSettings column={column} />
      </Dialog>
    </div>
  );
});

export const DataMiningSettings: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  const dataMiningSettings = column.columnSpecificSettings;
  if (!dataMiningSettings) return;
  assertDataMiningSettings(dataMiningSettings);
  return (
    <StyledScrollbar>
      <Box className="data-mining-settings-container">
        <Typography className="advanced-settings-header" variant="h6">
          {t("settings.column.datamining-menu.title")}
        </Typography>
        <CustomDivider className="settings-header-divider" />
        <div className="data-mining-settings-content">
          <GenericTextField
            inputs={[
              {
                helperText: t("settings.column.datamining-menu.window-size"),
                id: "windowSize",
                value: dataMiningSettings.windowSize,
                onValueChange: (value) => {
                  actions.setDataMiningSettings(dataMiningSettings, { windowSize: value });
                }
              },
              {
                helperText: t("settings.column.datamining-menu.step-size"),
                id: "stepSize",
                value: dataMiningSettings.stepSize,
                onValueChange: (value) => {
                  actions.setDataMiningSettings(dataMiningSettings, { stepSize: value });
                }
              }
            ]}
          />
          <EventDataMiningOptions column={column} />
          <PointDataMiningOptions column={column} />
          <ChronDataMiningOptions column={column} />
          <OverlaySettings column={column} />
        </div>
      </Box>
    </StyledScrollbar>
  );
});
export const ChronDataMiningOptions: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  if (column.columnDisplayType !== "Chron") return;
  const chronSettings = column.columnSpecificSettings;
  assertChronSettings(chronSettings);
  const handleFrequencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDataMiningChronDataType(event.target.value)) return;
    if (chronSettings.dataMiningChronDataType !== null) {
      actions.removeDataMiningColumn(column, chronSettings.dataMiningChronDataType);
    }
    actions.setChronColumnSettings(chronSettings, { dataMiningChronDataType: event.target.value });
    actions.addDataMiningColumn(column, event.target.value);
  };
  const clearDataMiningColumn = () => {
    if (chronSettings.dataMiningChronDataType === null) return;
    actions.removeDataMiningColumn(column, chronSettings.dataMiningChronDataType);
    actions.setChronColumnSettings(chronSettings, { dataMiningChronDataType: null });
  };
  return (
    <Box className="data-mining-type-container">
      <TSCRadioGroup
        onChange={handleFrequencyChange}
        onClear={clearDataMiningColumn}
        name={t("settings.column.datamining-menu.options-title.chron")}
        value={chronSettings.dataMiningChronDataType}
        radioArray={[{ value: "Frequency", label: t("settings.column.datamining-menu.options.frequency") }]}
      />
    </Box>
  );
});
export const EventDataMiningOptions: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  if (column.columnDisplayType !== "Event") return;
  const eventSettings = column.columnSpecificSettings;
  assertEventSettings(eventSettings);
  const handleFrequencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEventFrequency(event.target.value)) return;
    if (eventSettings.frequency !== null) actions.removeDataMiningColumn(column, eventSettings.frequency);
    actions.setEventColumnSettings(eventSettings, { frequency: event.target.value });
    actions.addDataMiningColumn(column, event.target.value);
  };
  const clearDataMiningColumn = () => {
    if (eventSettings.frequency === null) return;
    actions.removeDataMiningColumn(column, eventSettings.frequency);
    actions.setEventColumnSettings(eventSettings, { frequency: null });
  };
  return (
    <Box className="data-mining-type-container">
      <TSCRadioGroup
        onChange={handleFrequencyChange}
        onClear={clearDataMiningColumn}
        name={t("settings.column.datamining-menu.options-title.event")}
        value={eventSettings.frequency}
        radioArray={[
          { value: "FAD", label: t("settings.column.datamining-menu.options.freq-of-FAD") },
          { value: "LAD", label: t("settings.column.datamining-menu.options.freq-of-LAD") },
          { value: "Combined Events", label: t("settings.column.datamining-menu.options.combined-events") }
        ]}
      />
    </Box>
  );
});

export const PointDataMiningOptions: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  if (column.columnDisplayType !== "Point") return;
  const pointSettings = column.columnSpecificSettings;
  assertPointSettings(pointSettings);
  const handleDataTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDataMiningPointDataType(event.target.value)) return;
    if (pointSettings.dataMiningPointDataType !== null)
      actions.removeDataMiningColumn(column, pointSettings.dataMiningPointDataType);
    actions.setPointColumnSettings(pointSettings, { dataMiningPointDataType: event.target.value });
    actions.addDataMiningColumn(column, event.target.value);
  };
  const clearDataMiningColumn = () => {
    if (pointSettings.dataMiningPointDataType === null) return;
    actions.removeDataMiningColumn(column, pointSettings.dataMiningPointDataType);
    actions.setPointColumnSettings(pointSettings, { dataMiningPointDataType: null });
  };
  return (
    <Box className="data-mining-type-container">
      <TSCRadioGroup
        onChange={handleDataTypeChange}
        onClear={clearDataMiningColumn}
        name={t("settings.column.datamining-menu.options-title.plot")}
        value={pointSettings.dataMiningPointDataType}
        radioArray={[
          { value: "Frequency", label: t("settings.column.datamining-menu.options.frequency") },
          { value: "Maximum Value", label: t("settings.column.datamining-menu.options.max-val") },
          { value: "Minimum Value", label: t("settings.column.datamining-menu.options.min-val") },
          { value: "Average Value", label: t("settings.column.datamining-menu.options.avg-val") },
          { value: "Rate of Change", label: t("settings.column.datamining-menu.options.roc") }
        ]}
      />
    </Box>
  );
});

export const OverlaySettings: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
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
      <Box>
        <Typography>Dual Column Comparisons</Typography>
        <Typography sx={{ maxWidth: "300px", overflowY: "auto" }}>
          {column.columnSpecificSettings.drawDualColCompColumn?.split(":")[1]}
        </Typography>
        <TSCCheckbox
        checked={state.settingsTabs.columnHashMap.get(dualColCompPrefix + column.name) !== undefined}
        className="overlay-checkbox"
        onClick={(event) => {
          if (!state.settingsTabs.columnHashMap.get(dualColCompPrefix + column.name)) {
            actions.addDualColCompColumn(column);
          }
          else {
            actions.removeDualColCompColumn(column);
          }
        }}
      />
      <Typography>Overlay</Typography>
      </Box>
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
  );
});
import { IconButton } from "@mui/material";
import ExpandIcon from "@mui/icons-material/Expand";
import CompressIcon from "@mui/icons-material/Compress";
import DarkArrowUpIcon from "../../assets/icons/dark-arrow-up.json";
import LightArrowUpIcon from "../../assets/icons/light-arrow-up.json";
import { Accordion, CustomTooltip, Lottie } from "../../components";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import { checkIfDataIsInRange } from "../../util/util";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

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

  const dataInrange = checkIfDataIsInRange(
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
        <ColumnContainer className="column-row-container column-leaf">
          {!dataInrange && !(column.name === "Ma" || column.name === "Root") && (
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
          <Typography className="column-display-name">{column.editName}</Typography>
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
          onClick={() => {
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
          <ColumnContainer className="column-row-container">
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
