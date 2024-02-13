import { Alert, AlertTitle, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogProps, DialogTitle, IconButton, Snackbar, Typography, useTheme } from "@mui/material"
import { context } from "../state"
import { useContext } from "react"
import { observer } from "mobx-react-lite"
import CloseIcon from "@mui/icons-material/Close";
import { ErrorOutlineOutlined } from "@mui/icons-material";


export const TSCError: React.FC = observer(() => {
    const { state, actions } = useContext(context)
    const theme = useTheme()
    function handleCloseError(event?: React.SyntheticEvent | Event, reason?: string) {
        if (reason === 'clickaway') {
            return;
        }
        actions.setError(false, "")
    }
    // return(
    //     <Dialog onClose={handleCloseError} open={state.error.errorState}>
    //         <div style={{padding: '20px', background: theme.palette.navbar.dark}}>
    //         <div style={{ display: 'flex', alignItems: 'center', gap: '10px'}}>
    //         <ErrorOutlineOutlined color="error" />
    //         <Typography color="primary" fontSize={18}>
    //         Error
    //         </Typography>
    //         </div>
    //         <DialogContent>
    //             <DialogContentText color="primary">
    //             {state.error.errorText}
    //             </DialogContentText>
    //         </DialogContent>
    //         <DialogActions>
    //             <Button onClick={handleCloseError} color="primary">
    //             Close
    //             </Button>
    //         </DialogActions>
    //         </div>
    //     </Dialog>
    // )
    return (
    <div>
      <Snackbar
        open={state.error.errorState}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        action={
          <IconButton size="small" color="inherit" onClick={handleCloseError}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Alert onClose={handleCloseError}  severity="error" sx={{ width: '100%'}}>
            <AlertTitle> Error</AlertTitle>
          {state.error.errorText}
        </Alert>
      </Snackbar>
    </div>
  );
})