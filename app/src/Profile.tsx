import React, { useState, useContext, useEffect, useRef } from "react";
import {
  Switch,
  Typography,
  Grid,
  Container,
  Paper,
  Box,
  TextField,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Badge
} from "@mui/material";
import { context } from "./state";
import PersonIcon from "@mui/icons-material/Person";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import { fetcher, loadRecaptcha, removeRecaptcha, executeRecaptcha } from "./util";
import { displayServerError } from "./state/actions/util-actions";
import { Lottie, TSCButton, TSCPopupDialog, CustomFormControlLabel } from "./components";
import loader from "./assets/icons/loading.json";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import EditIcon from "@mui/icons-material/Edit";
import "./Profile.css";

export const Profile = observer(() => {
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
  const [popupOpen, setPopupOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRecaptcha();
    return () => {
      removeRecaptcha();
    };
  }, []);

  const handleBadgeClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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
      const recaptchaToken: string = await executeRecaptcha("profile-customization");
      if (!recaptchaToken) {
        actions.pushError(ErrorCodes.RECAPTCHA_FAILED);
        return;
      }
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ ...body, recaptchaToken })
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
        if (field !== "email") actions.setDefaultUserState();
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
          case 409:
            errorCode = ErrorCodes.INCORRECT_PASSWORD;
            break;
          case 422:
            errorCode = ErrorCodes.RECAPTCHA_FAILED;
            break;
          case 429:
            actions.removeAllErrors();
            errorCode = ErrorCodes.TOO_MANY_REQUESTS;
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

  const deleteProfile = async () => {
    setLoading(true);
    try {
      const response = await fetcher("/auth/delete-profile", {
        method: "POST",
        credentials: "include"
      });
      if (response.ok) {
        actions.removeAllErrors();
        actions.pushSnackbar("Profile deleted successfully.", "success");
        actions.setDefaultUserState();
        navigate("/login");
      } else {
        let errorCode = ErrorCodes.UNABLE_TO_DELETE_PROFILE;
        switch (response.status) {
          case 401:
            errorCode = ErrorCodes.NOT_LOGGED_IN;
            navigate("/login");
            break;
          case 422:
            errorCode = ErrorCodes.RECAPTCHA_FAILED;
            break;
          case 429:
            actions.removeAllErrors();
            errorCode = ErrorCodes.TOO_MANY_REQUESTS;
            break;
        }
        displayServerError(await response.json(), errorCode, ErrorMessages[errorCode]);
      }
    } catch {
      displayServerError(null, ErrorCodes.UNABLE_TO_DELETE_PROFILE, ErrorMessages[ErrorCodes.UNABLE_TO_DELETE_PROFILE]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    const file = event.target.files![0];
    const ext = file.name.split(".").pop();
    if (!file || !file.type.startsWith("image/") || !ext || !/^(jpg|jpeg|png|gif)$/.test(ext)) {
      actions.pushError(ErrorCodes.UNRECOGNIZED_IMAGE_FILE);
      setLoading(false);
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
        actions.setPictureUrl(data.pictureUrl + `?${new Date().getTime()}`);
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
    } finally {
      setLoading(false);
    }
  };

  const borderStyle = { border: "2px solid", borderColor: "button.main" }

  return loading ? (
    <Box display="flex" justifyContent="center" alignItems="center">
      <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
    </Box>
  ) : (
    <Container maxWidth="md">
      <TSCPopupDialog
        open={popupOpen}
        title="Are you sure you want to delete your profile?"
        message="This action cannot be undone. All your data (including datapacks) will be lost."
        onYes={() => deleteProfile()}
        onNo={() => setPopupOpen(false)}
        onClose={() => setPopupOpen(false)}
      />
      <Box display="flex" alignItems="center" mt={10} mb={2}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          badgeContent={
            <Avatar className="badge">
              <EditIcon className="pencil" fontSize="small" />
            </Avatar>
          }
          onClick={handleBadgeClick}>
          {state.user.pictureUrl ? (
            <Avatar src={state.user.pictureUrl} className="editable-profile-picture" sx={borderStyle} />
          ) : (
            <Avatar className="editable-profile-picture" sx={borderStyle}>
              <PersonIcon />
            </Avatar>
          )}
        </Badge>
        <input type="file" style={{ display: "none" }} onChange={handleUpload} ref={fileInputRef} />
        <Typography variant="h4" component="h1" sx={{ ml: 2 }}>
          {`Welcome, ${state.user.username}`}
        </Typography>
      </Box>
      <Grid container spacing={2} direction="column">
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ padding: 2, bgcolor: "secondaryBackground.main" }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Profile Information
            </Typography>
            <Box>
              <Grid container spacing={2}>
                <Grid
                  item
                  xs={12}
                  alignItems="center"
                  sx={{
                    display: editMode.username ? "block" : "flex",
                    justifyContent: editMode.username ? "" : "space-between"
                  }}>
                  <Box sx={{ minWidth: 75 }}>
                    <Typography>Username:</Typography>
                  </Box>
                  {editMode.username ? (
                    <>
                      <TextField
                        fullWidth
                        name="username"
                        label="New Username"
                        value={formValues.username}
                        onChange={handleChange}
                        size="small"
                        autoComplete="username"
                        margin="dense"
                        required
                      />
                      <Box sx={{ mt: 2 }}>
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
                <Grid
                  item
                  xs={12}
                  alignItems="center"
                  sx={{
                    display: editMode.email ? "block" : "flex",
                    justifyContent: editMode.email ? "" : "space-between"
                  }}>
                  <Box sx={{ minWidth: 75 }}>
                    <Typography>Email:</Typography>
                  </Box>
                  {editMode.email ? (
                    <>
                      <TextField
                        fullWidth
                        name="email"
                        label="New Email"
                        value={formValues.email}
                        onChange={handleChange}
                        size="small"
                        autoComplete="username"
                        margin="dense"
                        required
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
                {!state.user.isGoogleUser && (
                  <Grid
                    item
                    xs={12}
                    sx={{
                      display: editMode.password ? "block" : "flex",
                      justifyContent: editMode.password ? "" : "space-between"
                    }}
                    alignItems="center">
                    <Box sx={{ minWidth: 75 }}>
                      <Typography>Password:</Typography>
                    </Box>
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
                        <Grid container display="flex" flexDirection="column">
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
                              margin="dense"
                              required
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
                              margin="dense"
                              required
                            />
                          </Grid>
                        </Grid>
                        <Box>
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
                )}
              </Grid>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ padding: 2, bgcolor: "secondaryBackground.main" }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Settings
            </Typography>
            <CustomFormControlLabel
              width={120}
              control={
                <Switch
                  checked={state.user.settings.darkMode}
                  size="medium"
                  color="default"
                  onChange={() => actions.setDarkMode(!state.user.settings.darkMode)}
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
            <Box mt={2}>
              <Button variant="contained" color="error" fullWidth onClick={() => setPopupOpen(true)}>
                Delete Profile
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
});
