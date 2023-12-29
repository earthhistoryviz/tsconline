import React from "react";
import Checkbox from "@mui/material/Checkbox";
import { useTheme, styled } from "@mui/material/styles";
import { makeStyles } from '@mui/styles';
import { ListItem, List, ListItemAvatar, Avatar, ListItemText, TabProps, TabsProps, Tab, Box} from '@mui/material';
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import MuiAccordion, { AccordionProps } from "@mui/material/Accordion";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { Link, LinkProps } from 'react-router-dom';
import { observer } from "mobx-react-lite";
import { devSafeUrl } from './util'
import MuiAccordionSummary, {
  AccordionSummaryProps,
} from "@mui/material/AccordionSummary";
import { Tabs } from "@mui/material";

type CheckboxProps = {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

interface TSCTabsProps extends TabsProps {
  children?: React.ReactNode;
  value: number | boolean;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

export const TSCCheckbox: React.FC<CheckboxProps> = (props: CheckboxProps) => {
  const theme = useTheme();

  return (
    <Checkbox
        // {...props}
        checked={props.checked}
        onChange={props.onChange}
        size="small"
        sx={{
            color: theme.palette.primary.main,
            '&.Mui-checked': {
                color: theme.palette.selection.main,
            },
        }}
    />
  )
};


// wraps tabs from mui to be able to change certain properties
export const TSCTabs = styled((props: TSCTabsProps) => (
  <Tabs
    {...props}
    TabIndicatorProps={{ children: <span className="MuiTabs-indicatorSpan" /> }}
  />
  ))(({ theme }) => {
    return {
      color: theme.palette.secondary.main,
      '& .MuiTabs-indicator': {
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      },
      '& .MuiTabs-indicatorSpan': {
        maxWidth: 80,
        width: '100%',
        backgroundColor: theme.palette.selection.main,
      },
    };
  });

// wraps tab to be able to change certain properties
export const TSCTab = styled((props: TabProps) => (
  <Tab disableRipple {...props} />
  ))(({ theme }) => {
    return {
      textTransform: "none",
      fontWeight: theme.typography.fontWeightRegular,
      fontSize: theme.typography.pxToRem(15),
      marginRight: theme.spacing(1),
      color: theme.palette.dark.main,
      "&:hover": {
        color: theme.palette.selection.light,
        opacity: 1,
      },
      "&.Mui-selected": {
        color: theme.palette.selection.main,
      },
      "&.Mui-focusVisible": {
        backgroundColor: theme.palette.primary.main,
      },
    };
  });

// Define the Accordion component outside the Column component
export const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
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
))(({ theme }) => ({
  // backgroundColor: theme.palette.background.default,
  display: "flex",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(90deg)",
    display: "flex",
    order: -1, 
  },
  "& .MuiAccordionSummary-content": {
    order: 2,
    flexGrow: 1, 
    alignItems: "center",
  },
}));

export const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: "1px solid rgba(0, 0, 0, .125)",
}));

export const ColumnContainer = styled(Box)(({ theme }) => ({
  // backgroundColor: theme.palette.background.default, 
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
}));
const useStyles = makeStyles({
  listItem: {
    '&:hover': {
      backgroundColor: '#f5f5f5',
      cursor: 'pointer'
    }
  }
});
type ImageRowComponentProps = {
  imageUrls: string[]; // Array of image URLs
};

export const ImageRowComponent: React.FC<ImageRowComponentProps> = observer(({ imageUrls }) => {
  const classes = useStyles();

  const handleRowClick = (imageUrl: string) => {
    console.log('Clicked on image URL:', imageUrl);
  };

  return (
    <Box>
      <List>
        {imageUrls.map((imageUrl, index) => (
          <ListItem 
            key={index} 
            className={classes.listItem} 
            onClick={() => handleRowClick(imageUrl)}
          >
            <ListItemAvatar>
              <Avatar alt={`Image ${index}`} src={devSafeUrl(imageUrl)} />
            </ListItemAvatar>
            <ListItemText primary={`Image ${index}`} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
});

export default ImageRowComponent;
