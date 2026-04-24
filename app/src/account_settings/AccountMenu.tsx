import React, { useContext, useState } from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import PersonAdd from "@mui/icons-material/PersonAdd";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import Logout from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router";
import { context } from "../state";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { MCPCreateSessionRequest } from "@tsconline/shared";

import { fetcher } from "../util";
import { ErrorCodes } from "../util/error-codes";
import { extractCurrentChartState } from "../util/chart-state-extractor";

export const AccountMenu = observer(() => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleCreateMcpSession = async () => {
    try {
      setLoading(true);

      const userChartState = extractCurrentChartState(state);
      const createSessionPayload: MCPCreateSessionRequest = { userChartState };

      const res = await fetcher("/mcp/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(createSessionPayload)
      });

      const json = await res.json();
      if (!res.ok) {
        actions.pushError(ErrorCodes.UNABLE_TO_LOGIN_SERVER);
        return;
      }

      const sessionId = json.sessionId as string | undefined; // previous call will return sessionID that was created for that entry
      if (!sessionId) {
        actions.pushError(ErrorCodes.UNABLE_TO_LOGIN_SERVER);
        return;
      }

      actions.setGeoGPTSessionId(sessionId);

      await fetcher("/mcp/user-info", {
        // populate that entry that the passed in sessionId maps to - in order add the current userInfo
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId
        })
      });

      await navigator.clipboard.writeText(sessionId); // also copy that sessionId to clipboard for copy-paste purposes
      actions.pushSnackbar("GeoGPT session ID created and copied. Paste it into GeoGPT chat.", "success");

      if (!geogptChatUrl) {
        return;
      }

      window.open(geogptChatUrl, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };
  const navigate = useNavigate();
  const { state, actions } = useContext(context);
  const geogptChatUrl = state.user.geogptChatUrl;
  const theme = useTheme();
  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", textAlign: "center" }}>
        <Tooltip title={t("login.tooltip")}>
          <IconButton
            onClick={handleClick}
            size="small"
            sx={{ ml: 2 }}
            aria-controls={open ? "account-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}>
            {state.user.pictureUrl ? (
              <Avatar src={state.user.pictureUrl} sx={{ border: "2px solid", borderColor: "button.main" }} />
            ) : (
              <Avatar sx={{ border: "2px solid", borderColor: "button.main" }}>
                <PersonIcon />
              </Avatar>
            )}
          </IconButton>
        </Tooltip>
      </Box>
      <Menu
        anchorEl={anchorEl}
        className="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: "visible",
              filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
              bgcolor: "secondaryBackground.main",
              border: `1px solid ${theme.palette.divider}`,
              mt: 1.5,
              "& .MuiAvatar-root": {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1
              }
            }
          }
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}>
        <MenuItem onClick={() => navigate("/profile")}>
          <Avatar /> {t("login.profile")}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleCreateMcpSession} disabled={loading}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" color="icon" />
          </ListItemIcon>
          {t("login.create-geogpt-session")}
        </MenuItem>
        <MenuItem onClick={() => navigate("/signup")}>
          <ListItemIcon>
            <PersonAdd fontSize="small" color="icon" />
          </ListItemIcon>
          {t("login.add")}
        </MenuItem>
        {state.user.isAdmin && (
          <MenuItem onClick={() => navigate("/admin")}>
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" color="icon" />
            </ListItemIcon>
            {t("login.admin")}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            actions.logout();
            navigate("/login");
          }}>
          <ListItemIcon>
            <Logout fontSize="small" color="icon" />
          </ListItemIcon>
          {t("login.logout")}
        </MenuItem>
      </Menu>
    </>
  );
});
