import { Link } from "react-router-dom";
import { Collapse, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { useState } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

const links = [
  { to: "/help/presets", label: "Presets" },
  { to: "/help/datapacks", label: "Datapacks" },
  {
    to: "/help/chart",
    label: "Chart",
    children: [
      { to: "/help/chart/what_is_a_chart", label: "What is a chart?" },
      {
        to: "/help/chart/column_variants",
        label: "Column Variants",
        children: [
          { to: "/help/chart/column_variants/block_columns", label: "Block Column" },
          { to: "/help/chart/column_variants/point_columns", label: "Point Column" },
          {
            to: "/help/chart/column_variants/event_columns/*",
            label: "Event Column",
            children: [
              { to: "/help/chart/column_variants/event_columns/dual_column_comparison", label: "Dual Column Comparison" },
              { to: "/help/chart/column_variants/event_columns/data_mining", label: "Data Mining" }
            ]
          },
          { to: "/help/chart/column_variants/freehand_columns", label: "Freehand Column" }
        ]
      },
      { to: "/help/chart/saving_a_chart", label: "Saving a Chart" }
    ]
  },
  { to: "/help/settings", label: "Settings" },
  { to: "/help/help", label: "Help" },
  { to: "/help/workshops", label: "Workshops" },
  { to: "/help/options", label: "Options" }
];

function NavItem({ link }) {
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
            {link.children.map((child, index) => (
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
