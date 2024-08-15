import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { TSCButton } from "./TSCButton";
import "./TSCPopupDialog.css";

type TSCPopupDialogProps = {
  open: boolean;
  title: string;
  message?: string;
  onYes: () => void;
  onNo: () => void;
  onClose: () => void;
  customYes?: string;
  customNo?: string;
};
export const TSCPopupDialog: React.FC<TSCPopupDialogProps> = ({
  open,
  title,
  message,
  onYes,
  onNo,
  onClose,
  customNo,
  customYes
}) => {
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
          {customNo ?? "No"}
        </Button>
        <TSCButton buttonType="gradient" className="tsc-button" onClick={onYes}>
          {customYes ?? "Yes"}
        </TSCButton>
      </DialogActions>
    </Dialog>
  );
};
