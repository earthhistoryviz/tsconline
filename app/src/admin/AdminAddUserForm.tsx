import { observer } from "mobx-react-lite";
import { CustomFormControlLabel, TSCButton, TSCCheckbox } from "../components";
import { useContext, useState } from "react";
import { Box, Dialog, TextField, TextFieldProps, Typography } from "@mui/material";
import { context } from "../state";
import { ErrorCodes } from "../util/error-codes";

const FormTextField: React.FC<TextFieldProps> = (props) => {
  return <TextField size="small" fullWidth required {...props} />;
};
export const AdminAddUserForm = observer(function AdminAddUserForm() {
  const [formOpen, setFormOpen] = useState(false);
  const { state, actions } = useContext(context);
  const [passwordError, setPasswordError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      actions.pushError(ErrorCodes.INVALID_FORM);
      return;
    }
    if (state.admin.displayedUsers.find((user) => user.email === form.email.value)) {
      setEmailError("Email already exists");
      return;
    }
    setEmailError("");
    if (form.username.value && state.admin.displayedUsers.find((user) => user.username === form.username.value)) {
      setUsernameError("Username already exists");
      return;
    }
    setUsernameError("");
    if (form.password.value !== form.confirmPassword.value) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordError("");
    actions.adminAddUser(form.email.value, form.password.value, form.isAdmin.checked, form.username.value);
  };

  return (
    <Box>
      <TSCButton onClick={() => setFormOpen(!formOpen)}>Add user</TSCButton>
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} PaperProps={{ sx: { maxWidth: "30vw" } }}>
        <Box width="30vw" textAlign="center" padding="10px">
          <Typography variant="h5" mb="5px">
            Add User
          </Typography>
          <Box component="form" gap="20px" display="flex" flexDirection="column" onSubmit={handleSubmit}>
            <FormTextField
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              type="email"
              helperText={emailError}
              error={!!emailError}
            />
            <FormTextField
              label="Username"
              name="username"
              autoComplete="username"
              required={false}
              helperText={usernameError}
              error={!!usernameError}
            />
            <FormTextField label="Password" name="password" type="password" />
            <FormTextField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              helperText={passwordError}
              error={!!passwordError}
            />
            <Box m="10px">
              <CustomFormControlLabel control={<TSCCheckbox name="isAdmin" />} label="Make Admin User" width={150} />
              <TSCButton type="submit"> Add </TSCButton>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
});
