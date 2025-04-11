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
import { CustomTooltip, TSCMenuItem } from "./TSCComponents";
import styles from "./TSCComponents.module.css";

type TSCIconButtonProps = {
  buttonType?: "primary" | "secondary" | "gradient";
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
        "&.Mui-disabled": {
          color: theme.palette.mode === "dark" ? "darkgray" : "gray"
        },
        ...props.sx
      }}
      variant="contained">
      {props.children}
    </Button>
  );
});

type TSCSplitButtonProps = {
  main: {
    label: string;
    onClick: () => void;
    showText?: boolean;
    icon?: React.ReactNode;
  };
  options: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }[];
  buttonType?: "primary" | "secondary" | "gradient";
  transparent?: boolean;
  splitBorder?: boolean;
  arrowSize?: "small" | "medium" | "large";
} & ButtonGroupProps;

export const TSCSplitButton: React.FC<TSCSplitButtonProps> = ({
  main,
  options,
  buttonType,
  transparent,
  splitBorder = true,
  arrowSize = "large",
  ...props
}) => {
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
  const sx = !transparent
    ? {
        background: color["main"],
        color: color["contrastText"],
        "& .MuiButton-root:hover": {
          background: color["light"]
        },
        "& .MuiButton-root:active": {
          background: color["dark"]
        },
        "& .MuiButtonGroup-firstButton": {
          borderRight: "none"
        }
      }
    : {
        background: "transparent"
      };
  const arrowContainerClass =
    arrowSize === "small"
      ? styles.splitButtonArrowContainerSmall
      : arrowSize === "large"
        ? styles.splitButtonArrowContainerLarge
        : styles.splitButtonArrowContainerMedium;
  const arrowClass =
    arrowSize === "small"
      ? styles.splitButtonArrowSmall
      : arrowSize === "large"
        ? styles.splitButtonArrowLarge
        : styles.splitButtonArrowMedium;
  return (
    <>
      <ButtonGroup
        disableElevation
        className={styles.splitButtonGroup}
        sx={sx}
        variant="contained"
        aria-label="Button group with a nested menu"
        {...props}>
        {main.showText ? (
          <Button
            startIcon={main.icon}
            disableRipple
            color="inherit"
            className={styles.splitButtonMain}
            sx={{
              "&::after": {
                display: splitBorder ? "block" : "none !important"
              }
            }}
            onClick={() => main.onClick()}>
            {main.label}
          </Button>
        ) : (
          <CustomTooltip title={main.label}>
            <IconButton className={styles.splitButtonMain} onClick={main.onClick}>
              {main.icon}
            </IconButton>
          </CustomTooltip>
        )}
        <Button disableRipple {...anchorProps} className={arrowContainerClass} ref={anchorRef}>
          <ArrowDropDown className={arrowClass} />
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
          <TSCMenuItem key={label} className="" onClick={onClick}>
            <Typography>{label}</Typography>
          </TSCMenuItem>
        ))}
      </ControlledMenu>
    </>
  );
};
