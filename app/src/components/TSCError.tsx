import { Fade, IconButton, Snackbar, Typography, useTheme } from "@mui/material";
import { context } from "../state";
import { useContext, RefObject } from "react";
import { observer } from "mobx-react-lite";
import CloseIcon from "@mui/icons-material/Close";
import { CustomDivider, StyledScrollbar } from "./TSCComponents";
import "./TSCError.css";
import Color from "color";
import ErrorIcon from "@mui/icons-material/Error";
import { ErrorCodes } from "../util/error-codes";

type TSCErrorProps = {
  errorContext: ErrorCodes;
  message: string;
  index: number;
  count: number;
};
export const TSCError: React.FC<TSCErrorProps> = observer(({ errorContext, message, index, count }) => {
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
    actions.removeError(errorContext);
  }
  return (
    <Snackbar
      open={true}
      style={{
        marginBottom: `${margin}px`,
        zIndex: `${100000 - index}`
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      TransitionComponent={Fade}>
      <div
        className="alert"
        style={{
          backgroundColor: Color(theme.palette.error.light).lighten(0.1).string(),
          border: `1px solid ${Color(theme.palette.error.light).darken(0.4)}`
        }}>
        <div className="alert-header">
          <div className="alert-title">
            <ErrorIcon className="error-icon-alert" sx={{ color: theme.palette.error.dark }} />
            <Typography className="error-title" variant="h2" color="error.dark">
              Error {countDisplay}
            </Typography>
          </div>
          <IconButton className="alert-close" onClick={handleCloseError} size="large">
            <CloseIcon className="alert-close-icon" style={{ color: theme.palette.error.dark }} />
          </IconButton>
        </div>
        <CustomDivider key={`${index} error`} />
        <StyledScrollbar className="alert-text">
          <Typography className="alert-info-text" color="error.dark">
            {message}
          </Typography>
        </StyledScrollbar>
      </div>
    </Snackbar>
  );
});
