import {
  Avatar,
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Menu,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import styles from "./TSCComment.module.css";
import PersonIcon from "@mui/icons-material/Person";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import React, { useState } from "react";
import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import DeleteIcon from "@mui/icons-material/Delete";
import MenuItem from "@mui/material/MenuItem";

type TSCCommentProps = {
  username: string;
  date: string;
  text: string;
  isSelf?: boolean;
  isFlagged?: boolean;
};

export const Comment = ({ username, date, text, isSelf = true, isFlagged = false }: TSCCommentProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isMobile) {
      setMobileOpen(true);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setMobileOpen(false);
  };

  const handleReport = () => {
    console.log("reported");
    handleClose();
  };

  const handleDelete = () => {
    console.log("delete");
    handleClose();
  };

  return (
    <Box className={styles.container} bgcolor="secondaryBackground.main">
      <IconButton className={styles.moreVertIcon} onClick={handleClick}>
        <MoreVertIcon />
      </IconButton>

      {/*  menu for desktop and tablet */}
      <Menu
        open={open}
        onClose={handleClose}
        anchorEl={!isMobile ? anchorEl : null}
        anchorReference={isMobile ? "anchorPosition" : "anchorEl"}
        anchorPosition={isMobile ? { top: window.innerHeight - 10, left: window.innerWidth / 2 } : undefined}
        transformOrigin={{
          vertical: isMobile ? "bottom" : "top",
          horizontal: isMobile ? "center" : "left"
        }}>
        <MenuItem onClick={() => handleReport()}>
          <OutlinedFlagIcon sx={{ color: "text.primary" }} />
          <Typography color="text.primary">Report</Typography>
        </MenuItem>
        {isSelf && (
          <MenuItem onClick={() => handleDelete()}>
            <DeleteIcon sx={{ color: "text.primary" }} />
            <Typography color="text.primary">Delete</Typography>
          </MenuItem>
        )}
      </Menu>

      {/*  dialog for mobile */}
      <Dialog
        open={mobileOpen}
        onClose={handleClose}
        fullWidth
        PaperProps={{
          sx: {
            position: "fixed",
            bottom: 0,
            borderRadius: 3,
            width: "92%"
          }
        }}>
        <DialogContent sx={{ p: 2 }}>
          <Box>
            <MenuItem onClick={() => handleReport()}>
              <OutlinedFlagIcon sx={{ color: "text.primary" }} />
              <Typography color="text.primary">Report</Typography>
            </MenuItem>
            {isSelf && (
              <MenuItem onClick={() => handleDelete()}>
                <DeleteIcon sx={{ color: "text.primary" }} />
                <Typography color="text.primary">Delete</Typography>
              </MenuItem>
            )}
          </Box>
        </DialogContent>
      </Dialog>
      <Avatar>
        <PersonIcon />
      </Avatar>
      <div className={styles.textContainer}>
        <div className={styles.topTextContainer}>
          <Typography className={styles.usernameText}>{username}</Typography>
          <Typography className={styles.dateText}>{date}</Typography>
        </div>
        <Typography className={styles.commentText}>{text}</Typography>
        {isFlagged && (
          <Typography className={styles.flaggedText} style={{ color: theme.palette.error.main }}>
            This comment has been flagged.
          </Typography>
        )}
      </div>
    </Box>
  );
};
