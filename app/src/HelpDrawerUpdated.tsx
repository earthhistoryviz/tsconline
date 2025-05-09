import { useNavigate } from "react-router-dom";
import { Collapse, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { useState } from "react";
import { ExpandLess } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import "./HelpDrawer.css";
import { generatePath } from "./state/non-action-util";

interface LinkPath {
  title: string;
  content: string;
  children?: LinkPath[];
}

const links = [
  {
    title: "Presets",
    content: "Insert md file",
    children: []
  },
  {
    title: "Datapacks",
    content: "Insert md file",
    children: []
  },
  {
    title: "Chart",
    content: "Insert md file",
    children: [
      {
        title: "What is a Chart?",
        content: "Insert md file",
        children: []
      },
      {
        title: "Column Variants",
        content: "Insert md file",
        children: [
          {
            title: "Block Columns",
            content: "Insert md file",
            children: []
          },
          {
            title: "Point Columns",
            content: "Insert md file",
            children: []
          },
          {
            title: "Event columns",
            content: "Insert md file",
            children: [
              {
                title: "Dual column comparison",
                content: "Insert md file",
                children: []
              },
              {
                title: "Data Mining",
                content: "Insert md file",
                children: []
              }
            ]
          },
          {
            title: "Freehand Columns",
            content: "Insert md file",
            children: []
          }
        ]
      },
      {
        title: "Saving a Chart",
        content: "Insert md file",
        children: []
      }
    ]
  },
  {
    title: "Settings",
    content: "Insert md file",
    children: []
  },
  {
    title: "Help",
    content: "Insert md file",
    children: []
  },
  {
    title: "Workshops",
    content: "Insert md file",
    children: []
  },
  {
    title: "Options",
    content: "Insert md file",
    children: []
  }
];

function NavItem({ link, parentPath = "" }: { link: LinkPath; parentPath?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme(); // Moved inside the component

  // Construct full path for navigation
  const formattedPath = generatePath(link.title, parentPath);

  const hasChildren = (link: LinkPath): boolean => {
    return (link.children?.length || 0) > 0;
  };

  const handleClick = () => {
    if (hasChildren(link)) {
      setOpen(!open);
    } else {
      navigate(`/help${formattedPath}`);
    }
  };

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton onClick={handleClick} className="help-list-item-button">
          <ListItemText primary={link.title} sx={{ "& .MuiListItemText-primary": { fontSize: "0.875rem" } }} />
          {hasChildren(link) && (
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
      {hasChildren(link) && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List
            component="div"
            disablePadding
            className="menu-item"
            sx={{
              // Can't directly feed theme.palette.divider into the css file
              borderLeft: `1px solid ${theme.palette.accordionLine.main}`
            }}>
            {link.children &&
              link.children.map((child, index) => <NavItem key={index} link={child} parentPath={formattedPath} />)}
          </List>
        </Collapse>
      )}
    </>
  );
}

function NewHelpDrawer() {
  return (
    <List disablePadding className="new-help-drawer-list">
      {links.map((link, index) => (
        <NavItem key={index} link={link} />
      ))}
    </List>
  );
}

export default NewHelpDrawer;
