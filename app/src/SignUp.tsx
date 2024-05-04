import React, { useContext, useState } from "react";
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
import { fetcher } from "./util";
import { Lottie } from "./components";
import loader from "./assets/icons/loading.json";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import { displayServerError } from "./state/actions/util-actions";
import { context } from "./state";
import "./Login.css";

export const SignUp: React.FC = observer(() => {
  const theme = useTheme();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { actions } = useContext(context);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      actions.pushError(ErrorCodes.INVALID_FORM);
      return;
    }
    setLoading(true);
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
        actions.removeAllErrors();
        setSubmitted(true);
      } else {
        const message = await response.json();
        let errorCode = ErrorCodes.UNABLE_TO_SIGNUP_SERVER;
        switch (response.status) {
          case 400:
            errorCode = ErrorCodes.INVALID_FORM;
            break;
          case 409:
            errorCode = ErrorCodes.UNABLE_TO_SIGNUP_USERNAME_OR_EMAIL;
            break;
        }
        displayServerError(message, errorCode, ErrorMessages[errorCode]);
      }
    } catch (error) {
      displayServerError(null, ErrorCodes.UNABLE_TO_SIGNUP_SERVER, ErrorMessages[ErrorCodes.UNABLE_TO_SIGNUP_SERVER]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box className="login-box">
        <Avatar sx={{ "& .MuiSvgIcon-root": { mr: 0 }, bgcolor: theme.palette.navbar.dark }}>
          <LockOutlinedIcon sx={{ color: theme.palette.selection.main }} />
        </Avatar>
        {loading ? (
          <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
        ) : submitted ? (
          <Typography variant="h5" sx={{ m: 1, textAlign: "center" }}>
            Email sent. Please check your email to verify your account.
          </Typography>
        ) : (
          <>
            <Typography component="h1" variant="h5">
              Sign up
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="username"
                    type="email"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="username"
                    label="Username"
                    name="username"
                    autoComplete="username"
                  />
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
          </>
        )}
      </Box>
    </Container>
  );
});
