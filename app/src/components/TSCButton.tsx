import {
  Button,
  ButtonGroup,
  ButtonGroupProps,
  ButtonProps,
  ClickAwayListener,
  Grow,
  MenuItem,
  MenuList,
  Paper,
  Popper
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { createGradient } from "../util/util";
import { forwardRef, useRef, useState } from "react";
import { ArrowDropDown } from "@mui/icons-material";
import React from "react";

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
  }[];
  buttonType?: "primary" | "secondary" | "gradient";
} & ButtonGroupProps;

export const TSCSplitButton: React.FC<TSCSplitButtonProps> = ({ options, buttonType, ...props }) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const theme = useTheme();
  const gradient = createGradient(theme.palette.mainGradientLeft.main, theme.palette.mainGradientRight.main);
  const color =
    buttonType === "primary"
      ? theme.palette.button
      : buttonType === "secondary"
        ? theme.palette.secondaryButton
        : gradient;
  const handleClick = () => {
    options[selectedIndex].onClick();
  };
  const handleMenuItemClick = (event: React.MouseEvent<HTMLLIElement, MouseEvent>, index: number) => {
    setSelectedIndex(index);
    setOpen(false);
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }

    setOpen(false);
  };

  return (
    <>
      <ButtonGroup variant="contained" ref={anchorRef} aria-label="Button group with a nested menu" {...props}>
        <Button
          disableRipple
          sx={{
            background: color["main"],
            color: color["contrastText"],
            ":hover": {
              background: color["light"]
            },
            ":active": {
              background: color["dark"]
            }
          }}
          onClick={handleClick}>
          {options[selectedIndex].label}
        </Button>
        <Button
          size="small"
          disableRipple
          sx={{
            background: color["main"],
            color: color["contrastText"],
            ":hover": {
              background: color["light"]
            },
            ":active": {
              background: color["dark"]
            }
          }}
          onClick={handleToggle}>
          <ArrowDropDown />
        </Button>
      </ButtonGroup>
      <Popper sx={{ zIndex: 1 }} open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal>
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === "bottom" ? "center top" : "center bottom"
            }}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="split-button-menu" autoFocusItem>
                  {options.map(({ label }, index) => (
                    <MenuItem
                      key={label}
                      disabled={index === 2}
                      selected={index === selectedIndex}
                      onClick={(event) => handleMenuItemClick(event, index)}>
                      {label}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
};
