import { Alert, Slide, Typography, Snackbar, useTheme } from "@mui/material";
import { context } from "../state";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { Lottie } from "../components";
import ChartDoneIcon from "../assets/icons/chart-done.json";
import InfoIcon from "../assets/icons/info-icon.json";

type TSCSnackbarProps = {
    text: string;
    count: number;
    index: number;
    severity: "success" | "info"
};
export const TSCSnackbar: React.FC<TSCSnackbarProps> = observer(({ text, count, severity, index }) => {
    const { actions, state } = useContext(context);
    const theme = useTheme();
    const margin = index < 5 ? index * 10 : 40;
    let countDisplay = "";
    if (count > 1 && count < 1000) {
        countDisplay = `(${count})`;
    } else if (count >= 1000) {
        countDisplay = "(999+)";
    }
    let bgColor = severity === "info" ? theme.palette.snackbarAlert.light : theme.palette.snackbarAlert.main;
    function handleCloseSnackbar(_event: React.SyntheticEvent | Event, reason?: string) {
        if (reason === "clickaway") return;

        actions.removeSnackbar(text);
    }
    return (
        <Snackbar
            open={state.openSnackbar}
            style={{
                marginBottom: `${margin}px`,
                zIndex: `${1000 - index}`
            }}
            onClose={handleCloseSnackbar}
            autoHideDuration={5000}
            TransitionComponent={Slide}
        >
            <Alert
                style={{
                    backgroundColor: bgColor,
                    //border: `1px solid ${Color(bgColor).darken(4)}`
                }}
                severity={severity}
                variant="outlined"
                color={severity}
                className="success-alert"
                iconMapping={{
                    success: <Lottie animationData={ChartDoneIcon} speed={0.7} autoplay />,
                    info: <Lottie animationData={InfoIcon} speed={0.7} autoplay />
                }}>
                <Typography>{countDisplay} {text}</Typography>
            </Alert>
        </Snackbar>


    );
});
