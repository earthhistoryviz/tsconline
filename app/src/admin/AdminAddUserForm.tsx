import { observer } from "mobx-react-lite"
import { CustomDivider, CustomFormControlLabel, TSCButton, TSCCheckbox } from "../components"
import { useContext, useState } from "react"
import { Box, Dialog, Divider, FormGroup, Modal, TextField, TextFieldProps, Typography } from "@mui/material"
import { context } from "../state"
import { ErrorCodes } from "../util/error-codes"

const FormTextField: React.FC<TextFieldProps> = (props) => {
    return <TextField  size="small" fullWidth required {...props}/>
}
export const AdminAddUserForm = observer(function AdminAddUserForm() {
    const [formOpen, setFormOpen] = useState(false)
    const { actions } = useContext(context)
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.stopPropagation();
            actions.pushError(ErrorCodes.INVALID_FORM);
            return;
        }
    }

    return (
        <Box>
            <TSCButton onClick={() => setFormOpen(!formOpen)}>Add user</TSCButton>
            <Dialog open={formOpen} onClose={() => setFormOpen(false)}>
                <Box width="50vw" height="50vh" textAlign="center" padding="10px">
                    <Typography variant="h5" mb="5px" >Add User</Typography>
                    <Box component="form"gap="20px" display="flex" flexDirection="column" onSubmit={handleSubmit}>
                        <FormTextField label="Email" autoComplete="email" autoFocus type="email"/>
                        <FormTextField label="Username" autoComplete="username" required={false}/>
                        <FormTextField label="Password" type="password"/>
                        <FormTextField label="Confirm Password" type="password"/>
                        <Box m="10px">
                            <CustomFormControlLabel control={<TSCCheckbox />} label="Make Admin User" width={150}/>
                            <TSCButton type="submit"> Add </TSCButton>
                        </Box>
                    </Box>
                </Box>
            </Dialog>
        </Box>
    )
})