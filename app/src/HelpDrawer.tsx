import { useNavigate } from "react-router-dom";
import { Accordion, AccordionDetails, AccordionSummary, Box, List, Typography } from "@mui/material";
import { createContext, useContext, useState } from "react";
import { ArrowForwardIosSharp } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import "./HelpDrawer.css";
import { generatePath } from "./state/non-action-util";
import { MarkdownFile, MarkdownParent, isMarkdownFile, isMarkdownParent } from "@tsconline/shared";

type HelpDrawerContextType = {
  selectedMarkdown: MarkdownFile | MarkdownParent | undefined;
};
export const HelpDrawerContext = createContext<HelpDrawerContextType>({
  selectedMarkdown: undefined
});

function doesMarkdownTreeContainFile(markdownFile: MarkdownParent, target: MarkdownParent | MarkdownFile) {
  for (const value of Object.values(markdownFile.children)) {
    if (value === target) return true;
  }
  return false;
}

function NavItem({
  markdownParent,
  pathname,
  parentPath = ""
}: {
  markdownParent: MarkdownParent | MarkdownFile;
  pathname: string;
  parentPath?: string;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { selectedMarkdown } = useContext(HelpDrawerContext);
  const isSelected = selectedMarkdown === markdownParent ? "selected-help-accordion" : "";
  const theme = useTheme(); // Moved inside the component

  // Construct full path for navigation
  const formattedPath = generatePath(pathname, parentPath);

  const parentHandleClick = () => {
    setOpen(!open);
  };
  const handleClick = () => {
    navigate(`/help${formattedPath}`);
  };
  const isParent = isMarkdownParent(markdownParent);
  console.log("isParent", isParent, "markdownParent", markdownParent);
  const containsSelectedChild =
    selectedMarkdown && isParent && doesMarkdownTreeContainFile(markdownParent, selectedMarkdown) ? { opacity: 1 } : {};
  return (
    <Box className="help-accordion-container">
      {open && <Box className="accordion-help-line" style={containsSelectedChild} bgcolor="accordionLine.main" />}
      {/* Render children if applicable */}
      <Accordion
        expanded={open}
        elevation={0}
        className="help-accordion"
        square
        disableGutters={true}
        slotProps={{
          transition: {
            timeout: 500,
            unmountOnExit: true
          }
        }}>
        <AccordionSummary
          className={`help-accordion-summary ${isSelected}`}
          onClick={handleClick}
          expandIcon={
            <ArrowForwardIosSharp
              color="icon"
              onClick={(e) => {
                e.stopPropagation();
                parentHandleClick();
              }}
              sx={{
                fontSize: "0.9rem",
                display: isParent ? "block" : "none"
              }}
            />
          }>
          <Typography
            onClick={handleClick}
            className={`help-accordion-summary-text ${!isParent ? "help-accordion-leaf" : ""}`}>
            {isMarkdownFile(markdownParent) ? (markdownParent as MarkdownFile).title : pathname}
          </Typography>
        </AccordionSummary>
        <AccordionDetails
          className="accordion-help-details"
          sx={{
            // Can't directly feed theme.palette.divider into the css file
            borderLeft: `1px solid ${theme.palette.accordionLine.main}`
          }}>
          {isMarkdownParent(markdownParent) &&
            Object.entries(markdownParent.children).map(([key, child]) => (
              <NavItem
                pathname={isMarkdownFile(child) ? child.pathname : key}
                key={key}
                markdownParent={child}
                parentPath={formattedPath}
              />
            ))}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

type HelpDrawerProps = {
  markdownParent: MarkdownParent;
};
export const HelpDrawer: React.FC<HelpDrawerProps> = ({ markdownParent }) => {
  return (
    <List disablePadding className="new-help-drawer-list">
      {Object.entries(markdownParent.children).map(([key, child]) => (
        <NavItem pathname={key} key={key} markdownParent={child} />
      ))}
    </List>
  );
};
