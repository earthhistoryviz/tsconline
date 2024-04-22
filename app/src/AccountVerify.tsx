import React, { useEffect, useContext, useState, useRef } from "react";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import { HttpError, fetcher } from "./util";
import { Lottie } from "./components";
import loader from "./assets/icons/loading.json";
import { useLocation, useNavigate } from "react-router";
import { context, state } from "./state";
import { displayServerError } from "./state/actions/util-actions";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";

import "./Login.css";

export const AccountVerify: React.FC = observer(() => {
  const location = useLocation();
  const { actions } = useContext(context);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has("token")) {
      const token = searchParams.get("token");
      if (token) {
        handleResponse(token);
        checkedRef.current = true;
      }
    }
  }, [location]);

  const handleResponse = async (token: string) => {
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
        } else {
          actions.removeAllErrors();
          actions.pushSnackbar("Succesfully signed in", "success");
          setTimeout(() => navigate("/"), 2000);
        }
      }
    } catch (error) {
      if (error instanceof HttpError) {
        switch (error.status) {
          case 401:
            displayServerError(
              error,
              ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT,
              ErrorMessages[ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT]
            );
            break;
          case 409:
            actions.pushError(ErrorCodes.ALREADY_VERIFIED_ACCOUNT);
            break;
          default:
            displayServerError(
              error,
              ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT,
              ErrorMessages[ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT]
            );
        }
      } else {
        displayServerError(
          error,
          ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT,
          ErrorMessages[ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT]
        );
      }
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
          <>
            <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
            <Typography component="h1" variant="h5">
              Verifying your account...
            </Typography>
          </>
        ) : (
          <Typography component="h1" variant="h5" sx={{ mt: 8, textAlign: "center" }}>
            Account verification failed.
          </Typography>
        )}
      </Box>
    </Container>
  );
});
