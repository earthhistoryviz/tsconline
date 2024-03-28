import { useEffect, useState, useContext } from "react";
import { context } from "../state/index";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { ErrorCodes } from "../util/error-codes";
import { TSCButton } from "./TSCButton";

export const TSCPopupManager = () => {
  const [popupContent, setPopupContent] = useState({ open: false, message: "" });
  const [isValidPath, setIsValidPath] = useState<boolean>(true);
  const { state, actions } = useContext(context);

  useEffect(() => {
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
    return <div>Invalid SVG Path. Please check the path and try again.</div>;
  }

  const handleClose = () => setPopupContent((prev) => ({ ...prev, open: false }));

  return (
    <Dialog open={popupContent.open} onClose={handleClose}>
      <DialogContent>
        <div dangerouslySetInnerHTML={{ __html: popupContent.message }} />
      </DialogContent>
      <DialogActions>
        <TSCButton onClick={handleClose}>Close</TSCButton>
      </DialogActions>
    </Dialog>
  );
};
