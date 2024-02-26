import { AccordionSummaryProps, AccordionProps, Box } from "@mui/material";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import MuiAccordion from "@mui/material/Accordion";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { styled } from "@mui/material/styles";

// Define the Accordion component outside the Column component
export const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion
    disableGutters
    elevation={0}
    TransitionProps={{ timeout: 0, unmountOnExit: true }}
    square
    {...props}
  />
))(() => ({
  //border: `1px solid ${theme.palette.divider}`,
  "&:not(:last-child)": {
    borderBottom: 0,
  },
  "&:before": {
    display: "none",
  },
}));

// Define the AccordionSummary and AccordionDetails components outside the Column component
export const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.9rem" }} />}
    {...props}
  />
))(() => ({
  display: "flex",
  paddingLeft: "0px",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(90deg)",
    display: "flex",
    order: -1,
  },
  "& .MuiAccordionSummary-content": {
    order: 2,
    flexGrow: 1,
    alignItems: "center",
    margin: "0px",
  },
}));

export const AccordionDetails = styled(MuiAccordionDetails)(() => ({
  //padding: theme.spacing(0),
  //borderTop: "1px solid rgba(0, 0, 0, .125)",
  //borderBottom: "1px solid rgba(0, 0, 0, .125)",
  "& .MuiAccordionDetails-root": {
    padding: "4px 50px 4px",
  },
}));

export const ColumnContainer = styled(Box)(({ theme }) => ({
  // backgroundColor: theme.palette.background.default,
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0),
}));
// listItem: {
//   '&:hover': {
//     backgroundColor: theme.palette.selection.main,
//     cursor: 'pointer'
//   },
// },
