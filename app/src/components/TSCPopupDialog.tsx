import React from "react";
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { TSCButton } from "./TSCButton";

type TSCPopupDialogProps = {
  open: boolean;
  title: string;
  message: string;
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
      aria-describedby="yes-no-dialog-description">
      <DialogTitle id="yes-no-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="yes-no-dialog-description">{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <TSCButton onClick={onNo}>No</TSCButton>
        <TSCButton onClick={onYes}>Yes</TSCButton>
      </DialogActions>
    </Dialog>
  );
};
