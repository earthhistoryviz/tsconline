import { observer } from "mobx-react-lite";
import React, { useContext, useEffect, useRef, createContext, useMemo, useCallback } from "react";
import Typography from "@mui/material/Typography";
import { Box, IconButton, InputAdornment, TextField } from "@mui/material";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import { ColumnContainer, TSCCheckbox, Accordion, CustomTooltip, Lottie, StyledScrollbar } from "../components";
import LayersClearOutlinedIcon from "@mui/icons-material/LayersClearOutlined";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { ColumnMenu } from "./column_menu/ColumnMenu";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTheme } from "@mui/material/styles";
import { Tooltip } from "@mui/material";
import "./Column.css";
import { checkIfDataIsInRange, checkIfDccColumn, getChildRenderColumns } from "../util/util";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import DarkArrowUpIcon from "../assets/icons/dark-arrow-up.json";
import LightArrowUpIcon from "../assets/icons/light-arrow-up.json";
import { useTranslation } from "react-i18next";
import { checkIfDccDataIsInRange } from "../state/actions/util-actions";
import { CrossPlotTimeSettings, RenderColumnInfo, TimeSettings } from "../types";
import { context } from "../state";
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

export const Column = observer(function Column() {
  const { state, actions } = useContext(context);
  const { state: columnState } = useContext(ColumnContext);
  const theme = useTheme();

  return (
    <>
      <Box
        className="column-workspace"
        border={1}
        borderColor="divider"
        bgcolor="secondaryBackground.main"
        sx={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          flex: 1,
          minHeight: 0,
          overflow: "hidden"
        }}
        style={
          {
            "--column-selection-accent": theme.palette.selection.main,
            "--column-selection-bg": `${theme.palette.selection.main}18`,
            "--column-hover-bg": theme.palette.action.hover,
            "--column-filter-accent": theme.palette.error.main
          } as React.CSSProperties
        }>
        <aside className="column-sidebar">
          <ColumnSidebarHeader />
          <ColumnSidebarSearch />
          <div className="column-tree-scroll">
            <ColumnDisplay embedded />
          </div>
        </aside>
        <ColumnMenu />
      </Box>
      {state.addCustomColumnMenu.open && (
        <StyledScrollbar>
          <AddCustomColumnMenu onClose={() => actions.setCustomColumnMenuOpen(false)} column={columnState.columns} />
        </StyledScrollbar>
      )}
    </>
  );
});

const ColumnSidebarHeader = observer(() => {
  const { state } = useContext(ColumnContext);
  const { state: globalState, actions: globalActions } = useContext(context);
  const { t } = useTranslation();
  const hideDefaults = globalState.settingsTabs.hideDatapackDefaults;

  return (
    <div className="column-sidebar-header">
      <Typography variant="subtitle2" fontWeight={600} className="column-sidebar-title">
        {t("settings.column.titles.sidebar-title")}
      </Typography>
      <div className="column-sidebar-actions">
        <CustomTooltip title={t("settings.column.hide-default-columns.tooltip")} placement="top">
          <IconButton
            size="small"
            className={`column-sidebar-action ${hideDefaults ? "column-sidebar-action-active" : ""}`}
            onClick={() => globalActions.setHideDatapackDefaults(!hideDefaults)}
            aria-pressed={hideDefaults}
            aria-label={t("settings.column.hide-default-columns.label")}>
            <LayersClearOutlinedIcon fontSize="small" />
          </IconButton>
        </CustomTooltip>
        <CustomTooltip title="Expand All" placement="top">
          <IconButton
            size="small"
            className="column-sidebar-action"
            onClick={() => {
              if (!state.columns) return;
              globalActions.setExpansionOfAllChildren(state.columns, state.columnHashMap, true);
            }}>
            <UnfoldMoreIcon fontSize="small" />
          </IconButton>
        </CustomTooltip>
        <CustomTooltip title="Collapse All" placement="top">
          <IconButton
            size="small"
            className="column-sidebar-action"
            onClick={() => {
              if (!state.columns) return;
              globalActions.setExpansionOfAllChildren(state.columns, state.columnHashMap, false);
            }}>
            <UnfoldLessIcon fontSize="small" />
          </IconButton>
        </CustomTooltip>
        <CustomTooltip title={t("settings.column.create-custom-column-button")} placement="top">
          <IconButton
            size="small"
            className="column-sidebar-action column-sidebar-action-primary"
            onClick={() => globalActions.setCustomColumnMenuOpen(true)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </CustomTooltip>
      </div>
    </div>
  );
});

const ColumnSidebarSearch = observer(() => {
  const { state } = useContext(ColumnContext);
  const { actions: globalActions } = useContext(context);
  const { t } = useTranslation();

  return (
    <div className={`column-sidebar-search ${state.columnSearchTerm ? "column-sidebar-search-filtered" : ""}`}>
      <TextField
        className="column-search-bar"
        placeholder={t("settings.search.search-bar")}
        variant="outlined"
        size="small"
        fullWidth
        onChange={(e) => globalActions.searchColumns(e.target.value)}
        value={state.columnSearchTerm}
        autoComplete="off"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: "icon.main", opacity: 0.7 }} />
            </InputAdornment>
          ),
          endAdornment: state.columnSearchTerm ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => globalActions.searchColumns("")} edge="end" aria-label="clear">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined
        }}
      />
    </div>
  );
});

type ColumnDisplayProps = {
  embedded?: boolean;
};

const ColumnTree = observer(function ColumnTree() {
  const { state } = useContext(ColumnContext);
  if (!state.columns) return null;
  return (
    <div className="column-tree-content">
      {getChildRenderColumns(state.columns, state.columnHashMap).map((column) => (
        <ColumnAccordion key={column.name} details={column} />
      ))}
    </div>
  );
});

export function ColumnDisplay({ embedded = false }: ColumnDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollButtonRef = useRef<HTMLButtonElement>(null);
  const showScrollRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateScrollButton = () => {
      rafRef.current = null;
      const shouldShow = el.scrollTop > 200;
      if (shouldShow === showScrollRef.current) return;
      showScrollRef.current = shouldShow;
      scrollButtonRef.current?.classList.toggle("show", shouldShow);
    };

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(updateScrollButton);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <ColumnDisplaySurface embedded={embedded} scrollRef={scrollRef} />
      <IconButton
        ref={scrollButtonRef}
        onClick={scrollToTop}
        className="scroll-to-top-button"
        size="small"
        aria-label="Scroll to top">
        <ScrollToTopIcon />
      </IconButton>
    </>
  );
}

const ScrollToTopIcon = observer(function ScrollToTopIcon() {
  const theme = useTheme();
  return (
    <Lottie
      key="settings-arrow-up"
      style={{ width: "24px", height: "24px" }}
      animationData={theme.palette.mode === "light" ? DarkArrowUpIcon : LightArrowUpIcon}
      playOnClick
    />
  );
});

const ColumnDisplaySurface = observer(function ColumnDisplaySurface({
  embedded,
  scrollRef
}: {
  embedded: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isLoading = useContext(context).state.settingsTabs.showColumnSearchLoader;
  const wrapperClass = [
    "column-accordion-wrapper",
    embedded ? "column-accordion-embedded" : "",
    isLoading ? "column-accordion-loading" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Box
      ref={scrollRef}
      border={embedded ? 0 : 1}
      borderColor="divider"
      bgcolor={embedded ? "transparent" : "secondaryBackground.main"}
      className={`hide-scrollbar ${wrapperClass}`}
      sx={{
        display: isLoading ? "flex" : "block",
        justifyContent: isLoading ? "center" : undefined,
        alignItems: isLoading ? "center" : undefined,
        height: embedded ? "100%" : undefined,
        minHeight: embedded ? 0 : undefined
      }}>
      {isLoading ? (
        <Lottie animationData={loader} autoplay loop width={160} height={160} speed={0.7} />
      ) : (
        <ColumnTree />
      )}
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

  const containsSelectedChild = details.hasSelectedChildren ? { opacity: 0.55 } : undefined;
  return (
    <div className="column-accordion-container">
      {details.expanded && (
        <Box className="accordion-line" style={containsSelectedChild} bgcolor="accordionLine.main" />
      )}
      <Accordion
        expanded={details.expanded}
        onChange={() => {
          /* expansion is handled by the expand icon only */
        }}
        className="column-accordion">
        <MuiAccordionSummary
          onClick={() => actions.setColumnSelected(details.name)}
          tabIndex={0}
          expandIcon={
            <ArrowForwardIosSharpIcon
              color="icon"
              sx={{ fontSize: "0.75rem", opacity: 0.7 }}
              onClick={(e) => {
                e.stopPropagation();
                globalActions.setExpanded(!details.expanded, details);
              }}
            />
          }
          aria-controls="panel-content"
          className={`column-accordion-summary ${selectedClass}`}>
          <ColumnIcon column={details} isBranch />
        </MuiAccordionSummary>
        <MuiAccordionDetails className="column-accordion-details">
          {details.expanded &&
            getChildRenderColumns(details, state.columnHashMap).map((column) => (
              <ColumnAccordion key={column.name} details={column} />
            ))}
        </MuiAccordionDetails>
      </Accordion>
    </div>
  );
});

const ColumnIcon = observer(({ column, isBranch = false }: { column: RenderColumnInfo; isBranch?: boolean }) => {
  const { state, actions } = useContext(ColumnContext);
  const { t } = useTranslation();
  const theme = useTheme();
  const unitSettings = state.timeSettings[column.units];
  const dataInRange = useMemo(() => {
    if (!unitSettings) return true;
    return checkIfDccColumn(column)
      ? checkIfDccDataIsInRange(column, unitSettings.topStageAge, unitSettings.baseStageAge)
      : checkIfDataIsInRange(column.minAge, column.maxAge, unitSettings.topStageAge, unitSettings.baseStageAge);
  }, [column, unitSettings?.topStageAge, unitSettings?.baseStageAge]);
  const tooltipOrCheckBox =
    !dataInRange && !(column.name === "Ma" || column.name === "Root") ? (
      <Tooltip title={t("settings.column.tooltip.not-in-range")} placement="top" arrow>
        <ErrorOutlineIcon className="column-error-icon" sx={{ color: theme.palette.error.main }} />
      </Tooltip>
    ) : (
      <TSCCheckbox
        checked={column.on}
        className="column-checkbox"
        onClick={(event) => {
          event.stopPropagation();
          actions.toggleSettingsTabColumn(column);
        }}
      />
    );
  return (
    <ColumnContainer className={`column-row-container ${column.children.length > 0 ? "" : "column-leaf"}`}>
      {tooltipOrCheckBox}
      <Typography className={`column-display-name ${isBranch ? "column-display-name-branch" : ""}`}>
        {column.editName}
      </Typography>
    </ColumnContainer>
  );
});
