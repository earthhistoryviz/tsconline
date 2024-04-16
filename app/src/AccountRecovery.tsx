import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import Avatar from "@mui/material/Avatar";
import { TSCButton } from "./components";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import SendIcon from "@mui/icons-material/Send";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { Paper } from "@mui/material";
import "./AccountRecovery.css";

export const AccountRecovery: React.FC = observer(() => {
  const theme = useTheme();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    console.log({
      email: data.get("email")
    });
    setSubmitted(true);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 0 }}>
        <Box className="account-recovery-box" sx={{ mt: 8 }}>
          <Avatar sx={{ "& .MuiSvgIcon-root": { mr: 0 }, bgcolor: theme.palette.navbar.dark }}>
            <LockOutlinedIcon sx={{ color: theme.palette.selection.main }} />
          </Avatar>
          {submitted ? (
            <Typography variant="h5" sx={{ mb: 1 }}>
              Email sent
            </Typography>
          ) : (
            <>
              <Typography variant="h5">Change Password</Typography>
              <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <TextField required fullWidth id="email" label="Email Address" name="email" autoComplete="email" />
                <TSCButton type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} startIcon={<SendIcon />}>
                  Send
                </TSCButton>
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
});
