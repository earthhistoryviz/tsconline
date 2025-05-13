import { useNavigate } from "react-router-dom";
import { Collapse, List, ListItem, ListItemButton, ListItemText, Typography } from "@mui/material";
import { useState } from "react";
import { ExpandLess } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import "./HelpDrawer.css";
import { generatePath } from "./state/non-action-util";
import { MarkdownFile, MarkdownTree, isMarkdownFile, isMarkdownParent } from "@tsconline/shared";



function NavItem({ markdownTree, pathname, parentPath = "" }: { markdownTree: MarkdownTree | MarkdownFile; pathname: string; parentPath?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme(); // Moved inside the component

  // Construct full path for navigation
  const formattedPath = generatePath(pathname, parentPath);


  const handleClick = () => {
    if (isMarkdownParent(markdownTree)) {
      setOpen(!open);
    } else {
      navigate(`/help${formattedPath}`);
    }
  };
  return (
    <>
      <ListItem disablePadding>
        <ListItemButton onClick={handleClick} className="help-list-item-button">
          <ListItemText primary={<Typography onClick={handleClick}>
            {isMarkdownFile(markdownTree) ? 
              (markdownTree as MarkdownFile).title
             : (
              pathname
            )}
          </Typography>} sx={{ "& .MuiListItemText-primary": { fontSize: "0.875rem" } }} />
          {isMarkdownParent(markdownTree) && (
            <ExpandLess
              sx={{
                transform: !open ? "rotate(90deg)" : "rotate(180deg)",
                color: theme.palette.button.main,
                transition: "transform 0.1s ease-in-out",
                height: "24px",
                width: "24px"
              }}
            />
          )}
        </ListItemButton>
      </ListItem>

      {/* Render children if applicable */}
      {isMarkdownParent(markdownTree) && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List
            component="div"
            disablePadding
            className="menu-item"
            sx={{
              // Can't directly feed theme.palette.divider into the css file
              borderLeft: `1px solid ${theme.palette.accordionLine.main}`
            }}>
            {isMarkdownParent(markdownTree) &&
              Object.entries(markdownTree).map(([key, child]) => <NavItem pathname={isMarkdownFile(child) ? child.pathname : key} key={key} markdownTree={child} parentPath={formattedPath} />)}
          </List>
        </Collapse>
      )}
    </>
  );
}

type HelpDrawerProps = {
  markdownTree: MarkdownTree;
};
export const HelpDrawer: React.FC<HelpDrawerProps> = ({ markdownTree }) => {
  return (
    <List disablePadding className="new-help-drawer-list">
{ 
              Object.entries(markdownTree).map(([key, child]) => <NavItem pathname={key} key={key} markdownTree={child} />)
 }
    </List>
  );
}