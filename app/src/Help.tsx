import { Box, Link } from "@mui/material";
import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import { context } from "./state";
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router";
import Grid from "@mui/material/Grid";
import { StyledScrollbar } from "./components";
import rehypeRaw from "rehype-raw";

//The Pages for the help
import { HelpDrawer, HelpDrawerContext } from "./HelpDrawer";
import { devSafeUrl, fetcher } from "./util";
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
  const query = new URLSearchParams(useLocation().search);
  const tourName = query.get("tour");
  const navigate = useNavigate();
  const [markdownParent, setMarkdownParent] = useState<MarkdownParent>({
    children: {},
    title: "All Categories",
    pathname: "all-categories"
  } as MarkdownParent);
  const currentPath = useLocation().pathname;
  const theme = useTheme();
  const keys = getHelpKeysFromPath(currentPath);
  useEffect(() => {
    if (tourName) {
      runTour(tourName);
      return;
    }
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
  }, [tourName]);
  const background = { bgcolor: "secondaryBackground.main" };
  const markdownContent = getMarkdownTreeEntryFromPath(markdownParent, keys);
  if (!markdownContent) {
    return <PageNotFound />;
  }
  if (isMarkdownFile(markdownContent)) {
    actions.replaceMarkdown(markdownContent);
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
    <Grid container className="help-container" sx={background}>
      <Grid item>
        <StyledScrollbar style={{ borderRight: `1px solid ${theme.palette.divider}` }}>
          <HelpDrawerContext.Provider
            value={{
              selectedMarkdown: markdownContent
            }}>
            <HelpDrawer markdownParent={markdownParent} />
          </HelpDrawerContext.Provider>
        </StyledScrollbar>
      </Grid>
      <Grid item className="markdown-wrapper" paddingLeft="20px">
        <StyledScrollbar>
          <BreadcrumbsWrapper markdownParent={markdownParent} />
          {isMarkdownFile(markdownContent) ? (
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{markdownContent.markdown}</ReactMarkdown>
          ) : (
            <MarkdownParentComponent markdownParent={markdownContent} />
          )}
        </StyledScrollbar>
      </Grid>
    </Grid>
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
          return (
            <Link key={key} onClick={handleClick} sx={{ cursor: "pointer" }}>
              {child.title}
            </Link>
          );
        })
      ) : (
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{markdownParent.markdown}</ReactMarkdown>
      )}
    </Box>
  );
};

export default Help;
