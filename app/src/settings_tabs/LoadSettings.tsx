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
import { CircularProgress, IconButton } from "@mui/material";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { CustomTooltip, InputFileUpload } from "../components";
import "./LoadSettings.css";
import { useTranslation } from "react-i18next";
export default function LoadSettings() {
  const { actions } = useContext(context);
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  async function loadSettings(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) {
      actions.pushSnackbar("Failed to load settings: no files uploaded", "info");
      return;
    }
    const file = e.target.files[0];
    if (file.name.substring(file.name.length - 4, file.name.length) !== ".tsc") {
      actions.pushSnackbar("Failed to load settings: file does not have .tsc extension", "warning");
      return;
    }
    const data = await file.text();
    try {
      actions.applySettings(xmlToJson(data));
    } catch (e) {
      console.log(e);
      actions.pushSnackbar("Failed to load settings: content of " + file.name + " is in wrong format", "info");
      return;
    }
    actions.pushSnackbar("Successfully loaded settings from " + file.name + "!", "success");
    actions.setLoadSaveFilename(file.name.substring(0, file.name.length - 4)); //remove extension
  }

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  const handleClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    await loadSettings(e);
    setIsLoading(false);
    setOpen(false);
  };

  const LoadButton = () => {
    return (
      <div>
        {isLoading === false && (
          <InputFileUpload
            text={t("settings.settings-file.load-dialog.load")}
            variant="text"
            onChange={(e) => {
              handleClick(e);
            }}
          />
        )}
        {isLoading === true && <CircularProgress />}
      </div>
    );
  };
  const { t } = useTranslation();
  return (
    <>
      <CustomTooltip title={t("settings.settings-file.load")}>
        <IconButton className="icon-load-settings-button" onClick={handleClickOpen}>
          <FileUploadIcon className="load-settings-button" />
        </IconButton>
      </CustomTooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description">
        <DialogTitle>{t("settings.settings-file.load")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("settings.settings-file.load-dialog.message")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleClose}>
            {t("settings.settings-file.load-dialog.cancel")}
          </Button>
          <LoadButton />
        </DialogActions>
      </Dialog>
    </>
  );
}
