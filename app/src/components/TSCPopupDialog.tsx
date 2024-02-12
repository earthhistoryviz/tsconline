import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import "./TSCPopupDialog.css" // Ensure this file path is correct

export const TSCPopupDialog = ({ open, title, message, onYes, onNo, onClose }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      aria-labelledby="yes-no-dialog-title" 
      aria-describedby="yes-no-dialog-description"
      classes={{ paper: 'dialog' }} // Apply the custom 'dialog' class to the Dialog's paper element
    >
      <DialogTitle id="yes-no-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="yes-no-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions className="dialog-actions"> {/* Use custom actions class */}
        <Button onClick={onNo} className="dialog-button" color="primary">
          No
        </Button>
        <Button onClick={onYes} className="dialog-button" color="primary" autoFocus>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
