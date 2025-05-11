import { ColumnContainer, Accordion } from "../../components";
import { Box, Typography } from "@mui/material";
import { useContext, useState, createContext } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { CustomTooltip } from "../../components";
import { context } from "../../state";
import { RenderColumnInfo } from "../../types";
import { getChildRenderColumns } from "../../util/util";
import "./OverlaySettings.css";
import "../Column.css";
import { ColumnContext } from "../Column";

const OverlayColumnContext = createContext<{
  selectedColumn: RenderColumnInfo | null;
  setSelectedColumn: (column: RenderColumnInfo) => void;
}>({
  selectedColumn: null,
  setSelectedColumn: () => {}
});

type OverlayColumnAccordionProps = {
  column: RenderColumnInfo;
  onColumnClick: (column: RenderColumnInfo) => void;
};

export const OverlayColumnAccordion: React.FC<OverlayColumnAccordionProps> = observer(({ column, onColumnClick }) => {
  const [selectedColumn, setSelectedColumn] = useState<RenderColumnInfo | null>(null);

  return (
    <div className="column-accordion-wrapper overlay-wrapper">
      <OverlayColumnContext.Provider value={{ selectedColumn, setSelectedColumn }}>
        <ColumnAccordion column={column} onColumnClick={onColumnClick} />
      </OverlayColumnContext.Provider>
    </div>
  );
});

const ColumnAccordion: React.FC<OverlayColumnAccordionProps> = observer(({ column, onColumnClick }) => {
  const { state } = useContext(context);
  const { state: localState } = useContext(ColumnContext);
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(column.expanded);
  const { selectedColumn, setSelectedColumn } = useContext(OverlayColumnContext);

  const selectedClass =
    selectedColumn?.name === column.name || (!selectedColumn && column.name === state.columnMenu.columnSelected)
      ? "selected-column"
      : "";

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
          if (!validForOverlay) {
            return;
          }
          setSelectedColumn(column);
          onColumnClick(column);
        }}
        tabIndex={0}>
        {validForOverlay ? <ValidOverlay /> : <NotValidOverlay />}
      </div>
    );
  }
  //for keeping the selected column hierarchy line highlighted
  const containsSelectedChild = column.children.some((column) => column === selectedColumn?.name) ? { opacity: 1 } : {};
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
          {getChildRenderColumns(column, localState.columnHashMap).map((childColumn) => (
            <ColumnAccordion key={childColumn.name} column={childColumn} onColumnClick={onColumnClick} />
          ))}
        </MuiAccordionDetails>
      </Accordion>
    </div>
  );
});
