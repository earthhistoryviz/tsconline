import { AccordionSummary, Typography, AccordionDetails, Divider, Toolbar } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import { observer } from "mobx-react-lite";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TSCButton } from "./components";
import { useContext } from "react";
import { context } from "./state";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import Grid from "@mui/material/Grid";
import { StyledScrollbar } from "./components";

//The Pages for the help
import HelpDrawer from "./HelpDrawer";
import { Routes, Route } from "react-router-dom";
import HelpPresets from "./HelpMenuPages/Presets/HelpPresets";
import HelpDatapacks from "./HelpMenuPages/Datapacks/HelpDatapacks";
import HelpChart from "./HelpMenuPages/Chart/HelpChart";
import HelpColumnVariants from "./HelpMenuPages/Chart/Column Variants/HelpColumnVariants";
import HelpBreadcrumbs from "./HelpBreadcrumbs";
import HelpSettings from "./HelpMenuPages/Settings/HelpSettings";
import HelpHelp from "./HelpMenuPages/Help/HelpHelp";
import HelpWorkshops from "./HelpMenuPages/Workshops/HelpWorkshops";
import HelpOptions from "./HelpMenuPages/Options/HelpOptions";
import HelpWhatIsAChart from "./HelpMenuPages/Chart/HelpWhatIsAChart";
import HelpSavingAChart from "./HelpMenuPages/Chart/HelpSavingAChart";
import HelpBlockColumn from "./HelpMenuPages/Chart/Column Variants/HelpBlockColumns";
import HelpPointColumns from "./HelpMenuPages/Chart/Column Variants/HelpPointColumns";
import HelpEventColumns from "./HelpMenuPages/Chart/Column Variants/Event Columns/HelpEventColumns";
import HelpDualColumnComparison from "./HelpMenuPages/Chart/Column Variants/Event Columns/HelpDualColumnComparison";
import HelpDataMining from "./HelpMenuPages/Chart/Column Variants/Event Columns/HelpDataMining";
import HelpFreehandColumns from "./HelpMenuPages/Chart/Column Variants/HelpFreehandColumns";
import { PageNotFound } from "./PageNotFound";
import NewBreadcrumbs from "./HelpBreadcrumbsUpdated";
import NewHelpDrawer from "./HelpDrawerUpdated";

export const Help = observer(function Help() {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const background = { bgcolor: "secondaryBackground.main" };

  function runTour(tourName: string) {
    actions.setTourOpen(true, tourName);
    switch (tourName) {
      case "datapacks":
        navigate("/datapacks");
        actions.setTab(2);
        break;
      case "settings":
        navigate("/settings");
        actions.setTab(4);
        break;
      default:
        navigate("/help");
        actions.setTab(5);
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
            <Typography>{t("help.qsg.title")}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography style={{ marginBottom: "20px" }}>{t("help.qsg.content")}</Typography>
            <TSCButton buttonType="primary" onClick={() => runTour("qsg")}>
              {t("help.qsg.button")}
            </TSCButton>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>{t("help.tour.title")}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography style={{ marginBottom: "20px" }}>{t("help.tour.content.datapacks")}</Typography>
            <TSCButton buttonType="primary" onClick={() => runTour("datapacks")}>
              {t("help.tour.button.datapacks")}
            </TSCButton>
            <Divider style={{ marginTop: "20px" }} variant="middle" />
            <Typography style={{ marginBottom: "20px" }}>{t("help.tour.content.settings")}</Typography>
            <TSCButton buttonType="primary" onClick={() => runTour("settings")}>
              {t("help.tour.button.settings")}
            </TSCButton>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>{t("help.license")}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              {/* TODO: this might need some change because it's for the java app. */}
              <strong>TSCreator Pro</strong> is copyright (c) of Geologic TimeScale Foundation, hereafter named the
              &quot;Owner&quot;. All rights reserved, &quot;TSCreator&quot; and &quot;TSCreator Pro&quot; are trademarks
              of the &quot;Owner&quot;.
              <p>
                <strong>IMPORTANT - READ CAREFULLY:</strong> This license statement and limited warranty constitutes a
                legal agreement (&quot;License Agreement&quot;) between you (either as an individual or a single entity)
                and the Owner (&quot;Licensor&quot;) for TSCreator Pro. The Web Site referred to in this agreement is{" "}
                <a href="https://timescalecreator.org" target="_blank" rel="noopener noreferrer">
                  https://timescalecreator.org
                </a>
                .
              </p>
              <p>
                BY INSTALLING, COPYING, OR OTHERWISE USING THE SOFTWARE, YOU AGREE TO BE BOUND BY ALL OF THE TERMS AND
                CONDITIONS OF THE LICENSE AGREEMENT.
              </p>
              <p>
                Upon your acceptance of the terms and conditions of the License Agreement, Licensor grants you the right
                to use the Software in the manner provided below. If you do not accept the terms and conditions of the
                License Agreement, you are to promptly delete each and any copy of the Software from your computer(s).
              </p>
              <p>
                This license agreement only applies to the software product <strong>TSCreator</strong>. The Vendor
                reserves the right to license the same Software to other individuals or entities under a different
                license agreement.
              </p>
              <p>
                Under this license agreement, TSCreator Pro can be licensed for commercial use at a fee. You may not
                give copies of the Software to others. You must not charge any money for the Software itself or the act
                of copying the Software. You may not distribute the Software, single or as part of a larger package.
              </p>
              <p>
                The Software is provided &quot;as is&quot;. In no event shall the Licensor or any of his affiliates be
                liable for any consequential, special, incidental, or indirect damages of any kind arising out of the
                delivery, performance, or use of this Software, to the maximum extent permitted by applicable law. While
                the Software has been developed with great care, it is not possible to warrant that the Software is
                error-free.
              </p>
              <p>
                The Software is not designed or intended to be used in any activity that may cause personal injury,
                death, or any other severe damage or loss.
              </p>
              <p>
                You must not attempt to reverse compile, modify, translate, or disassemble the Software in whole or in
                part. You must not run the Software under a debugger or similar tool allowing you to inspect the inner
                workings of the Software.
              </p>
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={background}>
          <AccordionSummary expandIcon={<ExpandMoreIcon color="icon" />} aria-controls="panel2a-content">
            <Typography>{t("help.file-format-info.title")}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              <a href="/file-format-info" target="_blank" rel="noopener noreferrer">
                {t("help.file-format-info.link")}
              </a>
            </Typography>
          </AccordionDetails>
        </Accordion>
        {/* TODO:
         * 1. Move the 'About' section to here if needed.
         * 2. Complete the contributors list on the About page:
         *    - Add the developers of the Java application.
         *    - Include past contributors who have made significant contributions. */}
      </div>
      {/* For the demo */}
      {/*
      <Grid container sx={{ display: "grid", gridTemplateColumns: "406px auto", height: "100vh" }}>
        <Grid item sx={background}>
          <Toolbar>
            <StyledScrollbar>
              <HelpDrawer />
            </StyledScrollbar>
          </Toolbar>
        </Grid>
        <Grid item sx={background}>
          <HelpBreadcrumbs />

          <Routes>
            <Route path="presets" element={<HelpPresets />} />
            <Route path="datapacks" element={<HelpDatapacks />} />
            <Route path="chart/*" element={<HelpChart />} />
            <Route path="chart/what_is_a_chart" element={<HelpWhatIsAChart />} />
            <Route path="chart/column_variants/*" element={<HelpColumnVariants />} />
            <Route path="chart/column_variants/block_columns" element={<HelpBlockColumn />} />
            <Route path="chart/column_variants/point_columns" element={<HelpPointColumns />} />
            <Route path="chart/column_variants/event_columns" element={<HelpEventColumns />} />
            <Route
              path="chart/column_variants/event_columns/dual_column_comparison"
              element={<HelpDualColumnComparison />}
            />
            <Route path="chart/column_variants/event_columns/data_mining" element={<HelpDataMining />} />
            <Route path="chart/column_variants/freehand_columns" element={<HelpFreehandColumns />} />
            <Route path="chart/saving_a_chart" element={<HelpSavingAChart />} />
            <Route path="settings" element={<HelpSettings />} />
            <Route path="help" element={<HelpHelp />} />
            <Route path="workshops" element={<HelpWorkshops />} />
            <Route path="options" element={<HelpOptions />} />

            <Route path="404" element={<PageNotFound />} />
          </Routes>
        </Grid>
      </Grid> */}

      {/* The Actual breadcrumb */}
      <Grid container sx={{ display: "grid", gridTemplateColumns: "406px auto", height: "100vh" }}>
        <Grid item sx={background}>
          <StyledScrollbar>
            <NewHelpDrawer />
          </StyledScrollbar>
        </Grid>
        <Grid item sx={background}>
          <NewBreadcrumbs />
        </Grid>

      </Grid>
    </div>
  );
});

export default Help;
