import React from "react";
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { TSCButton } from "./TSCButton";
import "./TSCPopupDialog.css";

type TSCPopupDialogProps = {
  open: boolean;
  title: string;
  message?: string;
  onYes: () => void;
  onNo: () => void;
  onClose: () => void;
};
export const TSCPopupDialog: React.FC<TSCPopupDialogProps> = ({ open, title, message, onYes, onNo, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="yes-no-dialog-title"
      aria-describedby="yes-no-dialog-description"
      className="dialog-paper">
      <DialogTitle id="yes-no-dialog-title">{title}</DialogTitle>
      <DialogContent className="dialog-content">
        <DialogContentText id="yes-no-dialog-description">{message}</DialogContentText>
      </DialogContent>
      <DialogActions className="dialog-actions">
        <TSCButton className="tsc-button" onClick={onYes}>
          Yes
        </TSCButton>
        <TSCButton className="tsc-button" onClick={onNo}>
          No
        </TSCButton>
      </DialogActions>
    </Dialog>
  );
};
