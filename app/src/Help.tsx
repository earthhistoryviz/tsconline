import { AccordionSummary, Typography, AccordionDetails, Divider } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import { observer } from "mobx-react-lite";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TSCButton } from "./components";
import { useContext, useEffect, useState } from "react";
import { context } from "./state";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import Grid from "@mui/material/Grid";
import { StyledScrollbar } from "./components";

//The Pages for the help
import { HelpDrawer } from "./HelpDrawer";
import { fetcher } from "./util";
import { MarkdownFile, MarkdownTree, assertMarkdownTree, isMarkdownFile } from "@tsconline/shared";
import { BreadcrumbsWrapper } from "./HelpBreadcrumbs";
import { PageNotFound } from "./PageNotFound";
import ReactMarkdown from "react-markdown";

export const Help = observer(function Help() {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [markdownTree, setMarkdownTree] = useState<MarkdownTree>({});
  const currentPath = useLocation().pathname;
  const keys = currentPath.split("/help/")[1].split("/");
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetcher("/markdown-tree", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load data. Status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Expected JSON response, but got something else.");
        }

        const data = await response.json();
        assertMarkdownTree(data);
        setMarkdownTree(data);
      } catch (error) {
        console.error("Error loading markdown tree:", error);
      }
    };

    loadData();
  }, []);
  const background = { bgcolor: "secondaryBackground.main" };
  let pointer = markdownTree;
  let markdownContent: MarkdownFile | undefined = undefined;
  for (const key of keys) {
    if (!pointer[key]) {
      return <PageNotFound />;
    }
    if (isMarkdownFile(pointer[key])) {
      markdownContent = pointer[key] as MarkdownFile;
      break;
    }
    pointer = pointer[key] as MarkdownTree;
  }

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

      {/* The Actual breadcrumb */}
      <Grid container sx={{ display: "grid", gridTemplateColumns: "406px auto", height: "100vh" }}>
        <Grid item sx={background}>
          <StyledScrollbar>
            <HelpDrawer markdownTree={markdownTree} />
          </StyledScrollbar>
        </Grid>
        <Grid item sx={background}>
          <BreadcrumbsWrapper markdownTree={markdownTree} />
          <StyledScrollbar>
            <ReactMarkdown>
              {markdownContent?.markdown || ""}
            </ReactMarkdown>
          </StyledScrollbar>
        </Grid>
      </Grid>
    </div>
  );
});

export default Help;
