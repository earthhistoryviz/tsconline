import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { TSCButton } from "./TSCButton";
import "./TSCYesNoPopup.css";
import { useTranslation } from "react-i18next";

type TSCYesNoPopup = {
  open: boolean;
  title: string;
  message?: string;
  onYes: () => void;
  onNo: () => void;
  onClose: () => void;
  customYes?: string;
  customNo?: string;
};
export const TSCYesNoPopup: React.FC<TSCYesNoPopup> = ({
  open,
  title,
  message,
  onYes,
  onNo,
  onClose,
  customNo,
  customYes
}) => {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="yes-no-dialog-title"
      aria-describedby="yes-no-dialog-description"
      className="tsc-dialog">
      <DialogTitle id="yes-no-dialog-title">{title}</DialogTitle>
      <DialogContent className="dialog-content" sx={{ mb: 2 }}>
        <DialogContentText className="yes-no-dialog-description">{message}</DialogContentText>
      </DialogContent>
      <DialogActions className="dialog-actions">
        <Button variant="outlined" className="tsc-button" onClick={onNo}>
          {customNo ?? t("no")}
        </Button>
        <TSCButton buttonType="gradient" className="tsc-button" onClick={onYes}>
          {customYes ?? t("yes")}
        </TSCButton>
      </DialogActions>
    </Dialog>
  );
};
