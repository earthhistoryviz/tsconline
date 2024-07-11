import React, { useContext } from "react";
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
import { useNavigate } from "react-router";
import { context } from "../state";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material";

export const TSCAccountMenu = observer(() => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const navigate = useNavigate();
  const { state, actions } = useContext(context);
  const theme = useTheme();
  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", textAlign: "center" }}>
        <Tooltip title="Account settings">
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
          <Avatar /> Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => navigate("/signup")}>
          <ListItemIcon>
            <PersonAdd fontSize="small" color="icon" />
          </ListItemIcon>
          Add another account
        </MenuItem>
        {/* TODO: Implement Admin Controls */}
        {state.user.isAdmin && (
          <MenuItem onClick={() => navigate("/")}>
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" color="icon" />
            </ListItemIcon>
            Admin Panel
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
          Logout
        </MenuItem>
      </Menu>
    </>
  );
});
