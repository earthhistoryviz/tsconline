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
import isValidFilename from "valid-filename";
import "./SaveSettings.css";
import { observer } from "mobx-react-lite";
import { TSCButton } from "../components";
const SaveSettings = observer(() => {
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
    FileSaver.saveAs(blob, filename + ".tsc");
    actions.pushSnackbar("Successfully saved settings!", "success");
  }
  const [open, setOpen] = React.useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setLoadSaveFilename(e.target.value);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <React.Fragment>
      <IconButton className="icon-save-settings-button" onClick={handleClickOpen}>
        <DownloadIcon className="save-settings-button" />
      </IconButton>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: "form",
          onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault(); // to stop website from reloading
            if (!isValidFilename(state.loadSaveFilename)) {
              actions.pushSnackbar("Filename is not valid", "warning");
              return;
            }
            saveSettings(state.loadSaveFilename);
            handleClose();
          }
        }}>
        <DialogTitle>Save Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>Please enter the filename below.</DialogContentText>
          <TextField
            value={state.loadSaveFilename}
            autoFocus
            required
            margin="normal"
            type="text"
            size="small"
            fullWidth
            variant="outlined"
            onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleClose}>
            Cancel
          </Button>
          <TSCButton component="label" variant="text" sx={{ bgcolor: "button.main" }} type="submit">
            load
          </TSCButton>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
});

export default SaveSettings;
