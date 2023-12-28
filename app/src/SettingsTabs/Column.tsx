import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { styled } from "@mui/material/styles";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import MuiAccordion, { AccordionProps } from "@mui/material/Accordion";
import MuiAccordionSummary, {
  AccordionSummaryProps,
} from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import { context } from "../state";
import { ColumnSetting } from "@tsconline/shared";
import { Button, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";
import './Column.css'

// Define the Accordion component outside the Column component
const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  "&:not(:last-child)": {
    borderBottom: 0,
  },
  "&:before": {
    display: "none",
  },
}));

// Define the AccordionSummary and AccordionDetails components outside the Column component
const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.9rem" }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "dark"
      ? "rgba(255, 255, 255, .05)"
      : "rgba(0, 0, 0, .03)",
  display: "flex",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(90deg)",
    display: "flex",
    order: -1, 
  },
  "& .MuiAccordionSummary-content": {
    order: 2,
    flexGrow: 1, 
    alignItems: "center",
  },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: "1px solid rgba(0, 0, 0, .125)",
}));

//types for recursively creation accordions
type ColumnAccordionProps = {
  name: string;
  details: ColumnSetting[string];
  onToggle: (name: string, parents: string[]) => void;
};

// component for column accordion recursion creation 
const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(({name, details, onToggle}) => {
  const [open, setOpen] = useState(true);
  const hasChildren = details.children && Object.keys(details.children).length > 0;
  const checkbox = (
    <div className="accordion-item">
      <div className="checkbox-container">
        <Checkbox checked={details.on} onChange={
          () => { onToggle(name, details.parents)
        }} />
        <Typography className="label-container">{name}</Typography>
      </div>
    </div>
  )
  // if there are no children, don't make an accordion
  if (!hasChildren) {
    return checkbox
  }

  return (
    <Accordion expanded={open} onChange={() => setOpen(!open)}>
      <AccordionSummary aria-controls="panel-content" id="panel-header">
        {checkbox}
      </AccordionSummary>
      <AccordionDetails>
        <div >
          {details.children && Object.entries(details.children).map(([childName, childDetails]) => (
            <ColumnAccordion 
              key={childName} 
              name={childName} 
              details={childDetails} 
              onToggle={onToggle}
            />
          ))}
        </div>
      </AccordionDetails>
    </Accordion>
  );
});

// column with generate button, and accordion columns
export const Column = observer(function Column() {
  const { state, actions } = useContext(context);
  const [open, setOpen] = useState(true);

  const handleChange = () => {
    setOpen(!open);
  };
  function renderColumns(columnInfo: ColumnSetting) {
    return Object.entries(columnInfo).map(([columnName, columnData]) => (
      <ColumnAccordion
        key={columnName}
        name={columnName}
        details={columnData}
        onToggle={actions.toggleSettingsTabColumn}
      />
    ));
  }
  const navigate = useNavigate();
  const handleButtonClick = () => {
    actions.setTab(1);
    actions.setAllTabs(true);


    actions.updateSettings();

    actions.generateChart();

    navigate("/chart");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
        }}
      >
        <Accordion
          expanded={open}
          onChange={handleChange}
        >
          <AccordionSummary aria-controls="panel1d-content" id="panel1d-header">
            <Typography>TimeScale Creator GTS2020 Chart</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <div>{renderColumns(state.settingsTabs.columns)}</div>
          </AccordionDetails>
        </Accordion>
      </div>
      <div style={{ border: "1px solid black", width: "400px" ,minHeight: "1000px",}}>
        <div style={{ paddingTop: "20px" }}>
          <Button onClick={handleButtonClick} variant="outlined">
            Generate the Chart!
          </Button>
        </div>
        <div style={{ paddingTop: "20px" }}>
          Edit Title:
          <br />
          <TextField></TextField>
        </div>
      </div>
    </div>
  );
});
