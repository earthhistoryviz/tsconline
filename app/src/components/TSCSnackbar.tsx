import { Alert, Slide, Typography, Snackbar } from "@mui/material";
import { context } from "../state";
import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { Lottie } from "../components";
import ChartDoneIcon from "../assets/icons/chart-done.json";

type TSCSnackbarProps = {
    text: string;
    id: number;
};
export const TSCSnackbar: React.FC<TSCSnackbarProps> = observer(({ text, id }) => {
    const { actions } = useContext(context);
    function handleCloseSnackbar(_event: React.SyntheticEvent | Event, reason?: string) {
        if (reason === "clickaway") return;
        actions.removeSnackbar(id);
    }
    return (
        <Snackbar
            open={true}
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
                <Typography>{text}</Typography>
            </Alert>
        </Snackbar>


    );
});
