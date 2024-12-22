import { AccordionSummary, Typography, AccordionDetails } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import { observer } from "mobx-react-lite";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TSCButton } from "./components";
import { useContext } from "react";
import { context } from "./state";


export const Help = observer(function Help() {
  const { actions } = useContext(context);
  const background = { bgcolor: "secondaryBackground.main" };
  // const { setIsOpen } = useTour();
  const runTour = () => {
    actions.setIsQsgOpen(true);
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        paddingTop: "20px"
      }}>
      <div
        style={{
          margin: "0",
          position: "relative",
          top: "10%",
          left: "25%",
          right: "25%",
          alignItems: "center",
          width: "50%",
          overflow: "auto"
        }}>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel1a-content">
            <Typography>Quick Start Guide</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography style={{ marginBottom: '20px' }}>Welcome to Time Scale Creator Online! In this Quick Start Guide, you will quickly learn about the functions of each tab on the Nav bar. Click the 'Start QSG' button to begin.</Typography>
            <TSCButton buttonType="primary" onClick={runTour}>Start QSG</TSCButton>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>Tour</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>put tour here</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>Contributors</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>Paolo Gumasing, Jaehyuk Lee</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>Software License</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>put software license here</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>File Format Info</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>put file format info here</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>About</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>put about here</Typography>
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  );
});
