import { Dialog, DialogProps, Typography } from "@mui/material"
import { context } from "../state"
import { useContext } from "react"
import { observer } from "mobx-react-lite"


export const TSCErrorDialog: React.FC<DialogProps> = observer(() => {
    const { state, actions } = useContext(context)
    function handleCloseError() {
        actions.setError(false, "")
    }
    return(
        <Dialog onClose={handleCloseError} open={state.error.errorState}>
            <>
            <Typography>
                {state.error.errorText}
            </Typography>
            </>
        </Dialog>
    )
})