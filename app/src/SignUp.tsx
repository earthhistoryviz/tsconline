import React, { useContext } from "react";
import { observer } from "mobx-react-lite";
import Avatar from "@mui/material/Avatar";
import { TSCButton } from "./components";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import LoginIcon from "@mui/icons-material/Login";
import { fetcher, HttpError } from "./util";
import { actions } from "./state";
import { ErrorCodes } from "./util/error-codes";
import { context } from "./state";
import { useNavigate } from "react-router";

import "./Login.css";

export const SignUp: React.FC = observer(() => {
  const theme = useTheme();
  const { state } = useContext(context);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      actions.pushError(ErrorCodes.INVALID_FORM);
    } else {
      const data = new FormData(event.currentTarget);
      try {
        const response = await fetcher("/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            username: data.get("username"),
            password: data.get("password"),
            email: data.get("email")
          })
        });
        if (response.ok) {
          actions.sessionCheck();
          if (!state.isLoggedIn) {
            actions.pushError(ErrorCodes.UNABLE_TO_SIGNUP_SERVER);
          } else {
            actions.removeError(ErrorCodes.UNABLE_TO_SIGNUP_SERVER);
            actions.removeError(ErrorCodes.UNABLE_TO_SIGNUP_USERNAME_OR_EMAIL);
            actions.removeError(ErrorCodes.INVALID_FORM);
            actions.pushSnackbar("Succesfully signed up", "success");
            navigate("/");
          }
        } else {
          console.error("Error trying to log in: " + response.status);
          actions.pushError(ErrorCodes.UNABLE_TO_SIGNUP_SERVER);
        }
      } catch (error) {
        if (error instanceof HttpError) {
          const status = error.status;
          if (status === 409) {
            actions.pushError(ErrorCodes.UNABLE_TO_SIGNUP_USERNAME_OR_EMAIL);
          } else if (status === 400) {
            actions.pushError(ErrorCodes.INVALID_FORM);
          }
        } else {
          console.error("Error:", error);
          actions.pushError(ErrorCodes.UNABLE_TO_SIGNUP_SERVER);
        }
      }
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box className="login-box">
        <Avatar sx={{ "& .MuiSvgIcon-root": { mr: 0 }, bgcolor: theme.palette.navbar.dark }}>
          <LockOutlinedIcon sx={{ color: theme.palette.selection.main }} />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign up
        </Typography>
        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField required fullWidth id="email" label="Email Address" name="email" autoComplete="email" />
            </Grid>
            <Grid item xs={12}>
              <TextField required fullWidth id="username" label="Username" name="username" autoComplete="username" />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
              />
            </Grid>
          </Grid>
          <TSCButton type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} endIcon={<LoginIcon />}>
            Sign Up
          </TSCButton>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link href="/login" sx={{ color: "black" }}>
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
});
