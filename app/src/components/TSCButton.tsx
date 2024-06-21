import { Button, ButtonProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";

type TSCButtonProps = {
  buttonType?: "primary" | "secondary" | "gradient";
} & ButtonProps;
export const TSCButton: React.FC<TSCButtonProps> = ({ buttonType = "primary", ...props }) => {
  const theme = useTheme();
  const color =
    buttonType === "primary"
      ? theme.palette.button
      : buttonType === "secondary"
        ? theme.palette.secondaryButton
        : theme.palette.mainGradient;
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
