import { Button, ButtonProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { createGradient } from "../util/util";
import { forwardRef } from "react";

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
