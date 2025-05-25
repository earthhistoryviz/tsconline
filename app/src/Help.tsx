import { AccordionSummary, Typography, AccordionDetails, Divider, Box, Link } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import { observer } from "mobx-react-lite";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { TSCButton } from "./components";
import { useContext, useEffect, useState } from "react";
import { context } from "./state";
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import Grid from "@mui/material/Grid";
import { StyledScrollbar } from "./components";
import rehypeRaw from "rehype-raw";

//The Pages for the help
import { HelpDrawer, HelpDrawerContext } from "./HelpDrawer";
import { fetcher } from "./util";
import {
  MarkdownFile,
  MarkdownParent,
  assertMarkdownParent,
  isMarkdownFile,
  isMarkdownParent
} from "@tsconline/shared";
import { BreadcrumbsWrapper } from "./HelpBreadcrumbs";
import { PageNotFound } from "./PageNotFound";
import ReactMarkdown from "react-markdown";
import { getHelpKeysFromPath } from "./state/non-action-util";

export const getMarkdownTreeEntryFromPath = (
  markdownParent: MarkdownParent,
  keys: string[]
): MarkdownParent | MarkdownFile | null => {
  if (keys.length === 0) {
    return markdownParent;
  }
  let pointer = markdownParent;
  for (const [index, key] of keys.entries()) {
    if (!pointer.children[key]) {
      return null;
    }
    if (index === keys.length - 1) {
      return pointer.children[key];
    } else {
      if (!isMarkdownParent(pointer.children[key])) {
        return null;
      }
      pointer = pointer.children[key] as MarkdownParent;
    }
  }
  return null;
};

export const Help = observer(function Help() {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  const query = new URLSearchParams(useLocation().search);
  const tourName = query.get("tour");
  const navigate = useNavigate();
  const [markdownParent, setMarkdownParent] = useState<MarkdownParent>({
    children: {},
    title: t("help.all-categories"),
    pathname: "all-categories"
  } as MarkdownParent);
  const currentPath = useLocation().pathname;
  const theme = useTheme();
  const keys = getHelpKeysFromPath(currentPath);
  useEffect(() => {
    if (tourName) {
      runTour(tourName);
    }
  }, [tourName]);
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
        assertMarkdownParent(data);
        setMarkdownParent(data);
      } catch (error) {
        console.error("Error loading markdown tree:", error);
      }
    };

    loadData();
  }, []);
  const background = { bgcolor: "secondaryBackground.main" };
  const markdownContent = getMarkdownTreeEntryFromPath(markdownParent, keys);
  if (!markdownContent) {
    return <PageNotFound />;
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
      case "qsg":
      case "workshops":
        navigate("/help");
        actions.setTab(5);
        break;
      default:
        console.warn(`Unknown tour name: ${tourName}`);
        break;
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

      <Grid container sx={{ display: "grid", gridTemplateColumns: "406px auto", height: "100vh" }}>
        <Grid item sx={background}>
          <StyledScrollbar style={{ borderRight: `1px solid ${theme.palette.divider}` }}>
            <HelpDrawerContext.Provider
              value={{
                selectedMarkdown: markdownContent
              }}>
              <HelpDrawer markdownParent={markdownParent} />
            </HelpDrawerContext.Provider>
          </StyledScrollbar>
        </Grid>
        <Grid item sx={background} paddingLeft="20px">
          <BreadcrumbsWrapper markdownParent={markdownParent} />
          <StyledScrollbar>
            {isMarkdownFile(markdownContent) ? (
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>{markdownContent.markdown}</ReactMarkdown>
            ) : (
              <MarkdownParentComponent markdownParent={markdownContent} />
            )}
          </StyledScrollbar>
        </Grid>
      </Grid>
    </div>
  );
});

// this is the component that renders the children of the markdown tree
// can only be accessed through breadcrumbs
const MarkdownParentComponent: React.FC<{
  markdownParent: MarkdownParent;
}> = ({ markdownParent }) => {
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  if (!isMarkdownParent(markdownParent)) {
    return null;
  }
  return (
    <Box display="flex" flexDirection="column" gap="20px" paddingTop="10px">
      {!markdownParent.markdown ? (
        Object.entries(markdownParent.children).map(([key, child]) => {
          const handleClick = () => {
            if (isMarkdownFile(child)) {
              navigate(`${pathname}/${child.pathname}`);
            } else {
              navigate(`${pathname}/${key}`);
            }
          };
          if (isMarkdownFile(child)) {
            return (
              <Link key={key} onClick={handleClick} sx={{ cursor: "pointer" }}>
                {child.title}
              </Link>
            );
          } else {
            return (
              <Link key={key} onClick={handleClick} sx={{ cursor: "pointer" }}>
                {key}
              </Link>
            );
          }
        })
      ) : (
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{markdownParent.markdown}</ReactMarkdown>
      )}
    </Box>
  );
};

export default Help;
