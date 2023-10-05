import { AccordionSummary, Typography, AccordionDetails } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import { observer } from "mobx-react-lite";
import React from "react";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
export const Help = observer(function Help() {
    return (
        <div style={{margin:'0',position:'absolute',top:'25%',left:"25%",right:"25%",alignItems:'center'}}>
            <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Typography>Quick Start Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            put quick start guide here
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2a-content"
          id="panel2a-header"
        >
          <Typography>Tour</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            put tour here
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2a-content"
          id="panel2a-header"
        >
          <Typography>Features Reference</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            put features reference here
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2a-content"
          id="panel2a-header"
        >
          <Typography>Software License</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            put software license here
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2a-content"
          id="panel2a-header"
        >
          <Typography>File Format Info</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            put file format info here
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2a-content"
          id="panel2a-header"
        >
          <Typography>About</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            put about here
          </Typography>
        </AccordionDetails>
      </Accordion>
      
        </div>
    )
}

)