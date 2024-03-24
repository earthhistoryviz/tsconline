import { Alert, Slide, Typography, Snackbar } from "@mui/material";
import { context } from "../state";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { Lottie } from "../components";
import ChartDoneIcon from "../assets/icons/chart-done.json";

type TSCSnackbarProps = {
    text: string;
    count: number;
    index: number;
};
export const TSCSnackbar: React.FC<TSCSnackbarProps> = observer(({ text, count, index }) => {
    const { actions, state } = useContext(context);
    const margin = index < 5 ? index * 10 : 40;
    let countDisplay = "";
    if (count > 1 && count < 1000) {
        countDisplay = `(${count})`;
    } else if (count >= 1000) {
        countDisplay = "(999+)";
    }
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
                severity="success"
                variant="filled"
                className="alert"
                iconMapping={{
                    success: <Lottie animationData={ChartDoneIcon} speed={0.7} autoplay />
                }}>
                <Typography>{countDisplay} {text}</Typography>
            </Alert>
        </Snackbar>


    );
});
