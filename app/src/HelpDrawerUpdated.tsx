import { Link } from "react-router-dom";
import { Collapse, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { useState } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { links } from "./help-menu-json"; // import the links

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

  // Added URL path formatting helper
  const formattedPath = link.Title.toLowerCase().replace(/\s+/g, '-');

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton
          component={link.Children.length === 0 ? Link : "div"}
          to={link.Children.length === 0 ? `/help/${formattedPath}` : "#"}
          onClick={handleClick}
          sx={{ flexDirection: "row-reverse", py: 0, my: 0 }}
        >
          <ListItemText 
            primary={link.Title}
            sx={{
              '& .MuiListItemText-primary': {
                fontSize: '0.875rem',  
              },
            }}
          />
    
          {link.Children.length > 0 && (
            <div
              style={{
                transform: !open ? "rotate(-90deg)" : "rotate(180deg)",
                transition: 'transform 0.3s'
              }}
            >
              {open ? <ExpandLess /> : <ExpandMore />}
            </div>
          )}
        </ListItemButton>
      </ListItem>

      {link.Children.length > 0 && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List 
            component="div" 
            disablePadding 
            sx={{ 
              pl: 1, 
              borderLeft: "1px solid lightgray", 
              marginLeft: "27.5px"
            }}
          >
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
    <List disablePadding>
      {links.map((link, index) => (
        <NavItem key={index} link={link} />
      ))}
    </List>
  );
}

export default NewHelpDrawer;
