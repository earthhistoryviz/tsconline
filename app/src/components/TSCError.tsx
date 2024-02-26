import { Alert, AlertTitle, IconButton, Snackbar } from "@mui/material";
import { context } from "../state";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import CloseIcon from "@mui/icons-material/Close";

type TSCErrorProps = {
  text: string;
  id: number;
};
export const TSCError: React.FC<TSCErrorProps> = observer(({ text, id }) => {
  const { actions } = useContext(context);
  function handleCloseError(
    _event: React.SyntheticEvent | Event,
    reason?: string
  ) {
    if (reason === "clickaway") return;
    actions.removeError(id);
  }
  return (
    <Snackbar
      open={true}
      onClose={handleCloseError}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      action={
        <IconButton size="small" color="inherit" onClick={handleCloseError}>
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    >
      <Alert onClose={handleCloseError} severity="error" sx={{ width: "100%" }}>
        <AlertTitle> Error</AlertTitle>
        {text}
      </Alert>
    </Snackbar>
  );
});
