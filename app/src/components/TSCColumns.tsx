import { AccordionProps, Box } from "@mui/material";
import MuiAccordion from "@mui/material/Accordion";
import { styled } from "@mui/material/styles";

// Define the Accordion component outside the Column component
export const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion
    disableGutters
    elevation={0}
    slotProps={{ transition: { timeout: 0, unmountOnExit: true } }}
    square
    {...props}
  />
))(() => ({
  "&:not(:last-child)": {
    borderBottom: 0
  },
  "&:before": {
    display: "none"
  }
}));

export const ColumnContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0)
}));
