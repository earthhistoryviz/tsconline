import { AccordionSummary, Typography, AccordionDetails, Divider } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import { observer } from "mobx-react-lite";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TSCButton } from "./components";
import { useContext } from "react";
import { context } from "./state";
import { useNavigate } from "react-router";


export const Help = observer(function Help() {
  const { actions, state } = useContext(context);
  const navigate = useNavigate();
  const background = { bgcolor: "secondaryBackground.main" };
  function runTour(tourName: string) {
    actions.setTourOpen(true, tourName);
    switch (tourName) {
      case "datapacks":
        navigate("/datapacks");
        break;
      case "settings":
        navigate("/settings");
        break;
      default:
        navigate("/help")
    }
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
            <TSCButton buttonType="primary" onClick={() => runTour("qsg")}>Start QSG</TSCButton>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>Tour</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography style={{ marginBottom: '20px' }}>In the datapacks tour you will explore the Datapacks page in depth. Click the button to start your tour!</Typography>
            <TSCButton buttonType="primary" onClick={() => runTour("datapacks")}>Start Datapacks Tour</TSCButton>
            <Divider style={{ marginTop: '20px' }} variant="middle" />
            <Typography style={{ marginBottom: '20px' }}>In the settings tour you will explore the Settings page in depth. Click the button to start your tour!</Typography>
            <TSCButton buttonType="primary" onClick={() => runTour("settings")}>Start Settings Tour</TSCButton>


          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>Software License</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              {/* TODO: this might need some change because it's for the java app. */}
              <strong>TSCreator Pro</strong> is copyright (c) of Geologic TimeScale Foundation, hereafter named
              the "Owner". All rights reserved, "TSCreator" and "TSCreator Pro" are trademarks of the "Owner".

              <p><strong>IMPORTANT - READ CAREFULLY:</strong> This license statement and limited warranty
                constitutes a legal agreement ("License Agreement") between you (either as an individual or a
                single entity) and the Owner ("Licensor") for TSCreator Pro. The Web Site referred to in this
                agreement is <a href="https://timescalecreator.org" target="_blank" rel="noopener noreferrer">https://timescalecreator.org</a>.</p>

              <p>BY INSTALLING, COPYING, OR OTHERWISE USING THE SOFTWARE, YOU AGREE TO BE BOUND BY ALL OF THE
                TERMS AND CONDITIONS OF THE LICENSE AGREEMENT.</p>

              <p>Upon your acceptance of the terms and conditions of the License Agreement, Licensor grants
                you the right to use the Software in the manner provided below. If you do not accept the terms
                and conditions of the License Agreement, you are to promptly delete each and any copy of the
                Software from your computer(s).</p>

              <p>This license agreement only applies to the software product <strong>TSCreator</strong>. The
                Vendor reserves the right to license the same Software to other individuals or entities under a
                different license agreement.</p>

              <p>Under this license agreement, TSCreator Pro can be licensed for commercial use at a fee. You
                may not give copies of the Software to others. You must not charge any money for the Software
                itself or the act of copying the Software. You may not distribute the Software, single or as
                part of a larger package.</p>

              <p>The Software is provided "as is". In no event shall the Licensor or any of his affiliates be
                liable for any consequential, special, incidental, or indirect damages of any kind arising out
                of the delivery, performance, or use of this Software, to the maximum extent permitted by
                applicable law. While the Software has been developed with great care, it is not possible to
                warrant that the Software is error-free.</p>

              <p>The Software is not designed or intended to be used in any activity that may cause personal
                injury, death, or any other severe damage or loss.</p>

              <p>You must not attempt to reverse compile, modify, translate, or disassemble the Software in
                whole or in part. You must not run the Software under a debugger or similar tool allowing you to
                inspect the inner workings of the Software.</p>
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>File Format Info</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography><a href="/file-format-info" target="_blank" rel="noopener noreferrer">check file format info</a></Typography>
          </AccordionDetails>
        </Accordion>
        {/* move 'About' to here if needed. */}
      </div>
    </div>
  );
});
