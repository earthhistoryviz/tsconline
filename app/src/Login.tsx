import React, { useContext, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import { CustomDivider, Lottie, TSCButton } from "./components";
import loader from "./assets/icons/loading.json";
import { useTheme } from "@mui/material/styles";
import LoginIcon from "@mui/icons-material/Login";
import { GoogleLogin } from "@react-oauth/google";
import { fetcher, loadRecaptcha, removeRecaptcha, executeRecaptcha } from "./util";
import { actions, context } from "./state";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import { useNavigate } from "react-router";
import { displayServerError } from "./state/actions/util-actions";
import CookieConsent from "./CookieConsent";
import "./Login.css";

export const Login: React.FC = observer(() => {
  const { state } = useContext(context);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();

  interface Form {
    username: FormDataEntryValue | null;
    password: FormDataEntryValue | null;
    recaptchaToken: string | null;
  }

  interface Credential {
    credential: string | undefined;
    recaptchaToken: string | null;
  }

  useEffect(() => {
    loadRecaptcha();
    return () => {
      removeRecaptcha();
    };
  }, []);

  const handleLogin = async (isGoogleLogin: boolean, body: Form | Credential) => {
    setLoading(true);
    try {
      // Don't allow sign in if not accepting cookies
      if (!state.cookieConsent) {
        actions.pushError(ErrorCodes.COOKIE_REJECTED);
        return;
      }

      const recaptchaToken = await executeRecaptcha("login");
      if (!recaptchaToken) {
        actions.pushError(ErrorCodes.RECAPTCHA_FAILED);
        return;
      }
      body = { ...body, recaptchaToken };
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
          actions.pushSnackbar("Successfully signed in", "success");
          navigate("/");
        }
      } else {
        const message = await response.json();
        let errorCode = ErrorCodes.UNABLE_TO_LOGIN_SERVER;
        switch (response.status) {
          case 400:
            errorCode = isGoogleLogin ? ErrorCodes.UNABLE_TO_LOGIN_GOOGLE_CREDENTIAL : ErrorCodes.INVALID_FORM;
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
          case 422:
            errorCode = ErrorCodes.RECAPTCHA_FAILED;
            break;
          case 423:
            errorCode = ErrorCodes.UNABLE_TO_LOGIN_ACCOUNT_LOCKED;
            break;
          case 429:
            actions.removeAllErrors();
            errorCode = ErrorCodes.TOO_MANY_REQUESTS;
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
      password: data.get("password"),
      recaptchaToken: null
    };
    await handleLogin(false, formData);
  };

  return (
    <Box className="login-box">
      <Avatar sx={{ bgcolor: theme.palette.backgroundColor.main }}>
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
              disabled={!state.cookieConsent}
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
              disabled={!state.cookieConsent}
            />
            <TSCButton
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              endIcon={<LoginIcon />}
              disabled={!state.cookieConsent}>
              Sign In
            </TSCButton>
            <Grid container className="grid-container">
              <Grid item xs>
                <Link href="/forgot-password">Forgot password?</Link>
              </Grid>
              <Grid item>
                <Link href="/signup">Don&apos;t have an account? Sign Up</Link>
              </Grid>
            </Grid>
            <Box className="divider-box">
              <CustomDivider className="divider-line" />
              <Box sx={{ px: 2 }}>
                <Typography variant="caption">or</Typography>
              </Box>
              <CustomDivider className="divider-line" />
            </Box>
            {/* GoogleLogin does not have a "disable" property */}
            <div className={!state.cookieConsent ? "disabled-google-login" : ""}>
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  const credential = credentialResponse.credential;
                  await handleLogin(true, { credential, recaptchaToken: null });
                }}
                onError={() => actions.pushError(ErrorCodes.UNABLE_TO_LOGIN_SERVER)}
                width="400px"
              />
            </div>
          </Box>
        </>
      )}
      <CookieConsent persistent={true} />
    </Box>
  );
});
