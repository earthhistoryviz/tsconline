import { Link } from "react-router-dom";
import { Collapse, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { useState } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { links } from "./help-menu-links";

// Setting link as any type for now
function NavItem({ link }: { link: any }) {
  const [open, setOpen] = useState(false);

  // If the item has children, handle expand/collapse
  const handleClick = () => {
    if (link.children) {
      setOpen(!open);
    }
  };

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton
          component={link.to ? Link : "div"}
          to={link.to || "#"}
          onClick={handleClick}
          sx={{ flexDirection: "row-reverse", py: 0, my: 0 }}>
          <ListItemText primary={link.label} />
          {link.children && (
            <div
              style={{
                transform: !open ? "rotate(-90deg)" : "rotate(180deg)"
              }}>
              {open ? <ExpandLess /> : <ExpandMore />}
            </div>
          )}
        </ListItemButton>
      </ListItem>

      {link.children && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1, borderLeft: "1px solid lightgray", marginLeft: "27.5px" }}>
            {/* Setting child and index as any type for now */}
            {link.children.map((child: any, index: any) => (
              <NavItem key={index} link={child} />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

function HelpDrawer() {
  return (
    <List>
      {links.map((link, index) => (
        <NavItem key={index} link={link} />
      ))}
    </List>
  );
}

export default HelpDrawer;
