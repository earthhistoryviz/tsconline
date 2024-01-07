import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import { context } from "../state";
import { ColumnSetting } from "@tsconline/shared";
import { Button, TextField, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from '@mui/material/styles';
import { ColumnContainer, AccordionDetails, AccordionSummary, Accordion} from '../assets'
import { TSCCheckbox } from '../components/TSCCheckbox'

//types for recursively creation accordions
type ColumnAccordionProps = {
  name: string;
  details: ColumnSetting[string];
  onToggle: (name: string, parents: string[]) => void;
};
// component for column accordion recursion creation 
const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(({name, details, onToggle}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const hasChildren = details.children && Object.keys(details.children).length > 0;
  const checkbox = (
    <ColumnContainer>
        <TSCCheckbox checked={details.on} onChange={
          () => { onToggle(name, details.parents)
        }} 
        />
        <Typography sx={{ fontSize: "0.97rem"}}>{name}</Typography>
    </ColumnContainer>
  )
  // if there are no children, don't make an accordion
  if (!hasChildren) {
    return checkbox
  }

  return (
    <Accordion expanded={open} onChange={() => setOpen(!open)} >
      <AccordionSummary aria-controls="panel-content" id="panel-header"
        // sx={{backgroundColor: theme.palette.background.default}}
      >
        {checkbox}
      </AccordionSummary>
      <AccordionDetails>
        <div>
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
  const theme = useTheme();
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
    <div style={{ display: "flex", justifyContent: "center", minHeight: '100vh'}}>
      <Box
        sx={{
          border: `1px solid gray`,
          borderRadius: '4px',
          zIndex: 0,
          padding: '10px'
        }}
      >
        <Accordion
          expanded={open}
          onChange={handleChange}
          style={{minWidth: '70vh'}}
        >
          <AccordionSummary aria-controls="panel1d-content" id="panel1d-header"
          >
            <Typography sx={{ fontSize: "1.2rem", marginLeft: "15px" }}>TimeScale Creator GTS2020 Chart</Typography>
          </AccordionSummary>
          <AccordionDetails >
            {renderColumns(state.settingsTabs.columns)}
          </AccordionDetails>
        </Accordion>
      </Box>
    </div>
  );
});
