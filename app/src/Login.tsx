import React, { useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import { Lottie, TSCButton } from "./components";
import loader from "./assets/icons/loading.json";
import { useTheme } from "@mui/material/styles";
import LoginIcon from "@mui/icons-material/Login";
import { GoogleLogin } from "@react-oauth/google";
import { fetcher } from "./util";
import { actions, context } from "./state";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import { useNavigate } from "react-router";
import { displayServerError } from "./state/actions/util-actions";
import "./Login.css";

export const Login: React.FC = observer(() => {
  const { state } = useContext(context);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();

  interface Form {
    username: FormDataEntryValue | null;
    password: FormDataEntryValue | null;
  }

  interface Credential {
    credential: string | undefined;
  }

  const handleLogin = async (isGoogleLogin: boolean, body: Form | Credential) => {
    setLoading(true);
    try {
      const response = await fetcher(`/auth/${isGoogleLogin ? "oauth" : "login"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(body)
      });
      if (response.ok) {
        await actions.sessionCheck();
        if (!state.isLoggedIn) {
          displayServerError(null, ErrorCodes.UNABLE_TO_LOGIN_SERVER, ErrorMessages[ErrorCodes.UNABLE_TO_LOGIN_SERVER]);
        } else {
          actions.removeAllErrors();
          actions.pushSnackbar("Succesfully signed in", "success");
          navigate("/");
        }
      } else {
        const message = await response.json();
        let errorCode = ErrorCodes.UNABLE_TO_LOGIN_SERVER;
        switch (response.status) {
          case 400:
            if (isGoogleLogin) {
              errorCode = ErrorCodes.UNABLE_TO_LOGIN_GOOGLE_CREDENTIAL;
            } else {
              errorCode = ErrorCodes.INVALID_FORM;
            }
            break;
          case 401:
            errorCode = ErrorCodes.UNABLE_TO_LOGIN_USERNAME_OR_PASSWORD;
            break;
          case 403:
            errorCode = ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT;
            navigate("/verify");
            break;
          case 409:
            errorCode = ErrorCodes.UNABLE_TO_LOGIN_EXISTING_USER;
            break;
          case 423:
            errorCode = ErrorCodes.UNABLE_TO_LOGIN_ACCOUNT_LOCKED;
            break;
        }
        displayServerError(message, errorCode, ErrorMessages[errorCode]);
      }
    } catch (error) {
      console.error(error);
      displayServerError(null, ErrorCodes.UNABLE_TO_LOGIN_SERVER, ErrorMessages[ErrorCodes.UNABLE_TO_LOGIN_SERVER]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      actions.pushError(ErrorCodes.INVALID_FORM);
      return;
    }
    const data = new FormData(event.currentTarget);
    const formData: Form = {
      username: data.get("username"),
      password: data.get("password")
    };
    await handleLogin(false, formData);
  };

  return (
    <Box className="login-box">
      <Avatar sx={{ "& .MuiSvgIcon-root": { mr: 0 }, bgcolor: theme.palette.navbar.dark }}>
        <LockOutlinedIcon sx={{ color: theme.palette.selection.main }} />
      </Avatar>
      {loading ? (
        <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
      ) : (
        <>
          <Typography variant="h5">Sign In</Typography>
          <Box component="form" onSubmit={handleSubmit} className="form-box">
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
            />
            <TSCButton type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} endIcon={<LoginIcon />}>
              Sign In
            </TSCButton>
            <Grid container className="grid-container">
              <Grid item xs>
                <Link href="/reset-password" sx={{ color: "black" }}>
                  Forgot password?
                </Link>
              </Grid>
              <Grid item>
                <Link href="/signup" sx={{ color: "black" }}>
                  Don&apos;t have an account? Sign Up
                </Link>
              </Grid>
            </Grid>
            <Box className="divider-box">
              <Box className="divider-line"></Box>
              <Box sx={{ px: 2 }}>
                <Typography variant="caption" sx={{ color: "black" }}>
                  or
                </Typography>
              </Box>
              <Box className="divider-line"></Box>
            </Box>
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                const credential = credentialResponse.credential;
                await handleLogin(true, { credential });
              }}
              onError={() => actions.pushError(ErrorCodes.UNABLE_TO_LOGIN_SERVER)}
              width="400px"
            />
          </Box>
        </>
      )}
    </Box>
  );
});
