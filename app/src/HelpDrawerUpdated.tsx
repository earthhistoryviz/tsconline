import { useNavigate } from "react-router-dom";
import { Collapse, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { useState } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { links } from "./components/help-menu-json";
import { useTheme } from "@mui/material/styles";

interface LinkPath {
  Title: string;
  Content: string;
  Children?: LinkPath[];
}

function NavItem({ link, parentPath = "" }: { link: LinkPath; parentPath?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme(); // Moved inside the component

  // Construct full path for navigation
  const formattedPath = `${parentPath}/${link.Title.toLowerCase().replace(/\s+/g, "-")}`;

  const hasChildren = (link: LinkPath): boolean => {
    return (link.Children?.length || 0) > 0;
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
        <ListItemButton
          onClick={handleClick}
          sx={{
            flexDirection: "row-reverse",
            py: 0,
            my: 0,
            height: "24px",
            width: "300px"
          }}>
          <ListItemText primary={link.Title} sx={{ "& .MuiListItemText-primary": { fontSize: "0.875rem" } }} />
          {hasChildren(link) && (
            <div style={{ transform: !open ? "rotate(-90deg)" : "rotate(180deg)", color: theme.palette.button.main }}>
              {open ? <ExpandLess /> : <ExpandMore />}
            </div>
          )}
        </ListItemButton>
      </ListItem>

      {/* Render children if applicable */}
      {hasChildren(link) && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List
            component="div"
            disablePadding
            sx={{
              pl: 1,
              borderLeft: `1px solid ${theme.palette.divider}`,
              marginLeft: "27.5px",
              "& .MuiListItem-root": { margin: 0 }
            }}>
            {link.Children &&
              link.Children.map((child, index) => <NavItem key={index} link={child} parentPath={formattedPath} />)}
          </List>
        </Collapse>
      )}
    </>
  );
}

function NewHelpDrawer() {
  return (
    <List
      disablePadding
      sx={{
        "& .MuiListItem-root": {
          margin: 0
        }
      }}>
      {links.map((link, index) => (
        <NavItem key={index} link={link} />
      ))}
    </List>
  );
}

export default NewHelpDrawer;
