import { useEffect, useState, useContext } from "react";
import { context } from "../state/index";
import { ErrorCodes } from "../util/error-codes";
import { Typography } from "@mui/material";
import { TSCPopup } from "./TSCPopup";

export const TSCPopupManager = () => {
  const [popupContent, setPopupContent] = useState({ open: false, message: "" });
  const [isValidPath, setIsValidPath] = useState<boolean>(true);
  const { state, actions } = useContext(context);

  useEffect(() => {
    if (!state.prevSettings.mouseOverPopupsEnabled) return;

    const processImages = async (text: string) => {
      const srcMatches = [...text.matchAll(/src="([^"]+)"/g)];
      const imagePromises = srcMatches.map(async (match) => {
        const [fullMatch, src] = match;
        const imageName = src.split("/").pop();
        if (imageName) {
          try {
            for (const datapack of state.config.datapacks) {
              const imageBlob = await actions.fetchImage(datapack, imageName);
              const reader = new FileReader();
              reader.readAsDataURL(imageBlob);
              await new Promise((resolve, reject) => {
                reader.onloadend = resolve;
                reader.onerror = reject;
              });
              return { fullMatch, dataUrl: reader.result };
            }
          } catch (error) {
            actions.pushError(ErrorCodes.INVALID_PATH);
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
      const url = window.location.origin;
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

  const addTargetBlank = (html: string) => {
    return html.replace(/<a\s+href=/g, '<a target="_blank" href=');
  };
  const processedPopupContent = addTargetBlank(popupContent.message);
  return (
    <TSCPopup
      open={popupContent.open}
      title="Details"
      message={processedPopupContent}
      onClose={() => setPopupContent((prev) => ({ ...prev, open: false }))}
      dangerous={true}
      maxWidth="lg"
    />
  );
};
