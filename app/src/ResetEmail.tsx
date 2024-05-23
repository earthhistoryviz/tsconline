import React, { useState, useContext, useEffect } from "react";
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
import { useNavigate } from "react-router";
import { fetcher, loadRecaptcha, removeRecaptcha, executeRecaptcha } from "./util";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import { displayServerError } from "./state/actions/util-actions";
import Container from "@mui/material/Container";
import "./Login.css";

export const ResetEmail: React.FC = observer(() => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const { actions } = useContext(context);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecaptcha();
    return () => {
      removeRecaptcha();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      actions.pushError(ErrorCodes.INVALID_FORM);
      return;
    }
    setLoading(true);
    setShowForm(false);
    try {
      const recaptchaToken = await executeRecaptcha("resetemail");
      if (!recaptchaToken) {
        actions.pushError(ErrorCodes.RECAPTCHA_FAILED);
        return;
      }
      const response = await fetcher("/auth/reset-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ newEmail: form.email.value, recaptchaToken })
      });
      if (response.ok) {
        actions.removeAllErrors();
        actions.pushSnackbar("Email sent successfully. Please check your inbox.", "success");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        let errorCode = ErrorCodes.UNABLE_TO_SEND_EMAIL;
        switch (response.status) {
          case 400:
            errorCode = ErrorCodes.INVALID_FORM;
            break;
          case 401:
            errorCode = ErrorCodes.NOT_LOGGED_IN;
            navigate("/login");
            break;
          case 422:
            errorCode = ErrorCodes.RECAPTCHA_FAILED;
            break;
          case 429:
            actions.removeAllErrors();
            displayServerError(null, ErrorCodes.TOO_MANY_REQUESTS, ErrorMessages[ErrorCodes.TOO_MANY_REQUESTS]);
            break;
        }
        setShowForm(true);
        displayServerError(await response.json(), errorCode, ErrorMessages[errorCode]);
      }
    } catch {
      setShowForm(true);
      displayServerError(null, ErrorCodes.UNABLE_TO_SEND_EMAIL, ErrorMessages[ErrorCodes.UNABLE_TO_SEND_EMAIL]);
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
          {showForm && "Enter your new email address and password to receive an email verification link."}
        </Typography>
        {showForm && (
          <Box component="form" onSubmit={handleSubmit} className="account-form">
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
      </Box>
    </Container>
  );
});
