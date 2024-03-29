import { useEffect, useState, useContext } from "react";
import { context } from "../state/index";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { ErrorCodes } from "../util/error-codes";
import { Typography } from "@mui/material";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";
import IconButton from "@mui/material/IconButton";
import DialogTitle from "@mui/material/DialogTitle";
import "./TSCPopupManager.css";

export const TSCPopupManager = () => {
  const [popupContent, setPopupContent] = useState({ open: false, message: "" });
  const [isValidPath, setIsValidPath] = useState<boolean>(true);
  const { state, actions } = useContext(context);

  useEffect(() => {
    if (!state.settings.mouseOverPopupsEnabled) return;

    const processImages = async (text: string) => {
      const srcMatches = [...text.matchAll(/src="([^"]+)"/g)];
      const imagePromises = srcMatches.map(async (match) => {
        const [fullMatch, src] = match;
        const imageName = src.split("/").pop();
        if (imageName) {
          try {
            for (const datapack of state.config.datapacks) {
              const datapackName = datapack.replace(/\.[^/.]+$/, "");
              const imageBlob = await actions.fetchImage(datapackName, imageName);
              const reader = new FileReader();
              reader.readAsDataURL(imageBlob);
              await new Promise((resolve, reject) => {
                reader.onloadend = resolve;
                reader.onerror = reject;
              });
              return { fullMatch, dataUrl: reader.result };
            }
          } catch (error) {
            console.error("Error fetching or processing image:", error);
            return { fullMatch, dataUrl: "" };
          }
        }
        return { fullMatch, dataUrl: "" };
      });

      const images = await Promise.all(imagePromises);
      let newText = text;
      images.forEach(({ fullMatch, dataUrl }) => {
        if (dataUrl) {
          newText = newText.replace(fullMatch, `src="${dataUrl}"`);
        } else {
          newText = newText.replace(fullMatch, "");
        }
      });
      return newText;
    };

    const handleMessage = async (event: MessageEvent) => {
      let url = "http://localhost:5173";
      if (import.meta.env.VITE_APP_URL) {
        url = import.meta.env.VITE_APP_URL;
      }
      if (event.origin !== url) {
        actions.pushError(ErrorCodes.INVALID_PATH);
        setIsValidPath(false);
        return;
      }

      if (event.data.action === "showPopup") {
        let text = event.data.text;
        text = await processImages(text);
        setPopupContent({ open: true, message: text });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!isValidPath) {
    return <Typography>Invalid SVG Path. Please check the path and try again.</Typography>;
  }

  const handleClose = () => setPopupContent((prev) => ({ ...prev, open: false }));

  return (
    <Dialog open={popupContent.open} onClose={handleClose} sx={{ minWidth: "260px" }}>
      <DialogTitle className="popup-title">Details</DialogTitle>
      <IconButton aria-label="close" onClick={handleClose} className="popup-close-button">
        <CloseSharpIcon />
      </IconButton>
      <DialogContent className="popup-dialog">
        <div dangerouslySetInnerHTML={{ __html: popupContent.message }} />
      </DialogContent>
    </Dialog>
  );
};
