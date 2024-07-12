import { ClickAwayListener, Tooltip, Typography, useTheme } from "@mui/material";
import { context } from "../state";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import "./TSCError.css";
import Color from "color";
import ErrorIcon from "@mui/icons-material/Error";
import { ErrorCodes } from "../util/error-codes";

type CustomErrorPopoverTextFieldProps = {
  errorContext: ErrorCodes;
  message: string;
  anchorElement: HTMLElement;
};

export const CustomErrorPopoverTextField: React.FC<CustomErrorPopoverTextFieldProps> = observer(
  ({ errorContext, message, anchorElement }) => {
    const { actions } = useContext(context);
    const theme = useTheme();
    function handleCloseError(_event: React.SyntheticEvent | Event) {
      actions.removeError(errorContext);
    }

    return (
      <ClickAwayListener onClickAway={handleCloseError}>
        <Tooltip
          open={true}
          onClose={handleCloseError}
          disableHoverListener
          title={
            <Typography
              className="alert-info-text"
              color="error.dark"
              style={{
                backgroundColor: Color(theme.palette.error.light).lighten(0.1).string()
              }}>
              <ErrorIcon
                className="error-icon-alert"
                sx={{ color: theme.palette.error.dark, position: "relative", top: 3.5, right: 3 }}
              />
              {message}
            </Typography>
          }
          placement="top"
          PopperProps={{
            anchorEl: anchorElement,
            sx: {
              ".MuiTooltip-tooltip": { bgcolor: Color(theme.palette.error.light).lighten(0.1).string(), maxWidth: 800 },
              "& .MuiTooltip-arrow::before": {
                bgcolor: Color(theme.palette.error.light).lighten(0.1).string()
              }
            }
          }}
          arrow>
          <div></div>
        </Tooltip>
      </ClickAwayListener>
    );
  }
);
