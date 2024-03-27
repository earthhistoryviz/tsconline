import { useEffect, useState, useContext } from "react";
import { context } from "../state/index";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { ErrorCodes } from "../util/error-codes";
import { TSCButton } from "./TSCButton";

export const TSCPopupManager = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isValidPath, setIsValidPath] = useState<boolean>(true);
  const { actions } = useContext(context);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let url: string = "http://localhost:5173";
      if (import.meta.env.VITE_APP_URL) {
        url = import.meta.env.VITE_APP_URL;
      }
      if (event.origin !== url) {
        actions.pushError(ErrorCodes.INVALID_SVG_PATH);
        setIsValidPath(false);
        return;
      }

      if (event.data.action === "showPopup") {
        setMessage(event.data.text);
        setOpen(true);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!isValidPath) {
    return <div>Invalid SVG Path. Please check the path and try again.</div>;
  }

  const handleClose = () => setOpen(false);

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent>
        <div dangerouslySetInnerHTML={{ __html: message }} />
      </DialogContent>
      <DialogActions>
        <TSCButton onClick={handleClose}>Close</TSCButton>
      </DialogActions>
    </Dialog>
  );
};
