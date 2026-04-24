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
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate } from "react-router";
import { GeoGPTSettingsPopup } from "./GeoGPTSettingsPopup";
import { context } from "../state";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";

import { fetcher } from "../util";

export const AccountMenu = observer(() => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const open = Boolean(anchorEl);
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenSettings = () => {
    actions.setGeoGPTSettingsSeen(true);
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const geogptChatUrl = state.user.geogptChatUrl;

  const createMcpSession = async () => {
    const shouldAutoOpen = state.user.settings.geogptAutoOpen;

    try {
      setLoading(true);
      const res = await fetcher("/mcp/create-session", {
        method: "POST",
        credentials: "include"
      });

      const json = await res.json();
      if (!res.ok) {
        actions.pushSnackbar(json?.error || "Failed to create GeoGPT session. Please try again later.", "warning");
        return;
      }

      const sessionId = json.sessionId as string | undefined;
      if (!sessionId) {
        actions.pushSnackbar("GeoGPT session ID was not returned by the server.", "warning");
        return;
      }

      actions.setGeoGPTSessionId(sessionId);

      const userInfoRes = await fetcher("/mcp/user-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId
        })
      });
      if (!userInfoRes.ok) {
        actions.pushSnackbar("GeoGPT session created, but account sync failed.", "warning");
      }

      try {
        await navigator.clipboard.writeText(sessionId);
        actions.pushSnackbar("GeoGPT session ID created and copied. Paste it into GeoGPT chat.", "success");
      } catch {
        actions.pushSnackbar("GeoGPT session ID created. Copy it from GeoGPT settings.", "warning");
      }

      if (shouldAutoOpen) {
        const geogptTab = window.open(geogptChatUrl, "_blank");
        if (!geogptTab) {
          actions.pushSnackbar("GeoGPT tab was blocked by your browser.", "warning");
        }
      }
    } catch {
      actions.pushSnackbar("Failed to create GeoGPT session. Please try again later.", "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMcpSession = async () => {
    if (!state.user.settings.geogptSettingsSeen) {
      setSettingsOpen(true);
      actions.setGeoGPTSettingsSeen(true);
      return;
    }
    await createMcpSession();
  };
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
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <MenuItem onClick={handleCreateMcpSession} disabled={loading} sx={{ flex: 1 }}>
            <ListItemIcon>
              <ContentCopyIcon fontSize="small" color="icon" />
            </ListItemIcon>
            {t("login.create-geogpt-session")}
          </MenuItem>
          <Divider orientation="vertical" flexItem />
          <Tooltip title="GeoGPT Settings">
            <IconButton onClick={handleOpenSettings} size="small" sx={{ mx: 1 }}>
              <SettingsIcon fontSize="small" color="icon" />
            </IconButton>
          </Tooltip>
        </Box>
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
      <GeoGPTSettingsPopup
        open={settingsOpen}
        onClose={handleCloseSettings}
        onGenerate={async () => {
          await createMcpSession();
          setSettingsOpen(false);
        }}
      />
    </>
  );
});
