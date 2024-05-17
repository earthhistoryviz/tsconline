import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useContext } from "react";
import { context } from "../state";
import { xmlToJson } from "../state/parse-settings";
import { IconButton } from "@mui/material";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { InputFileUpload } from "../components";

export default function LoadSettings() {
  const { actions } = useContext(context);
  const [open, setOpen] = React.useState(false);

  async function loadSettings(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) {
      actions.pushSnackbar("failed to load settings: no files uploaded", "info");
      return;
    }
    const file = e.target.files[0];
    const data = await file.text();
    try {
      actions.applySettings(xmlToJson(data));
    } catch (e) {
      console.log(e);
      actions.pushSnackbar("Failed to load settings: file content is in wrong format", "info");
      return;
    }
    actions.pushSnackbar("successfully loaded settings!", "success");
  }

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <IconButton onClick={handleClickOpen}>
        <FileUploadIcon />
      </IconButton>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">Load Settings</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This will overwrite any changes you&apos;ve made!
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <div onClick={handleClose}>
            <InputFileUpload text="Load" onChange={loadSettings} />
          </div>
        </DialogActions>
      </Dialog>
    </>
  );
}
