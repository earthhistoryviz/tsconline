import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogProps, DialogTitle, Typography, useTheme } from "@mui/material"
import { context } from "../state"
import { useContext } from "react"
import { observer } from "mobx-react-lite"
import { ErrorOutlineOutlined } from "@mui/icons-material"


export const TSCErrorDialog: React.FC = observer(() => {
    const { state, actions } = useContext(context)
    const theme = useTheme()
    function handleCloseError() {
        actions.setError(false, "")
    }
    return(
        <Dialog onClose={handleCloseError} open={state.error.errorState}>
            <div style={{padding: '20px', background: theme.palette.navbar.dark}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px'}}>
            <ErrorOutlineOutlined color="error" />
            <Typography color="primary" fontSize={18}>
            Error
            </Typography>
            </div>
            <DialogContent>
                <DialogContentText id="error-dialog-description" color="primary">
                {state.error.errorText}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseError} color="primary">
                Close
                </Button>
            </DialogActions>
            </div>
        </Dialog>
    )
})