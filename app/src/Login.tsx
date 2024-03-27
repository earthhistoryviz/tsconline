import * as React from "react";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import { TSCButton } from "./components";
import { TSCCheckbox } from "./components";
import { useTheme } from "@mui/material/styles";
import LoginIcon from '@mui/icons-material/Login';

export const Login: React.FC = () => {

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    console.log({
        email: data.get("email"),
        password: data.get("password")
    });
};

const theme = useTheme();
  return (
      <Box
        sx={{
          my: 8,
          mx: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
        <Avatar sx={{ '& .MuiSvgIcon-root': { mr: 0 }, bgcolor: theme.palette.navbar.dark }}>
          <LockOutlinedIcon sx={{ color: theme.palette.selection.main }}/>
        </Avatar>
        <Typography variant="h5">
          Sign in
        </Typography>
        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
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
          <FormControlLabel control={<TSCCheckbox value="remember" />} label="Remember me" />
          <TSCButton type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} endIcon={<LoginIcon />}>
            Sign In
          </TSCButton>
          <Grid container>
            <Grid item xs>
              <Link href="#" sx={{ color: "black" }} >
                Forgot password?
              </Link>
            </Grid>
            <Grid item>
              <Link href="#" sx={{ color: "black" }}>
                {"Don't have an account? Sign Up"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
  );
};
