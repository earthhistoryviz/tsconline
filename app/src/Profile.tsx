import React, { useState, useContext } from "react";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Avatar from "@mui/material/Avatar";
import { context } from "./state";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import PersonIcon from "@mui/icons-material/Person";
import { observer } from "mobx-react-lite";
import { InputFileUpload } from "./components/TSCFileUpload";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import { fetcher } from "./util";
import { displayServerError } from "./state/actions/util-actions";
import { Lottie, TSCButton } from "./components";
import loader from "./assets/icons/loading.json";
import { useNavigate } from "react-router";

type Profile = {
  pictureUrl: string | null;
};

export const Profile: React.FC<Profile> = observer(({ pictureUrl }) => {
  const navigate = useNavigate();
  const { state, actions } = useContext(context);
  const [editMode, setEditMode] = useState({
    username: false,
    email: false,
    password: false
  });
  const [formValues, setFormValues] = useState({
    username: state.user.username,
    email: state.user.email,
    currentPassword: "",
    newPassword: ""
  });
  const [loading, setLoading] = useState(false);

  const handleEditToggle = (field: keyof typeof editMode) => {
    setEditMode((prev) => {
      const newEditMode = { username: false, email: false, password: false };
      newEditMode[field] = !prev[field];
      return newEditMode;
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeProfile = async (field: "username" | "email" | "password") => {
    setLoading(true);
    let endpoint = "";
    let body = {};
    if (field === "username") {
      endpoint = "/auth/change-username";
      body = { newUsername: formValues.username };
    } else if (field === "email") {
      endpoint = "/auth/change-email";
      body = { newEmail: formValues.email };
    } else {
      endpoint = "/auth/change-password";
      body = {
        currentPassword: formValues.currentPassword,
        newPassword: formValues.newPassword
      };
    }
    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(body)
      });
      if (response.ok) {
        actions.sessionCheck();
        actions.removeAllErrors();
        const successMessage =
          field === "username"
            ? "Username changed successfully. Please log in again."
            : field === "email"
              ? "Email sent successfully. Please check your inbox."
              : "Password changed successfully. Please log in again.";
        actions.pushSnackbar(successMessage, "success");
        navigate("/login");
      } else {
        let errorCode =
          field === "username"
            ? ErrorCodes.UNABLE_TO_CHANGE_USERNAME
            : field === "email"
              ? ErrorCodes.UNABLE_TO_SEND_EMAIL
              : ErrorCodes.UNABLE_TO_RESET_PASSWORD;
        switch (response.status) {
          case 400:
            errorCode = ErrorCodes.INVALID_FORM;
            break;
          case 401:
            errorCode = ErrorCodes.NOT_LOGGED_IN;
            navigate("/login");
            break;
        }
        displayServerError(await response.json(), errorCode, ErrorMessages[errorCode]);
      }
    } catch {
      const errorCode =
        field === "username"
          ? ErrorCodes.UNABLE_TO_CHANGE_USERNAME
          : field === "email"
            ? ErrorCodes.UNABLE_TO_SEND_EMAIL
            : ErrorCodes.UNABLE_TO_RESET_PASSWORD;
      displayServerError(null, errorCode, ErrorMessages[errorCode]);
    } finally {
      setLoading(false);
    }
  };

  return loading ? (
    <Box display="flex" justifyContent="center" alignItems="center">
      <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
    </Box>
  ) : (
    <Container maxWidth="lg">
      <Box display="flex" alignItems="center" mt={10} mb={2}>
        {pictureUrl ? (
          <Avatar src={pictureUrl} />
        ) : (
          <Avatar>
            <PersonIcon />
          </Avatar>
        )}
        <Typography variant="h4" component="h1" sx={{ ml: 1 }}>
          Welcome
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ padding: 2 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Profile Information
            </Typography>
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography>Username:</Typography>
                  {editMode.username ? (
                    <>
                      <TextField
                        name="username"
                        value={formValues.username}
                        onChange={handleChange}
                        size="small"
                        autoComplete="username"
                      />
                      <Box>
                        <TSCButton onClick={() => handleChangeProfile("username")} sx={{ mr: 1 }}>
                          Save
                        </TSCButton>
                        <TSCButton onClick={() => handleEditToggle("username")}>Cancel</TSCButton>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Typography>{state.user.username}</Typography>
                      <TSCButton onClick={() => handleEditToggle("username")}>Change</TSCButton>
                    </>
                  )}
                </Grid>
                <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography>Email:</Typography>
                  {editMode.email ? (
                    <>
                      <TextField
                        name="email"
                        value={formValues.email}
                        onChange={handleChange}
                        size="small"
                        autoComplete="username"
                      />
                      <Box>
                        <TSCButton onClick={() => handleChangeProfile("email")} sx={{ mr: 1 }}>
                          Save
                        </TSCButton>
                        <TSCButton onClick={() => handleEditToggle("email")}>Cancel</TSCButton>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Typography>{state.user.email}</Typography>
                      <TSCButton onClick={() => handleEditToggle("email")}>Change</TSCButton>
                    </>
                  )}
                </Grid>
                <Grid
                  item
                  xs={12}
                  sx={{
                    display: editMode.password ? "block" : "flex",
                    justifyContent: editMode.password ? "" : "space-between"
                  }}
                  alignItems="center">
                  <Typography>Password:</Typography>
                  {editMode.password ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleChangeProfile("password");
                      }}>
                      {/* The below hidden input field helps with accessibility and allows browsers to autofill. Chrome complains if this is missing.*/}
                      <input
                        type="text"
                        defaultValue={formValues.username}
                        autoComplete="username"
                        style={{ display: "none" }}
                      />
                      <Grid container spacing={2} display="flex" flexDirection="column" mt={1}>
                        <Grid item xs={12}>
                          <TextField
                            type="password"
                            name="currentPassword"
                            label="Current Password"
                            value={formValues.currentPassword}
                            onChange={handleChange}
                            size="small"
                            fullWidth
                            autoComplete="current-password"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            type="password"
                            name="newPassword"
                            label="New Password"
                            value={formValues.newPassword}
                            onChange={handleChange}
                            size="small"
                            fullWidth
                            autoComplete="new-password"
                          />
                        </Grid>
                      </Grid>
                      <Box mt={2}>
                        <TSCButton type="submit" sx={{ mr: 1 }}>
                          Save
                        </TSCButton>
                        <TSCButton onClick={() => handleEditToggle("password")}>Cancel</TSCButton>
                      </Box>
                    </form>
                  ) : (
                    <>
                      <Typography>***********</Typography>
                      <TSCButton onClick={() => handleEditToggle("password")}>Change</TSCButton>
                    </>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <InputFileUpload
                    startIcon={<PersonIcon />}
                    text="Upload Profile Picture"
                    sx={{ width: "100%" }}
                    onChange={async (event) => {
                      const file = event.target.files![0];
                      if (!file) {
                        return;
                      }
                      const ext = file.name.split(".").pop();
                      if (!file.type.startsWith("image/")) {
                        actions.pushError(ErrorCodes.UNRECOGNIZED_IMAGE_FILE);
                        return;
                      }
                      if (!ext || !/^(jpg|jpeg|png|gif)$/.test(ext)) {
                        actions.pushError(ErrorCodes.UNRECOGNIZED_IMAGE_FILE);
                        return;
                      }
                      actions.removeAllErrors();
                      const formData = new FormData();
                      formData.append("file", file);
                      try {
                        const response = await fetcher("/upload-profile-picture", {
                          method: "POST",
                          body: formData,
                          credentials: "include"
                        });
                        if (response.ok) {
                          const data = await response.json();
                          actions.setPictureUrl(data.pictureUrl);
                        } else {
                          displayServerError(
                            await response.json(),
                            ErrorCodes.UPLOAD_PROFILE_PICTURE_FAILED,
                            ErrorMessages[ErrorCodes.UPLOAD_PROFILE_PICTURE_FAILED]
                          );
                        }
                      } catch (error) {
                        displayServerError(
                          null,
                          ErrorCodes.UPLOAD_PROFILE_PICTURE_FAILED,
                          ErrorMessages[ErrorCodes.UPLOAD_PROFILE_PICTURE_FAILED]
                        );
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ padding: 2 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Settings
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={state.user.settings.darkMode}
                  onChange={() => actions.setDarkMode(!state.user.settings.darkMode)}
                  name="darkMode"
                  color="primary"
                />
              }
              label="Dark Mode"
            />
            <FormControl fullWidth variant="outlined" margin="normal">
              <InputLabel>Language</InputLabel>
              <Select
                value={state.user.settings.language}
                onChange={(e) => actions.setLanguage(e.target.value)}
                label="Language"
                name="language">
                <MenuItem value="English">English</MenuItem>
                <MenuItem value="Spanish">Spanish</MenuItem>
                <MenuItem value="French">French</MenuItem>
                <MenuItem value="German">German</MenuItem>
              </Select>
            </FormControl>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
});
