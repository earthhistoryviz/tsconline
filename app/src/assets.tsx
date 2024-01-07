import React, { useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import { Theme, useTheme, styled } from "@mui/material/styles";
import { makeStyles } from '@mui/styles';
import { Button, ButtonProps, Dialog, ListItem, List, ListItemAvatar, Avatar, ListItemText, TabProps, TabsProps, Tab, Box} from '@mui/material';
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import MuiAccordion, { AccordionProps } from "@mui/material/Accordion";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
// import { Link, LinkProps } from 'react-router-dom';
import { devSafeUrl } from './util'
import MuiAccordionSummary, {
  AccordionSummaryProps,
} from "@mui/material/AccordionSummary";
import { Tabs } from "@mui/material";

export const TSCButton: React.FC<ButtonProps>  = ( props ) => {
  const theme = useTheme();

  return (
    <Button
      {...props} 
      sx={{
        backgroundColor: theme.palette.button.main, 
        color: "#FFFFFF",
        ":hover": {
          backgroundColor: theme.palette.button.light,
        },
        ":active": {
          backgroundColor: theme.palette.button.dark,
        },
        ...props?.sx,
      }}
      style={{
        width: "325px", 
        height: "75px", 
        marginLeft: "auto", 
        marginRight: "auto", 
        ...props?.style,
      }}
      variant="contained"
      endIcon={props?.endIcon} 
    >
      {props?.children}
    </Button>
  );

}
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
    margin: "0px"
  },
}));

export const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: "1px solid rgba(0, 0, 0, .125)",
  "& .MuiAccordionDetails-root": {
    padding: "4px 8px 4px"
  }
}));

export const ColumnContainer = styled(Box)(({ theme }) => ({
  // backgroundColor: theme.palette.background.default, 
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0),
}));
  // listItem: {
  //   '&:hover': {
  //     backgroundColor: theme.palette.selection.main,
  //     cursor: 'pointer'
  //   },
  // },