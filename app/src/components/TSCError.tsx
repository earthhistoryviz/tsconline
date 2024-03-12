import { Fade, IconButton, Snackbar, Typography, useTheme } from "@mui/material";
import { context } from "../state";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import CloseIcon from "@mui/icons-material/Close";
import { CustomDivider, StyledScrollbar } from "./TSCComponents";
import "./TSCError.css";
import Lottie from "./TSCLottie";
import ErrorIcon from "../assets/icons/error-icon.json";
import Color from "color";

type TSCErrorProps = {
  text: string;
  id: number;
  index: number;
  count: number;
};
export const TSCError: React.FC<TSCErrorProps> = observer(({ text, id, index, count }) => {
  const { actions } = useContext(context);
  const theme = useTheme();
  const margin = index < 5 ? index * 10 : 40;
  let countDisplay = "";
  if (count > 1 && count < 1000) {
    countDisplay = `(${count})`;
  } else if (count >= 1000) {
    countDisplay = "(999+)";
  }
  function handleCloseError(_event: React.SyntheticEvent | Event, reason?: string) {
    if (reason === "clickaway") return;
    actions.removeError(id, text);
  }
  return (
    <Snackbar
      open={true}
      style={{
        marginBottom: `${margin}px`,
        zIndex: `${1000 - index}`
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      TransitionComponent={Fade}>
      <div
        className="alert"
        style={{
          backgroundColor: theme.palette.errorAlert.main,
          border: `1px solid ${Color(theme.palette.errorText.main).lighten(0.4)}`
        }}>
        <div className="alert-header">
          <div className="alert-title">
            <Lottie animationData={ErrorIcon} autoplay width={20} height={20} />
            <Typography color={theme.palette.errorText.main} className="error-title" variant="h2">
              Error {countDisplay}
            </Typography>
          </div>
          <IconButton className="alert-close" onClick={handleCloseError}>
            <CloseIcon className="alert-close-icon" style={{ color: theme.palette.errorText.main }} />
          </IconButton>
        </div>
        <CustomDivider key={`${index} error`} />
        <StyledScrollbar className="alert-text">
          <Typography className="alert-info-text" color={theme.palette.errorText.main}>
            {text}
          </Typography>
        </StyledScrollbar>
      </div>
    </Snackbar>
  );
});
