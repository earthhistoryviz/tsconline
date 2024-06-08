import { AccordionProps, Box } from "@mui/material";
import MuiAccordion from "@mui/material/Accordion";
import { styled } from "@mui/material/styles";

// Define the Accordion component outside the Column component
export const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion disableGutters elevation={0} TransitionProps={{ timeout: 0, unmountOnExit: true }} square {...props} />
))(() => ({
  //border: `1px solid ${theme.palette.divider}`,
  "&:not(:last-child)": {
    borderBottom: 0
  },
  "&:before": {
    display: "none"
  }
}));

export const ColumnContainer = styled(Box)(({ theme }) => ({
  // backgroundColor: theme.palette.background.default,
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0)
}));
// listItem: {
//   '&:hover': {
//     backgroundColor: theme.palette.selection.main,
//     cursor: 'pointer'
//   },
// },
