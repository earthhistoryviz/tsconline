import React, { useContext } from "react";
import { observer } from "mobx-react-lite";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import { TSCButton } from "./components";
import { useTheme } from "@mui/material/styles";
import LoginIcon from "@mui/icons-material/Login";
import { GoogleLogin } from "@react-oauth/google";
import { fetcher } from "./util";
import { actions, context } from "./state";
import { useNavigate } from "react-router-dom";
import { ErrorCodes } from "./util/error-codes";

export const Login: React.FC = observer(() => {
  const { state } = useContext(context)
  const navigate = useNavigate();
  const theme = useTheme();

  if (state.isLoggedIn) {
    //navigate("/");
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const formData = {
      username: data.get("username"),
      password: data.get("password")
    };
    try {
      const login = await fetcher("auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      if (login.ok) {
        actions.sessionCheck();
        if (!state.isLoggedIn) {
          actions.pushError(ErrorCodes.UNABLE_TO_LOGIN);
        }
      } else {
        console.error("Error trying to log in: " + login.status);
        actions.pushError(ErrorCodes.UNABLE_TO_LOGIN);
      }
    } catch (error) {
      console.error("Error:", error);
      actions.pushError(ErrorCodes.UNABLE_TO_LOGIN);
    }
  };

  return (
    <Box
      sx={{
        my: 8,
        mx: "auto",
        maxWidth: 400,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
      <Avatar sx={{ "& .MuiSvgIcon-root": { mr: 0 }, bgcolor: theme.palette.navbar.dark }}>
        <LockOutlinedIcon sx={{ color: theme.palette.selection.main }} />
      </Avatar>
      <Typography variant="h5">{"Sign In"}</Typography>
      <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1, width: "100%" }}>
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
        <Grid container direction="row" alignItems="center" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Grid item xs>
              <Link href="#" sx={{ color: "black" }}>
                Forgot password?
              </Link>
            </Grid>
          <Grid item>
            <Link href="#" sx={{ color: "black" }}>
              "Don't have an account? Sign Up"
            </Link>
          </Grid>
        </Grid>
          <Box sx={{ my: 2, display: "flex", alignItems: "center", width: "100%" }}>
            <Box sx={{ flex: 1, height: "1px", bgcolor: "black" }}></Box>
            <Box sx={{ px: 2 }}>
              <Typography variant="caption" sx={{ color: "black" }}>
                or
              </Typography>
            </Box>
            <Box sx={{ flex: 1, height: "1px", bgcolor: "black" }}></Box>
          </Box>
          <GoogleLogin
            onSuccess={() => console.log("Logged in with Google")}
            ux_mode="redirect"
            login_uri={`http://${import.meta.env.VITE_SERVER_URL || "localhost:3000"}/auth/oauth`}
            onError={() => actions.pushError(ErrorCodes.UNABLE_TO_LOGIN)}
            width="400px"
          />
      </Box>
    </Box>
  );
});
