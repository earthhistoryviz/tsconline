import React, { useEffect, useState, useContext } from "react";
import { context } from "../state/index";
import { ErrorCodes } from "../util/error-codes";

declare global {
  interface Window {
    doMOHover: (evt: MouseEvent, elemID: string, textID: string) => void;
    doMOOut: (evt: MouseEvent) => void;
    doMOClick: (evt: MouseEvent, elemID: string, textID: string) => void;
    curHoverElemID?: string;
    curHoverTextID?: string;
  }
}

interface TSCSvgComponentProps {
  path: string;
}
export const TSCSvgComponent: React.FC<TSCSvgComponentProps> = ({ path }) => {
  const [svgContent, setSvgContent] = useState<string>("");
  const [isValidPath, setIsValidPath] = useState<boolean>(true);
  const { actions } = useContext(context);

  useEffect(() => {
    let url: string = "http://localhost:3000";
    if (import.meta.env.VITE_SERVER_URL) {
      url = import.meta.env.VITE_SERVER_URL;
    }
    if (!path.startsWith(url)) {
      actions.pushError(ErrorCodes.INVALID_SVG_PATH);
      setIsValidPath(false);
      return;
    }
    fetch(path)
      .then((response) => response.text())
      .then((text) => setSvgContent(text))
      .catch(() => {
        actions.pushError(ErrorCodes.INVALID_SVG_REPONSE);
        setIsValidPath(false);
      });
  }, [path]);

  if (!isValidPath) {
    return <div>Invalid SVG Path. Please check the path and try again.</div>;
  }

  /* eslint @typescript-eslint/no-unused-vars: "off" -- These functions need to match the signatures used by the SVG */

  window.doMOHover = (evt, elemID, textID) => {
    const e = document.getElementById(elemID);
    if (!e) return;
    e.setAttribute("opacity", "1");
    window.curHoverElemID = elemID;
    window.curHoverTextID = textID;
  };

  window.doMOOut = (evt) => {
    const elem = window.curHoverElemID ? document.getElementById(window.curHoverElemID) : null;
    if (elem) elem.setAttribute("opacity", "0");
  };

  window.doMOClick = (evt, elemID, textID) => {
    const textElement = document.getElementById(textID);
    const text = textElement ? textElement.getAttribute("popuptext") : "";
    let url: string = "http://localhost:5173";
    if (import.meta.env.VITE_APP_URL) {
      url = import.meta.env.VITE_APP_URL;
    }
    if (typeof window.top === "undefined") {
      alert(textID);
    } else if (window.top !== null) {
      window.top.postMessage({ action: "showPopup", text }, url);
    }
  };

  return <div dangerouslySetInnerHTML={{ __html: svgContent }} />;
};
