import React, { useState } from "react";
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
import { useGoogleLogin } from "@react-oauth/google";
import { fetcher } from "./util";

export const Login: React.FC = () => {
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const formData = {
      username: data.get("username"),
      password: data.get("password")
    };
    const url = isLogin ? "/login" : "/signup";
    try {
      const response = await fetcher(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        const body = await response.text();
        console.log(body);
      } else {
        console.error("HTTP-Error: " + response.status);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  const googlelogin = useGoogleLogin({
    onSuccess: (tokenResponse) => console.log(tokenResponse),
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: "http://localhost:3000/googleLogin"
  });

  const [isLogin, setIsLogin] = useState(true);
  const theme = useTheme();
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
      <Typography variant="h5">{isLogin ? "Sign In" : "Sign Up"}</Typography>
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
          autoComplete={isLogin ? "current-password" : "new-password"}
        />
        <TSCButton type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} endIcon={<LoginIcon />}>
          {isLogin ? "Sign In" : "Sign Up"}
        </TSCButton>
        <Grid container direction="row" alignItems="center" justifyContent="flex-end" sx={{ mt: 2 }}>
          {isLogin && (
            <Grid item xs>
              <Link href="#" sx={{ color: "black" }}>
                Forgot password?
              </Link>
            </Grid>
          )}
          <Grid item>
            <Link href="#" sx={{ color: "black" }} onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </Link>
          </Grid>
        </Grid>
        {isLogin && (
          <>
            <Box sx={{ my: 2, display: "flex", alignItems: "center", width: "100%" }}>
              <Box sx={{ flex: 1, height: "1px", bgcolor: "black" }}></Box>
              <Box sx={{ px: 2 }}>
                <Typography variant="caption" sx={{ color: "black" }}>
                  or
                </Typography>
              </Box>
              <Box sx={{ flex: 1, height: "1px", bgcolor: "black" }}></Box>
            </Box>

            <TSCButton onClick={() => googlelogin()} sx={{ width: "400px" }}>
              Sign in with Google
            </TSCButton>
          </>
        )}
      </Box>
    </Box>
  );
};
