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
import isValidFilename from "valid-filename";
import { jsonToXml } from "../state/parse-settings";
import { observer } from "mobx-react-lite";
import { CustomTooltip } from "../components";
import { useTranslation } from "react-i18next";
import "./SaveSettings.css";

const SaveSettings = observer(() => {
  const { state, actions } = React.useContext(context);
  const { t } = useTranslation();

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
    const blob = new Blob([jsonToXml(columnCopy, state.settingsTabs.columnHashMap, settingsCopy)], {
      type: "text/plain;charset=utf-8"
    });
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
      <CustomTooltip title={t("settings.preferences.settings-file.save")}>
        <Button variant="contained" color="primary" onClick={handleClickOpen} className="save-settings-button">
          {t("settings.preferences.settings-file.save")}
        </Button>
      </CustomTooltip>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: "form",
          onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!isValidFilename(state.loadSaveFilename)) {
              actions.pushSnackbar("Filename is not valid", "warning");
              return;
            }
            saveSettings(state.loadSaveFilename);
            handleClose();
          }
        }}>
        <DialogTitle>{t("settings.preferences.settings-file.save")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("settings.preferences.settings-file.save-dialog.message")}</DialogContentText>
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
            {t("settings.preferences.settings-file.save-dialog.cancel")}
          </Button>
          <Button variant="contained" type="submit" color="primary" className="save-settings-button">
            {t("settings.preferences.settings-file.save-dialog.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
});

export default SaveSettings;
