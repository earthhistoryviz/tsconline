import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import {
  Button,
  ButtonGroup,
  ButtonGroupProps,
  ButtonProps,
  IconButton,
  IconButtonProps,
  Typography
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { createGradient } from "../util/util";
import { forwardRef, useRef } from "react";
import { ArrowDropDown } from "@mui/icons-material";
import React from "react";
import { ControlledMenu, useClick, useMenuState } from "@szhsin/react-menu";
import { TSCMenuItem } from "./TSCComponents";

type TSCIconButtonProps = {
  buttonType?: "primary" | "secondary" | "gradient" | "transparent";
} & IconButtonProps;
export const TSCIconButton = forwardRef<HTMLButtonElement, TSCIconButtonProps>(function TSCIconButton(
  { buttonType = "primary", ...props },
  ref
) {
  const theme = useTheme();
  const gradient = createGradient(theme.palette.mainGradientLeft.main, theme.palette.mainGradientRight.main);
  const color =
    buttonType === "primary"
      ? theme.palette.button
      : buttonType === "secondary"
        ? theme.palette.secondaryButton
        : gradient;
  return (
    <IconButton
      {...props}
      ref={ref}
      disableRipple
      sx={{
        background: color["main"],
        color: color["contrastText"],
        ":hover": {
          background: color["light"]
        },
        ":active": {
          background: color["dark"]
        },
        ...props.sx
      }}>
      {props.children}
    </IconButton>
  );
});
type TSCButtonProps = {
  buttonType?: "primary" | "secondary" | "gradient";
} & ButtonProps;
export const TSCButton = forwardRef<HTMLButtonElement, TSCButtonProps>(function TSCButton(
  { buttonType = "primary", ...props },
  ref
) {
  const theme = useTheme();
  const gradient = createGradient(theme.palette.mainGradientLeft.main, theme.palette.mainGradientRight.main);
  const color =
    buttonType === "primary"
      ? theme.palette.button
      : buttonType === "secondary"
        ? theme.palette.secondaryButton
        : gradient;
  return (
    <Button
      {...props}
      ref={ref}
      disableRipple
      sx={{
        background: color["main"],
        color: color["contrastText"],
        ":hover": {
          background: color["light"]
        },
        ":active": {
          background: color["dark"]
        },
        ...props.sx
      }}
      variant="contained">
      {props.children}
    </Button>
  );
});

type TSCSplitButtonProps = {
  options: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }[];
  buttonType?: "primary" | "secondary" | "gradient";
} & ButtonGroupProps;

export const TSCSplitButton: React.FC<TSCSplitButtonProps> = ({ options, buttonType, ...props }) => {
  const [menuState, toggleMenu] = useMenuState({ transition: true });
  const anchorProps = useClick(menuState.state, toggleMenu);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const theme = useTheme();
  const gradient = createGradient(theme.palette.mainGradientLeft.main, theme.palette.mainGradientRight.main);
  const color =
    buttonType === "primary"
      ? theme.palette.button
      : buttonType === "secondary"
        ? theme.palette.secondaryButton
        : gradient;
  return (
    <>
      <ButtonGroup
        sx={{
          background: color["main"],
          color: color["contrastText"],
          "& .MuiButton-root:hover": {
            background: color["light"]
          },
          "& .MuiButton-root:active": {
            background: color["dark"]
          }
        }}
        variant="contained"
        aria-label="Button group with a nested menu"
        {...props}>
        <Button
          startIcon={options[0].icon}
          disableRipple
          color="inherit"
          sx={{
            background: "transparent"
          }}>
          {options[0].label}
        </Button>
        <Button
          size="small"
          disableRipple
          {...anchorProps}
          ref={anchorRef}
          sx={{
            background: "transparent"
          }}>
          <ArrowDropDown sx={{ color: "white" }} />
        </Button>
      </ButtonGroup>
      <ControlledMenu
        {...menuState}
        anchorRef={anchorRef}
        className="settings-sub-menu"
        direction={"top"}
        align="center"
        menuStyle={{
          color: theme.palette.dark.contrastText,
          backgroundColor: theme.palette.dark.light,
          border: `1px solid ${theme.palette.divider}`
        }}
        onClose={() => toggleMenu(false)}>
        {options.map(({ label, onClick }) => (
          <TSCMenuItem key={label} className="settings-sub-menu-item" onClick={onClick}>
            <Typography>{label}</Typography>
          </TSCMenuItem>
        ))}
      </ControlledMenu>
    </>
  );
};
