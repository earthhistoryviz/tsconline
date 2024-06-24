import { Button, ButtonProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { createGradient } from "../util/util";

type TSCButtonProps = {
  buttonType?: "primary" | "secondary" | "gradient";
} & ButtonProps;
export const TSCButton: React.FC<TSCButtonProps> = ({ buttonType = "primary", ...props }) => {
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
      disableRipple
      sx={{
        ...props.sx,
        background: color["main"],
        color: color["contrastText"],
        ":hover": {
          background: color["light"]
        },
        ":active": {
          background: color["dark"]
        }
      }}
      variant="contained">
      {props.children}
    </Button>
  );
};
