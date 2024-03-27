import React, { useEffect, useState, useContext, useRef } from "react";
import { context } from "../state/index";
import { ErrorCodes } from "../util/error-codes";
import DOMPurify from "dompurify";

interface SVGWindow extends Window {
  curHoverElemID?: string;
  curHoverTextID?: string;
}

type TSCSvgComponentProps = {
  path: string;
};

export const TSCSvgComponent: React.FC<TSCSvgComponentProps> = ({ path }) => {
  const [svgContent, setSvgContent] = useState<string>("");
  const [isValidPath, setIsValidPath] = useState<boolean>(true);
  const { actions, state } = useContext(context);
  const svgContainerRef = useRef<HTMLDivElement>(null);

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
      .then((text) => {
        const domPurifyConfig = {
          ADD_ATTR: ["popuptext"]
        };
        const sanitizedSVG = DOMPurify.sanitize(text, domPurifyConfig);
        setSvgContent(sanitizedSVG);
      })
      .catch(() => {
        actions.pushError(ErrorCodes.INVALID_SVG_RESPONSE);
        setIsValidPath(false);
      });
  }, [path]);

  useEffect(() => {
    if (!state.settings.mouseOverPopupsEnabled) return;

    const container = svgContainerRef.current;
    if (!container) return;

    const handleSvgEvent = (evt: MouseEvent) => {
      const target = evt.target as HTMLElement;
      const svgEventWindow = window as SVGWindow;

      let currentElement: HTMLElement | null = target;
      while (currentElement && currentElement !== container) {
        if (currentElement.id && currentElement.id.startsWith("spawner")) {
          const elemID = currentElement.id;
          const textID = `id${elemID.replace("spawner", "")}`;

          switch (evt.type) {
            case "mouseover": {
              const e = document.getElementById(elemID);
              if (!e) return;
              e.setAttribute("opacity", "1");
              svgEventWindow.curHoverElemID = elemID;
              svgEventWindow.curHoverTextID = textID;
              break;
            }
            case "mouseout": {
              const elem = svgEventWindow.curHoverElemID
                ? document.getElementById(svgEventWindow.curHoverElemID)
                : null;
              if (elem) elem.setAttribute("opacity", "0");
              break;
            }
            case "click": {
              const textElement = document.getElementById(textID);
              const text = textElement ? textElement.getAttribute("popuptext") : "";
              let url: string = "http://localhost:5173";
              if (import.meta.env.VITE_APP_URL) {
                url = import.meta.env.VITE_APP_URL;
              }
              if (typeof svgEventWindow.top === "undefined") {
                alert(textID);
              } else if (svgEventWindow.top !== null) {
                svgEventWindow.top.postMessage({ action: "showPopup", text }, url);
              }
              break;
            }
            default:
              break;
          }
          break;
        }
        currentElement = currentElement.parentElement;
      }
    };

    container.addEventListener("mouseover", handleSvgEvent);
    container.addEventListener("mouseout", handleSvgEvent);
    container.addEventListener("click", handleSvgEvent);

    return () => {
      container.removeEventListener("mouseover", handleSvgEvent);
      container.removeEventListener("mouseout", handleSvgEvent);
      container.removeEventListener("click", handleSvgEvent);
    };
  }, [svgContent, state.settings.mouseOverPopupsEnabled]);

  if (!isValidPath) {
    return <div>Invalid SVG Path. Please check the path and try again.</div>;
  }

  return <div ref={svgContainerRef} dangerouslySetInnerHTML={{ __html: svgContent }} />;
};
