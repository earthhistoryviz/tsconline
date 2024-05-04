import React, { useState, useContext } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import Avatar from "@mui/material/Avatar";
import { Lottie, TSCButton } from "./components";
import loader from "./assets/icons/loading.json";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import SendIcon from "@mui/icons-material/Send";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import { useLocation, useNavigate } from "react-router";
import { fetcher } from "./util";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import { displayServerError } from "./state/actions/util-actions";
import Container from "@mui/material/Container";
import "./Login.css";

export const AccountRecovery: React.FC = observer(() => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [showResendForm, setShowResendForm] = useState(token === null);
  const [showPasswordForm, setShowPasswordForm] = useState(token !== null);
  const { state, actions } = useContext(context);
  const navigate = useNavigate();

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      actions.pushError(ErrorCodes.INVALID_FORM);
      return;
    }
    setLoading(true);
    setShowResendForm(false);
    try {
      const response = await fetcher("/auth/send-reset-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: form.email.value })
      });
      if (response.ok) {
        actions.removeAllErrors();
        actions.pushSnackbar("If your account is verified, you will receive an email.", "success");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        let errorCode = ErrorCodes.UNABLE_TO_SEND_EMAIL;
        switch (response.status) {
          case 400:
            errorCode = ErrorCodes.INVALID_FORM;
            break;
        }
        setShowResendForm(true);
        displayServerError(await response.json(), errorCode, ErrorMessages[errorCode]);
      }
    } catch {
      setShowResendForm(true);
      displayServerError(null, ErrorCodes.UNABLE_TO_SEND_EMAIL, ErrorMessages[ErrorCodes.UNABLE_TO_SEND_EMAIL]);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      actions.pushError(ErrorCodes.INVALID_FORM);
      return;
    }
    setLoading(true);
    setShowPasswordForm(false);
    try {
      const response = await fetcher("/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ password: form.password.value, token: token })
      });
      if (response.ok) {
        await actions.sessionCheck();
        if (!state.isLoggedIn) {
          displayServerError(null, ErrorCodes.UNABLE_TO_LOGIN_SERVER, ErrorMessages[ErrorCodes.UNABLE_TO_LOGIN_SERVER]);
          actions.pushSnackbar(
            "We were able to reset your password, but we were unable to sign you in. Please try to sign in.",
            "warning"
          );
        } else {
          actions.removeAllErrors();
          actions.pushSnackbar("Password reset", "success");
          navigate("/");
        }
      } else {
        const message = await response.json();
        let errorCode = ErrorCodes.UNABLE_TO_RESET_PASSWORD;
        switch (response.status) {
          case 400:
            errorCode = ErrorCodes.INVALID_FORM;
            break;
          case 401:
          case 404:
            errorCode = ErrorCodes.TOKEN_EXPIRED_OR_INVALID;
            setShowResendForm(true);
            break;
          default:
            setShowResendForm(true);
            break;
        }
        displayServerError(message, errorCode, ErrorMessages[errorCode]);
      }
    } catch {
      displayServerError(null, ErrorCodes.UNABLE_TO_RESET_PASSWORD, ErrorMessages[ErrorCodes.UNABLE_TO_RESET_PASSWORD]);
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
        {loading && <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />}
        <Typography variant="h5" sx={{ textAlign: "center", mt: 1 }}>
          {showPasswordForm || showResendForm
            ? showResendForm
              ? "Enter your email to receive a password reset link."
              : "Please enter your new password."
            : "Account Recovery"}
        </Typography>
        {showResendForm && (
          <Box component="form" onSubmit={handleEmailSubmit} className="account-form">
            <TextField
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              type="email"
              autoFocus
              margin="normal"
            />
            <TSCButton type="submit" fullWidth startIcon={<SendIcon />}>
              Send
            </TSCButton>
          </Box>
        )}
        {showPasswordForm && (
          <Box component="form" onSubmit={handlePasswordSubmit} className="account-form">
            <TextField
              required
              fullWidth
              id="password"
              label="Password"
              name="password"
              autoComplete="new-password"
              type="password"
              autoFocus
              margin="normal"
            />
            <TSCButton type="submit" fullWidth variant="contained" startIcon={<SendIcon />}>
              Send
            </TSCButton>
          </Box>
        )}
      </Box>
    </Container>
  );
});
