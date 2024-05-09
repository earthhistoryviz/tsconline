import React, { useState, useContext, useRef, useEffect } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import Avatar from "@mui/material/Avatar";
import { Lottie } from "./components";
import loader from "./assets/icons/loading.json";
import { useTheme } from "@mui/material/styles";
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
  const email = searchParams.get("email");
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const { actions } = useContext(context);
  const checkedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!checkedRef.current && token && email) {
      checkedRef.current = true;
      verifyToken(token, email);
    }
  }, [token]);

  const verifyToken = async (token: string, email: string) => {
    setLoading(true);
    try {
      const response = await fetcher("/auth/account-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token: token, email: email })
      });
      if (response.ok) {
        actions.removeAllErrors();
        actions.pushSnackbar("Please check your inbox for details on resetting your password.", "info");
        navigate("/reset-password");
      } else {
        displayServerError(
          await response.json(),
          ErrorCodes.UNABLE_TO_RECOVER_ACCOUNT,
          ErrorMessages[ErrorCodes.UNABLE_TO_RECOVER_ACCOUNT]
        );
        navigate("/home");
      }
    } catch {
      displayServerError(
        null,
        ErrorCodes.UNABLE_TO_RECOVER_ACCOUNT,
        ErrorMessages[ErrorCodes.UNABLE_TO_RECOVER_ACCOUNT]
      );
      navigate("/home");
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
          {(!token || !email) && "Invadid token or email. Please check your email for the correct link."}
        </Typography>
      </Box>
    </Container>
  );
});
