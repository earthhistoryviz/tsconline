import React, { useState, useContext } from "react";
import { observer } from "mobx-react-lite";
import { useTheme, Button, Typography, Box } from "@mui/material";
import styled from "@mui/material/styles/styled";
import Slide from "@mui/material/Slide";
import { context } from "./state";
import "./CookieConsent.css";

const CookieConsentContainer = styled(Box)(({ theme }) => ({
  background: theme.palette.secondaryBackground.main, // Use the background color from the theme
  padding: theme.spacing(2),
  boxShadow: theme.shadows[3]
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
      <CookieConsentContainer className="cookie-consent-container">
        <Typography variant="body1">
          This site uses cookies for the purpose of user logins and keeping track of user sessions. To see these
          settings again, please visit the &apos;Sign in&apos; page. Note:{" "}
          <strong>If you reject, you will not be able to sign in.</strong> Other features will still work.
        </Typography>
        <Box className="cookie-button-grouping">
          {!persistent && (
            <Button className="reject-cookies-button" onClick={handleReject} variant="outlined">
              Reject
            </Button>
          )}
          <Button className="accept-cookies-button" onClick={handleAccept} variant="contained" color="button">
            Accept
          </Button>
        </Box>
      </CookieConsentContainer>
    </Slide>
  );
};

export default observer(CookieConsent);
