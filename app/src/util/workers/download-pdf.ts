import jsPDF from "jspdf";
import { DownloadPdfCompleteMessage, DownloadPdfMessage } from "../../types";
self.onmessage = async (e: MessageEvent<DownloadPdfMessage>) => {
  const { imgURI, height, width } = e.data;
  const orientation = height > width ? "portrait" : "landscape";
  const doc = new jsPDF({
    orientation: orientation,
    unit: "px",
    format: [height, width],
    compress: true
  });
  //this can take a long time, so set a timeout to not block the save chart functionality
  const addImage = new Promise((resolve, _) => {
    doc.addImage(imgURI, "png", 0, 0, width, height);
    resolve("Chart Added to PDF in download pdf worker");
  });
  //ms
  const timeoutThreshold = 30000;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Function timed out after" + timeoutThreshold + " ms"));
    }, timeoutThreshold);
  });

  const message: DownloadPdfCompleteMessage = { status: "success", value: undefined };
  async function runWithTimeout() {
    try {
      await Promise.race([addImage, timeoutPromise]);
      message.value = doc.output("blob");
    } catch (error) {
      message.status = "failure";
    }
  }
  await runWithTimeout();
  self.postMessage(message);
};
