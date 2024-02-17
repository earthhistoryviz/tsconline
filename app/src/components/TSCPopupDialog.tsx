import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { TSCButton } from './TSCButton';

export const TSCPopupDialog = ({ open, title, message, onYes, onNo, onClose }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      aria-labelledby="yes-no-dialog-title" 
      aria-describedby="yes-no-dialog-description"
    >
      <DialogTitle id="yes-no-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="yes-no-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <TSCButton onClick={onNo}>
          No
        </TSCButton>
        <TSCButton onClick={onYes}>
          Yes
        </TSCButton>
      </DialogActions>
    </Dialog>
  );
};
