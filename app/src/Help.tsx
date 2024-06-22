import { AccordionSummary, Typography, AccordionDetails } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export const Help = observer(function Help() {
  const theme = useTheme();
  const background = { bgcolor: "secondaryBackground.main" };

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
          <AccordionSummary
            expandIcon={<ExpandMoreIcon color="icon"/>}
            aria-controls="panel1a-content"
            id="panel1a-header"
            className="accordion">
            <Typography>Quick Start Guide</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>Put QSG here</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon"/>} aria-controls="panel2a-content" id="panel2a-header">
            <Typography>Tour</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>put tour here</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon"/>} aria-controls="panel2a-content" id="panel2a-header">
            <Typography>Contributors</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>Paolo Gumasing, Jaehyuk Lee</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon"/>} aria-controls="panel2a-content" id="panel2a-header">
            <Typography>Software License</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>put software license here</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon"/>} aria-controls="panel2a-content" id="panel2a-header">
            <Typography>File Format Info</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>put file format info here</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon"/>} aria-controls="panel2a-content" id="panel2a-header">
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
