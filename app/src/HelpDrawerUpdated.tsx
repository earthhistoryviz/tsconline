import { Link } from "react-router-dom";
import { Collapse, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { useState } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { links } from "./help-menu-json";

interface LinkPath {
    Title: string;
    Content: string;
    Children: LinkPath[];
  }


function NavItem({ link }: { link: LinkPath }) {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (link.Children.length > 0) {
      setOpen(!open);
    }
  };

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton
          component={link.Children.length === 0 ? Link : "div"}
          to={link.Children.length === 0 ? `/help/${link.Title}` : "#"}
          onClick={handleClick}
          sx={{ flexDirection: "row-reverse", py: 0, my: 0 }}>
          <ListItemText primary={String(link.Title).replace(/^0+/, "").trim()} />
          {link.Children.length && (
            <div
              style={{
                transform: !open ? "rotate(-90deg)" : "rotate(180deg)"
              }}>
              {open ? <ExpandLess /> : <ExpandMore />}
            </div>
          )}
        </ListItemButton>
      </ListItem>

      {link.Children.length && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1, borderLeft: "1px solid lightgray", marginLeft: "27.5px" }}>
            {link.Children.map((child, index) => (
              <NavItem key={index} link={child} />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

function NewHelpDrawer() {
  return (
    <List>
      {links.map((link, index) => (
        <NavItem key={index} link={link} />
      ))}
    </List>
  );
}

export default NewHelpDrawer;
