import { Link } from "react-router-dom";
import { Collapse, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { useState } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { links } from "./HelpMenuLinks";

// Setting link as any type for now
function NavItem({ link } : {link : any}) {
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
        <ListItemButton component={link.to ? Link : "div"} to={link.to || "#"} onClick={handleClick} sx={{ flexDirection: "row-reverse" }}>
          <ListItemText primary={link.label} />
          {link.children && (open ? <ExpandLess /> : <ExpandMore />)}
        </ListItemButton>
      </ListItem>

      {link.children && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 4 }}>

            {/* Setting child and index as any type for now */}
            {link.children.map((child : any, index : any) => (
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
