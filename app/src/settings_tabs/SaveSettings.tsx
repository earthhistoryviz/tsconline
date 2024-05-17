import * as React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FileSaver from "file-saver";
import { context } from "../state";
import { ColumnInfo } from "@tsconline/shared";
import { cloneDeep } from "lodash";
import { ChartSettings } from "../types";
import { jsonToXml } from "../state/parse-settings";
import { IconButton } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

export default function SaveSettings() {
  const { state, actions } = React.useContext(context);
  function saveSettings(filename: string) {
    if (!state.settingsTabs.columns) {
      actions.pushSnackbar("Column Root is not set, try again after selecting a datapack", "info");
      return;
    }
    if (state.settingsTabs.columns.children.length === 0) {
      actions.pushSnackbar("No columns are set, proceeding...", "info");
    }
    const columnCopy: ColumnInfo = cloneDeep(state.settingsTabs.columns!);
    const settingsCopy: ChartSettings = cloneDeep(state.settings);
    const blob = new Blob([jsonToXml(columnCopy, settingsCopy)], { type: "text/plain;charset=utf-8" });
    FileSaver.saveAs(blob, filename);
    actions.pushSnackbar("successfully saved settings!", "success");
  }
  const [open, setOpen] = React.useState(false);
  const [filename, setFilename] = React.useState("settings.tsc");
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleChange = (e: { target: { value: React.SetStateAction<string> } }) => {
    setFilename(e.target.value);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <React.Fragment>
      <IconButton onClick={handleClickOpen}>
        <DownloadIcon />
      </IconButton>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: "form",
          onSubmit: () => {
            //TODO: check filename format
            saveSettings(filename);
            handleClose();
          }
        }}>
        <DialogTitle>Subscribe</DialogTitle>
        <DialogContent>
          <DialogContentText>Please enter the filename below.</DialogContentText>
          <TextField
            defaultValue={filename}
            autoFocus
            required
            margin="dense"
            id="name"
            name="filename"
            label="filename"
            type="text"
            fullWidth
            variant="standard"
            onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
