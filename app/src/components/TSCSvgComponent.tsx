import React, { useEffect, useContext, useRef } from "react";
import { context } from "../state/index";
import { observer } from "mobx-react-lite";

interface SVGWindow extends Window {
  curHoverElemID?: string;
  curHoverTextID?: string;
}

type TSCSvgComponentProps = {
  chartContent: string;
};

export const TSCSvgComponent: React.FC<TSCSvgComponentProps> = observer(({ chartContent }) => {
  const { state } = useContext(context);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const handleSvgEvent = (evt: MouseEvent, container: HTMLElement) => {
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
            const elem = svgEventWindow.curHoverElemID ? document.getElementById(svgEventWindow.curHoverElemID) : null;
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
        }
        break;
      }
      currentElement = currentElement.parentElement;
    }
  };

  useEffect(() => {
    if (!state.settings.mouseOverPopupsEnabled) return;

    const container = svgContainerRef.current;
    if (!container) return;

    const eventListenerWrapper = (evt: MouseEvent) => handleSvgEvent(evt, container);
    container.addEventListener("mouseover", eventListenerWrapper);
    container.addEventListener("mouseout", eventListenerWrapper);
    container.addEventListener("click", eventListenerWrapper);

    return () => {
      container.removeEventListener("mouseover", eventListenerWrapper);
      container.removeEventListener("mouseout", eventListenerWrapper);
      container.removeEventListener("click", eventListenerWrapper);
    };
  }, [chartContent, state.settings.mouseOverPopupsEnabled]);

  return <div ref={svgContainerRef} dangerouslySetInnerHTML={{ __html: chartContent }} />;
});
