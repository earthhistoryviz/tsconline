import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';

export const TSCPopupDialog = ({ open, title, message, onYes, onNo, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="yes-no-dialog-title" aria-describedby="yes-no-dialog-description">
      <DialogTitle id="yes-no-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="yes-no-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onNo} color="primary">
          No
        </Button>
        <Button onClick={onYes} color="primary" autoFocus>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
