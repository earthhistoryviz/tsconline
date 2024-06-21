import { Alert, Slide, Typography, Snackbar, useTheme } from "@mui/material";
import { context } from "../state";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { Lottie } from "../components";
import ChartDoneIcon from "../assets/icons/chart-done.json";
import InfoIcon from "../assets/icons/info-icon.json";
import WarningIcon from "../assets/icons/warning-icon.json";
import "./TSCSnackbar.css";
import Color from "color";

type TSCSnackbarProps = {
  text: string;
  count: number;
  index: number;
  severity: "success" | "info" | "warning";
};
export const TSCSnackbar: React.FC<TSCSnackbarProps> = observer(({ text, count, severity, index }) => {
  const { actions } = useContext(context);
  const theme = useTheme();
  const margin = index < 5 ? index * 10 : 40;
  let countDisplay = "";
  if (count > 1 && count < 1000) {
    countDisplay = `(${count})`;
  } else if (count >= 1000) {
    countDisplay = "(999+)";
  }
  const bgColor =
    severity === "info"
      ? theme.palette.snackbarAlert.light
      : severity === "success"
        ? theme.palette.snackbarAlert.main
        : theme.palette.warningAlert.main;
  const fontSize = text.length < 56 ? 1 : text.length < 59 ? 0.9 : 0.85;
  function handleCloseSnackbar(_event: React.SyntheticEvent | Event, reason?: string) {
    if (reason === "clickaway") return;

    actions.removeSnackbar(text);
  }
  const iconMapping = {
    success: <Lottie key={text} style={{ flexShrink: 0 }} animationData={ChartDoneIcon} speed={0.7} autoplay />,
    info: <Lottie key={text} style={{ flexShrink: 0 }} animationData={InfoIcon} speed={0.7} autoplay />,
    warning: <Lottie key={text} style={{ flexShrink: 0 }} animationData={WarningIcon} speed={0.7} autoplay />
  }
  return (
    <Snackbar
      open={true}
      style={{
        marginBottom: `${margin}px`,
        zIndex: `${100000 - index}`
      }}
      autoHideDuration={5000}
      onClose={handleCloseSnackbar}
      TransitionComponent={Slide}>
      <div
        style={{
          backgroundColor: bgColor,
          outline: `2px solid ${Color(bgColor).darken(0.2).hex()}`
        }}
        className="snackbar">
        {iconMapping[severity]}
        <Typography className="snackbar-text" color="black" style={{ fontSize: `${fontSize}rem` }}>
          {countDisplay} {text}
        </Typography>
      </div>
    </Snackbar>
  );
});
