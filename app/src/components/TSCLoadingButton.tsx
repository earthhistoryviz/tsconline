import { useTheme } from "@mui/material/styles";
import { createGradient } from "../util/util";
import { LoadingButton, LoadingButtonProps } from "@mui/lab";
import { CircularProgress } from "@mui/material";
type TSCLoadingButtonProps = {
  buttonType?: "primary" | "secondary" | "gradient";
} & LoadingButtonProps;
export const TSCLoadingButton: React.FC<TSCLoadingButtonProps> = ({ buttonType = "primary", ...props }) => {
  const theme = useTheme();
  const gradient = createGradient(theme.palette.mainGradientLeft.main, theme.palette.mainGradientRight.main);
  const color =
    buttonType === "primary"
      ? theme.palette.button
      : buttonType === "secondary"
        ? theme.palette.secondaryButton
        : gradient;
  return (
    <LoadingButton
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
      loadingIndicator={<CircularProgress color="primary" size={16} />}
      variant="contained">
      {props.children}
    </LoadingButton>
  );
};
