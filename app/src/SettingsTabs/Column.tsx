import { observer } from "mobx-react-lite";
import * as React from 'react';
import { styled } from '@mui/material/styles';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
import MuiAccordionSummary, {
  AccordionSummaryProps,
} from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';

// Define the Accordion component outside the Column component
const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderBottom: 0,
  },
  '&:before': {
    display: 'none',
  },
}));

// Define the AccordionSummary and AccordionDetails components outside the Column component
const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, .05)'
      : 'rgba(0, 0, 0, .03)',
  flexDirection: 'column', // Change to column layout
  alignItems: 'flex-start', // Align headers to the start
  '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
    transform: 'rotate(90deg)',
  },
  '& .MuiAccordionSummary-content': {
    marginLeft: theme.spacing(1),
  },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: '1px solid rgba(0, 0, 0, .125)',
}));

export const Column = observer(function Column() {
  const [expanded, setExpanded] = React.useState<string | false>('panel1');
  const [showOptions, setShowOptions] = React.useState(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
    setExpanded(newExpanded ? panel : false);
  };

  const handleOptionToggle = () => {
    setShowOptions(!showOptions);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Accordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
        <AccordionSummary aria-controls="panel1d-content" id="panel1d-header">
          <Typography>TimeScale Creator GTS2020 Chart</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {showOptions && (
            <div>
              <div>
                <label>
                  <Checkbox /> MA
                </label>
              </div>
              <div>
                <label>
                  <Checkbox /> Standard Chronostratigraphy
                </label>
              </div>
              <div>
                <label>
                  <Checkbox /> Planetary Time Scale
                </label>
              </div>
              <div>
                <label>
                  <Checkbox /> Regional Stages
                </label>
              </div>
              <div>
                <label>
                  <Checkbox /> Geomagnetic Polarity
                </label>
              </div>
              <div>
                <label>
                  <Checkbox /> Marine Macrofossils
                </label>
              </div>
              <div>
                <label>
                  <Checkbox /> Microfossiles
                </label>
              </div>
            </div>
          )}
        </AccordionDetails>
      </Accordion>
    </div>
  );
});
