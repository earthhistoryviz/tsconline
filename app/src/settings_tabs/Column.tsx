import { observer } from "mobx-react-lite";
import React, { useContext, useState, useEffect, useRef, createContext } from "react";
import Typography from "@mui/material/Typography";
import { Box, Button, IconButton, TextField } from "@mui/material";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import { ColumnContainer, TSCCheckbox, Accordion, CustomTooltip, Lottie, StyledScrollbar } from "../components";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { ColumnMenu } from "./column_menu/ColumnMenu";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTheme } from "@mui/material/styles";
import { Tooltip } from "@mui/material";
import "./Column.css";
import { checkIfDataIsInRange, checkIfDccColumn, getChildRenderColumns } from "../util/util";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ExpandIcon from "@mui/icons-material/Expand";
import CompressIcon from "@mui/icons-material/Compress";
import DarkArrowUpIcon from "../assets/icons/dark-arrow-up.json";
import LightArrowUpIcon from "../assets/icons/light-arrow-up.json";
import { useTranslation } from "react-i18next";
import { checkIfDccDataIsInRange } from "../state/actions/util-actions";
import { CrossPlotTimeSettings, RenderColumnInfo, TimeSettings } from "../types";
import { context } from "../state";
import AddIcon from "@mui/icons-material/Add";
import { AddCustomColumnMenu } from "./column_menu/AddCustomColumnMenu";
import loader from "../assets/icons/loading.json";

type ColumnContextType = {
  state: {
    columns: RenderColumnInfo | undefined;
    columnHashMap: Map<string, RenderColumnInfo>;
    columnSearchTerm: string;
    timeSettings:
      | {
          [unit: string]: CrossPlotTimeSettings;
        }
      | TimeSettings;
  };
  actions: {
    setColumnSelected: (name: string) => void;
    toggleSettingsTabColumn: (column: RenderColumnInfo) => void;
  };
};
export const ColumnContext = createContext<ColumnContextType>({
  state: {
    columns: undefined,
    columnHashMap: new Map<string, RenderColumnInfo>(),
    columnSearchTerm: "",
    timeSettings: {} as TimeSettings
  },
  actions: {
    setColumnSelected: () => {},
    toggleSettingsTabColumn: () => {}
  }
});

// column with generate button, and accordion columns
export const Column = observer(function Column() {
  const { state, actions } = useContext(context);
  const { state: columnState } = useContext(ColumnContext);
  const { t } = useTranslation();

  return (
    <>
      <div className="column-top-level-container">
        <ColumnSearchBar />
        <div className="column-accordion-and-menu-container">
          <div className="add-icon-and-menu-container">
            <div>
              <Button
                startIcon={<AddIcon />}
                className="add-icon"
                variant="text"
                onClick={() => actions.setCustomColumnMenuOpen(true)}>
                {t("settings.column.create-custom-column-button")}
              </Button>
            </div>
            <div className="column-display-container">
              <ColumnDisplay />
            </div>
          </div>
          <ColumnMenu />
        </div>
      </div>
      {state.addCustomColumnMenu.open && (
        <StyledScrollbar>
          <AddCustomColumnMenu onClose={() => actions.setCustomColumnMenuOpen(false)} column={columnState.columns} />
        </StyledScrollbar>
      )}
    </>
  );
});

export const ColumnDisplay = observer(() => {
  const { state } = useContext(ColumnContext);
  const { state: globalState, actions: globalActions } = useContext(context);
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
  const isLoading = globalState.settingsTabs.showColumnSearchLoader;
  return (
    <Box
      id="ResizableColumnAccordionWrapper"
      ref={scrollRef}
      border={1}
      borderColor="divider"
      bgcolor="secondaryBackground.main"
      className={`hide-scrollbar column-accordion-wrapper ${state.columnSearchTerm ? "filtered-border" : ""}`}
      position="relative"
      display={isLoading ? "flex" : undefined}
      justifyContent={isLoading ? "center" : undefined}
      alignItems={isLoading ? "center" : undefined}>
      {isLoading && <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />}
      {/* keep accordion in DOM to avoid lag when remounting after loading */}
      <div style={{ display: isLoading ? "none" : "block" }}>
        <div className="column-filter-buttons">
          <CustomTooltip title="Expand All" placement="top">
            <IconButton
              disableRipple
              className="expand-collapse-column-buttons"
              onClick={() => {
                if (!state.columns) return;
                globalActions.setExpansionOfAllChildren(state.columns, state.columnHashMap, true);
              }}>
              <ExpandIcon />
            </IconButton>
          </CustomTooltip>
          <CustomTooltip title="Collapse All" placement="top">
            <IconButton
              disableRipple
              className="expand-collapse-column-buttons"
              onClick={() => {
                if (!state.columns) return;
                globalActions.setExpansionOfAllChildren(state.columns, state.columnHashMap, false);
              }}>
              <CompressIcon />
            </IconButton>
          </CustomTooltip>
        </div>
        {state.columns &&
          getChildRenderColumns(state.columns, state.columnHashMap).map((column) => (
            <ColumnAccordion key={column.name} details={column} />
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
      </div>
    </Box>
  );
});

type ColumnAccordionProps = {
  details: RenderColumnInfo;
};

const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(({ details }) => {
  const { actions, state } = useContext(ColumnContext);
  const { actions: globalActions } = useContext(context);
  if (!details.show) {
    return null;
  }
  const selectedClass = details.isSelected ? "selected-column" : "";
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
  const containsSelectedChild = details.hasSelectedChildren ? { opacity: 1 } : {};
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
                globalActions.setExpanded(!details.expanded, details);
              }}
            />
          }
          aria-controls="panel-content"
          className={`column-accordion-summary ${selectedClass}`}>
          <ColumnIcon column={details} />
        </MuiAccordionSummary>
        <MuiAccordionDetails className="column-accordion-details">
          {details.expanded &&
            getChildRenderColumns(details, state.columnHashMap).map((column) => {
              return <ColumnAccordion key={column.name} details={column} />;
            })}
        </MuiAccordionDetails>
      </Accordion>
    </div>
  );
});

const ColumnIcon = observer(({ column }: { column: RenderColumnInfo }) => {
  const { state, actions } = useContext(ColumnContext);
  const { t } = useTranslation();
  const theme = useTheme();
  // todo fix this for crossplot
  const dataInRange = checkIfDccColumn(column)
    ? checkIfDccDataIsInRange(
        column,
        state.timeSettings[column.units].topStageAge,
        state.timeSettings[column.units].baseStageAge
      )
    : checkIfDataIsInRange(
        column.minAge,
        column.maxAge,
        state.timeSettings[column.units].topStageAge,
        state.timeSettings[column.units].baseStageAge
      );
  const tooltipOrCheckBox =
    !dataInRange && !(column.name === "Ma" || column.name === "Root") ? (
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
  const { state } = useContext(ColumnContext);
  const { actions: globalActions } = useContext(context);
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    globalActions.searchColumns(term);
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
        value={state.columnSearchTerm}
        autoComplete="off"
      />
      <FilterHelperText helperText={state.columnSearchTerm} />
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
