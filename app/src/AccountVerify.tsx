import React, { useEffect, useContext, useState, useRef } from "react";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import { fetcher } from "./util";
import { Lottie, TSCButton } from "./components";
import loader from "./assets/icons/loading.json";
import { useLocation, useNavigate } from "react-router";
import { context, state } from "./state";
import { displayServerError } from "./state/actions/util-actions";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import { useTheme } from "@mui/material/styles";
import SendIcon from "@mui/icons-material/Send";
import "./Login.css";

export const AccountVerify: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");
  const { actions } = useContext(context);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(token === null ? "Send a verification email." : "Verifying account...");
  const [showResendForm, setshowResendForm] = useState(token === null);
  const navigate = useNavigate();
  const theme = useTheme();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (token && !checkedRef.current) {
      checkedRef.current = true;
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetcher("/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token }),
        credentials: "include"
      });
      if (response.ok) {
        await actions.sessionCheck();
        if (!state.isLoggedIn) {
          displayServerError(null, ErrorCodes.UNABLE_TO_LOGIN_SERVER, ErrorMessages[ErrorCodes.UNABLE_TO_LOGIN_SERVER]);
          setMessage("We were able to verify your account, but we were unable to log you in. Please try again later.");
        } else {
          actions.removeAllErrors();
          actions.pushSnackbar("Account verified, redirecting...", "success");
          setMessage("Your account has been verified. Thank you! Redirecting...");
          setTimeout(() => navigate("/"), 2000);
        }
      } else {
        const message = await response.json();
        switch (response.status) {
          case 401:
            displayServerError(
              message,
              ErrorCodes.TOKEN_EXPIRED_OR_INVALID,
              ErrorMessages[ErrorCodes.TOKEN_EXPIRED_OR_INVALID]
            );
            setMessage("Resend verification email to verify your account.");
            setshowResendForm(true);
            break;
          case 409:
            actions.removeAllErrors();
            actions.pushSnackbar("Account already verified, redirecting...", "info");
            setMessage("Your account has already been verified. Thank you! Redirecting...");
            setTimeout(() => navigate("/"), 2000);
            break;
          default:
            displayServerError(
              message,
              ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT,
              ErrorMessages[ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT]
            );
            setMessage(ErrorMessages[ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT]);
            break;
        }
      }
    } catch (error) {
      displayServerError(null, ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT, ErrorMessages[ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT]);
      setMessage(ErrorMessages[ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT]);
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
    setLoading(true);
    setMessage("Sending verification email...");
    setshowResendForm(false);
    const email = form.email.value;
    try {
      const resposne = await fetcher("/auth/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      if (resposne.ok) {
        actions.removeAllErrors();
        actions.pushSnackbar("Email sent", "success");
        setMessage("If you email is registered, we have sent you an email. Please check your email.");
      } else {
        const message = await resposne.json();
        switch (resposne.status) {
          case 400:
            displayServerError(message, ErrorCodes.INVALID_FORM, ErrorMessages[ErrorCodes.INVALID_FORM]);
            setMessage(ErrorMessages[ErrorCodes.INVALID_FORM]);
            break;
          default:
            displayServerError(
              message,
              ErrorCodes.UNABLE_TO_SEND_EMAIL,
              ErrorMessages[ErrorCodes.UNABLE_TO_SEND_EMAIL]
            );
            setMessage(ErrorMessages[ErrorCodes.UNABLE_TO_SEND_EMAIL]);
        }
      }
    } catch (error) {
      displayServerError(null, ErrorCodes.UNABLE_TO_SEND_EMAIL, ErrorMessages[ErrorCodes.UNABLE_TO_SEND_EMAIL]);
      setMessage(ErrorMessages[ErrorCodes.UNABLE_TO_SEND_EMAIL]);
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
        <Typography component="h1" variant="h5" sx={{ mt: 1, textAlign: "center" }}>
          {message}
        </Typography>
        {showResendForm && (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              type="email"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="username"
              autoFocus
            />
            <TSCButton fullWidth type="submit" startIcon={<SendIcon />}>
              Send Verification Email
            </TSCButton>
          </Box>
        )}
      </Box>
    </Container>
  );
};
