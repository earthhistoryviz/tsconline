import { Dialog, DialogContent, IconButton, Box, Typography, useTheme } from "@mui/material";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";
import "./TSCPopup.css";

type TSCPopupProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  dangerous?: boolean;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
};
export const TSCPopup: React.FC<TSCPopupProps> = ({
  open,
  title,
  message,
  onClose,
  dangerous = false,
  maxWidth = "sm"
}) => {
  const theme = useTheme();
  return (
    <Dialog className="popup-dialog" open={open} onClose={onClose} maxWidth={maxWidth} fullWidth={true}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography className="popup-title" m={2}>
          {title}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          className={theme.palette.mode === "dark" ? "popup-close-button-dark" : "popup-close-button"}>
          <CloseSharpIcon />
        </IconButton>
      </Box>
      <DialogContent className="popup-content">
        {dangerous ? <div dangerouslySetInnerHTML={{ __html: message }} /> : <>{message}</>}
      </DialogContent>
    </Dialog>
  );
};
