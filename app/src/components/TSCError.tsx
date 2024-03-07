import { Alert, AlertTitle, Fade, IconButton, Slide, Snackbar, Typography } from "@mui/material";
import { context } from "../state";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import CloseIcon from "@mui/icons-material/Close";
import { CustomDivider, StyledScrollbar } from "./TSCComponents";
import "./TSCError.css";
import Lottie from "./TSCLottie";
import ErrorIcon from "../assets/icons/error-icon.json";

type TSCErrorProps = {
  text: string;
  id: number;
  index: number;
};
export const TSCError: React.FC<TSCErrorProps> = observer(({ text, id, index }) => {
  const { actions } = useContext(context);
  const margin = index < 5 ? index * 15 : 60;
  function handleCloseError(_event: React.SyntheticEvent | Event, reason?: string) {
    if (reason === "clickaway") return;
    actions.removeError(id, text);
  }
  return (
    <Snackbar
      open={true}
      onClose={handleCloseError}
      style={{
        marginBottom: `${margin}px`,
        zIndex: `${1000 - index}`,
        boxShadow: "0px 2px 10px 0px rgb(0, 0, 0, 0.2)",
        transition: "box-shadow 5s ease"
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      TransitionComponent={Fade}
      action={
        <IconButton size="small" color="inherit" onClick={handleCloseError}>
          <CloseIcon fontSize="small" />
        </IconButton>
      }>
      <Alert
        onClose={handleCloseError}
        icon={<Lottie animationData={ErrorIcon} autoplay width={24} height={24} />}
        severity="error"
        className="alert">
        <Typography className="error-title" variant="h2">
          {" "}
          ERROR
        </Typography>
        <CustomDivider key={`${index} error`} className="divider" />
        <StyledScrollbar>{text} </StyledScrollbar>
      </Alert>
    </Snackbar>
  );
});
