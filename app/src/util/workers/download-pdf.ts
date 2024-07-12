import jsPDF from "jspdf";
import { DownloadPdfMessage } from "../../types";
self.onmessage = (e: MessageEvent<DownloadPdfMessage>) => {
  const { imgURI, height, width } = e.data;
  const orientation = height > width ? "portrait" : "landscape";
  const doc = new jsPDF({
    orientation: orientation,
    unit: "px",
    format: [height, width],
    compress: true
  });
  doc.addImage(imgURI, "png", 0, 0, width, height);
  const blob = doc.output("blob");
  self.postMessage(blob);
};
