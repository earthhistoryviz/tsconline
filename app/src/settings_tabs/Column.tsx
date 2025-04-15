import { observer } from "mobx-react-lite";
import React, { useContext, useState, useEffect, useRef, createContext } from "react";
import Typography from "@mui/material/Typography";
import { ColumnInfo } from "@tsconline/shared";
import { Box, Button, Dialog, DialogContent, IconButton, Radio, RadioGroup, TextField } from "@mui/material";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import { ColumnContainer, TSCCheckbox, Accordion, CustomTooltip, Lottie, StyledScrollbar } from "../components";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { ColumnMenu } from "./column_menu/ColumnMenu";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Theme, styled, useTheme } from "@mui/material/styles";
import { Tooltip } from "@mui/material";
import "./Column.css";
import { checkIfDataIsInRange, checkIfDccColumn } from "../util/util";
import { setExpanded } from "../state/actions";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ExpandIcon from "@mui/icons-material/Expand";
import CompressIcon from "@mui/icons-material/Compress";
import DarkArrowUpIcon from "../assets/icons/dark-arrow-up.json";
import LightArrowUpIcon from "../assets/icons/light-arrow-up.json";
import { useTranslation } from "react-i18next";
import { checkIfDccDataIsInRange } from "../state/actions/util-actions";
import { CrossPlotTimeSettings, TimeSettings } from "../types";
import { context } from "../state";
import AddIcon from '@mui/icons-material/Add';
import BarChartIcon from "@mui/icons-material/BarChart";
import JoinInnerIcon from "@mui/icons-material/JoinInner";
import Settings from "@mui/icons-material/Settings";
import { OverlayColumnAccordion } from "./advanced_settings/OverlaySettings";
import { FormLabel } from "react-bootstrap";

type ColumnContextType = {
  state: {
    columns: ColumnInfo | undefined;
    columnSearchTerm: string;
    columnSelected: string | null;
    timeSettings:
      | {
          [unit: string]: CrossPlotTimeSettings;
        }
      | TimeSettings;
  };
  actions: {
    setColumnSelected: (name: string) => void;
    toggleSettingsTabColumn: (column: ColumnInfo) => void;
  };
};
export const ColumnContext = createContext<ColumnContextType>({
  state: {
    columns: undefined,
    columnSearchTerm: "",
    columnSelected: "",
    timeSettings: {} as TimeSettings
  },
  actions: {
    setColumnSelected: () => {},
    toggleSettingsTabColumn: () => {}
  }
});

// column with generate button, and accordion columns
export const Column = observer(function Column() {
  const [menuOpen, setMenuOpen] = useState(true);
  const { state } = useContext(context);

  return (
    <>
      <div className="column-top-level-container">
        <ColumnSearchBar />
        <div className="column-accordion-and-menu-container">
          <div>
            {state.settingsTabs.columns && (
              <Button startIcon={<AddIcon />} className="add-icon" variant="text" onClick={() => setMenuOpen(true)}>
                Create Custom Column
              </Button>
            )}
            <ColumnDisplay />
          </div>
          <ColumnMenu />
        </div>
      </div>
      <CustomColumnsMenu open={menuOpen} />
    </>
  );
});

type CustomColumnsMenuProps = {
  open: boolean;
};

export const CustomColumnsMenu: React.FC<CustomColumnsMenuProps> = observer(function CustomColumnsMenu({ open }) {
  const { state } = useContext(context);
  const theme = useTheme();
  const CustomColumnPanel = styled(Box)(({ theme }: { theme: Theme }) => ({
    backgroundColor: theme.palette.secondaryBackground.main,
    flex: 1,
    border: "1px solid black",
    minWidth: 0
  }));
  const icons = [BarChartIcon, JoinInnerIcon, Settings];

  return (
    <Dialog open={open} maxWidth="xl" fullWidth PaperProps={{ className: "custom-columns-menu-paper" }}>
      <DialogContent>
        <Box display="grid" height="100%">
          <Box gridRow="1" gridColumn="1" display="flex" alignItems="center" justifyContent="center">
            <Box className="custom-columns-menu-black-line" />
          </Box>
          <Box display="flex" justifyContent="space-between" gridRow="1" gridColumn="1">
            {icons.map((Icon, index) => (
              <Box
                key={index}
                className="custom-columns-menu-icon"
                sx={{
                  backgroundColor: theme.palette.button.main
                }}>
                <Icon />
              </Box>
            ))}
          </Box>
          <Box gridRow="2" gridColumn="1" display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" textAlign="center" flex={1}>
              Select a Base Column
            </Typography>
            <Typography variant="h6" textAlign="center" flex={1}>
              Select a Type of Column
            </Typography>
            <Typography variant="h6" textAlign="center" flex={1}>
              Customize Your Column
            </Typography>
          </Box>
        </Box>
        <Box gridRow="3" gridColumn="1" display="flex" justifyContent="space-between" height="70vh" gap={3}>
          <CustomColumnPanel>
            <StyledScrollbar>
              <OverlayColumnAccordion column={state.settingsTabs.columns} />
            </StyledScrollbar>
          </CustomColumnPanel>
          <CustomColumnPanel height="40%">
            <RadioGroup>
              <Radio defaultChecked/>
              <div>
                <FormLabel
              </div>
            </RadioGroup>
          </CustomColumnPanel>
          <CustomColumnPanel></CustomColumnPanel>
        </Box>
      </DialogContent>
    </Dialog>
  );
});

export const ColumnDisplay = observer(() => {
  const { state } = useContext(ColumnContext);
  const { actions: globalActions } = useContext(context);
  const [showScroll, setShowScroll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  console.log("state.columnSelected", state.columnSelected);
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
      className={`hide-scrollbar column-accordion-wrapper ${state.columnSearchTerm ? "filtered-border" : ""}`}
      position="relative">
      <div className="column-filter-buttons">
        <CustomTooltip title="Expand All" placement="top">
          <IconButton
            disableRipple
            className="expand-collapse-column-buttons"
            onClick={() => {
              if (!state.columns) return;
              globalActions.setExpansionOfAllChildren(state.columns, true);
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
              globalActions.setExpansionOfAllChildren(state.columns, false);
            }}>
            <CompressIcon />
          </IconButton>
        </CustomTooltip>
      </div>
      {state.columns &&
        Object.entries(state.columns.children).map(([childName, childDetails]) => (
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
  const { actions, state } = useContext(ColumnContext);
  if (!details.show) {
    return null;
  }
  const selectedClass = details.name === state.columnSelected ? "selected-column" : "";
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
  const containsSelectedChild = details.children.some((column) => column.name === state.columnSelected)
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
