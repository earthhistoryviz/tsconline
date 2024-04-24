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
import "./Login.css";

export const AccountRecovery: React.FC = observer(() => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");
  const theme = useTheme();
  const [loading, setloading] = useState(false);
  const [message, setMessage] = useState(
    token === null ? "Enter your email to receive a password reset link." : "Please enter your new password."
  );
  const [showResendForm, setshowResendForm] = useState(token === null);
  const [showPasswordForm, setshowPasswordForm] = useState(token !== null);
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
    setloading(true);
    setMessage("Sending email...");
    setshowResendForm(false);
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
        actions.pushSnackbar("Email sent", "success");
        setMessage("If an account with that email exists and is verfied, a password reset email has been sent.");
      } else {
        const message = await response.json();
        displayServerError(message, ErrorCodes.UNABLE_TO_SEND_EMAIL, message.error);
        setMessage("Unable to send email. Please try again later.");
      }
    } catch {
      displayServerError(null, ErrorCodes.UNABLE_TO_SEND_EMAIL, ErrorMessages[ErrorCodes.UNABLE_TO_SEND_EMAIL]);
    } finally {
      setloading(false);
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
    setloading(true);
    setMessage("");
    setshowPasswordForm(false);
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
          setMessage("We were able to reset your password, but we were unable to sign you in. Please try to sign in.");
        } else {
          actions.removeAllErrors();
          actions.pushSnackbar("Password reset", "success");
          navigate("/");
        }
      } else {
        const message = await response.json();
        let errorCode = ErrorCodes.UNABLE_TO_SEND_EMAIL;
        switch (response.status) {
          case 400:
            errorCode = ErrorCodes.INVALID_FORM;
            break;
          case 401:
            errorCode = ErrorCodes.TOKEN_EXPIRED_OR_INVALID;
            setMessage(
              "Unable to reset password. Your token is invalid or has expired. Please resend the verification email."
            );
            setshowResendForm(true);
            break;
          default:
            setMessage(
              "Unable to reset password. Your token is invalid or has expired. Please resend the verification email."
            );
            setshowResendForm(true);
            break;
        }
        displayServerError(message, errorCode, ErrorMessages[errorCode]);
      }
    } catch {
      displayServerError(null, ErrorCodes.UNABLE_TO_SEND_EMAIL, ErrorMessages[ErrorCodes.UNABLE_TO_SEND_EMAIL]);
      setMessage("Unable to reset password. Please try again later.");
    } finally {
      setloading(false);
    }
  };

  return (
    <Box className="login-box">
      <Avatar sx={{ "& .MuiSvgIcon-root": { mr: 0 }, bgcolor: theme.palette.navbar.dark }}>
        <LockOutlinedIcon sx={{ color: theme.palette.selection.main }} />
      </Avatar>
      {loading && <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />}
      <Typography variant="h5" sx={{ textAlign: "center", mt: 1 }}>
        {message}
      </Typography>
      {showResendForm && (
        <Box component="form" onSubmit={handleEmailSubmit} sx={{ mt: 3 }}>
          <TextField
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            type="email"
          />
          <TSCButton type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} startIcon={<SendIcon />}>
            Send
          </TSCButton>
        </Box>
      )}
      {showPasswordForm && (
        <Box component="form" onSubmit={handlePasswordSubmit} sx={{ mt: 3 }}>
          <TextField
            required
            fullWidth
            id="password"
            label="Password"
            name="password"
            autoComplete="new-password"
            type="password"
          />
          <TSCButton type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} startIcon={<SendIcon />}>
            Send
          </TSCButton>
        </Box>
      )}
    </Box>
  );
});
