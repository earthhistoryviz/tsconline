import { observer } from "mobx-react-lite"
import { CustomDivider, CustomFormControlLabel, TSCButton, TSCCheckbox } from "../components"
import { useState } from "react"
import { Box, Dialog, Divider, FormGroup, Modal, TextField, TextFieldProps, Typography } from "@mui/material"

const FormTextField: React.FC<TextFieldProps> = (props) => {
    return <TextField  size="small" fullWidth required {...props}/>
}
export const AdminAddUserForm = observer(function AdminAddUserForm() {
    const [formOpen, setFormOpen] = useState(false)
    return (
        <Box>
            <TSCButton onClick={() => setFormOpen(!formOpen)}>Add user</TSCButton>
            <Dialog open={formOpen} onClose={() => setFormOpen(false)}>
                <Box width="50vw" height="70vh" textAlign="center" padding="10px">
                    <Typography variant="h5" mb="5px" >Add User</Typography>
                    <FormGroup sx={{ gap: "20px"}}>
                        <FormTextField label="Username" />
                        <FormTextField label="Email"/>
                        <FormTextField label="Password" type="password"/>
                        <FormTextField label="Confirm Password" type="password"/>
                    </FormGroup>
                    <CustomFormControlLabel control={<TSCCheckbox />} label="Make Admin User" width={150}/>
                </Box>
            </Dialog>
        </Box>
    )
})