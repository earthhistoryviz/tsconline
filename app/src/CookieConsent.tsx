import React, { useState, useContext } from "react";
import { observer } from "mobx-react-lite";
import { useTheme, Button, Typography, Box } from "@mui/material";
import styled from "@mui/material/styles/styled";
import Slide from "@mui/material/Slide";
import { context } from "./state";

const CookieConsentContainer = styled(Box)(({ theme }) => ({
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  background: theme.palette.background.paper, // Use the background color from the theme
  padding: theme.spacing(2),
  boxShadow: theme.shadows[3],
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  zIndex: 1000 // Ensure it's above everything else
}));

interface CookieConsentProps {
  persistent?: boolean;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ persistent = false }) => {
  const { state, actions } = useContext(context);
  const { cookieConsent } = state;
  const shouldShowConsent = cookieConsent === null || (persistent && cookieConsent !== true);
  const [isVisible, setIsVisible] = useState(shouldShowConsent);
  const theme = useTheme();

  // uncomment the following line to see the cookie consent banner
  // localStorage.removeItem("cookieConsent");

  const handleAccept = () => {
    actions.setCookies(true);
    setIsVisible(false);
  };

  const handleReject = () => {
    actions.setCookies(false);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Slide direction="up" in={true} mountOnEnter unmountOnExit timeout={1500}>
      <CookieConsentContainer>
        <Typography variant="body1">
          <div>
            This site uses cookies for the purpose of user logins and keeping track of user sessions. To see these
            settings again, please visit the &apos;Sign in&apos; page.
          </div>
          <div>
            Note: <strong>If you reject, you will not be able to sign in.</strong> Other features will still work.
          </div>
        </Typography>
        <Box>
          <Button
            onClick={handleAccept}
            variant="contained"
            style={{ marginRight: theme.spacing(1), color: "white", backgroundColor: "green" }}>
            Accept
          </Button>
          {!persistent && (
            <Button onClick={handleReject} variant="outlined" style={{ color: "red", borderColor: "red" }}>
              Reject
            </Button>
          )}
        </Box>
      </CookieConsentContainer>
    </Slide>
  );
};

export default observer(CookieConsent);
