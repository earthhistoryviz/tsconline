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
import React, { useContext, useState } from "react";
import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import DeleteIcon from "@mui/icons-material/Delete";
import MenuItem from "@mui/material/MenuItem";
import { useTranslation } from "react-i18next";
import { fetcher } from "../util";
import { ErrorCodes } from "../util/error-codes";
import { context } from "../state";
import { CommentType } from "../types";
import { getRecaptchaToken } from "../state/actions";

export type TSCCommentProps = {
  handleDelete: (id: number) => void;
  userLoggedIn: boolean;
  userIsAdmin: boolean;
  isSelf: boolean;
  comment: CommentType;
};

export const Comment = ({ comment, isSelf = false, handleDelete, userLoggedIn, userIsAdmin }: TSCCommentProps) => {
  const { id, username, dateCreated, commentText, flagged, pictureUrl } = comment;
  const { actions } = useContext(context);
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFlagged, setIsFlagged] = useState(flagged);
  const formattedDate = dateCreated.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

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

  const handleReport = async () => {
    try {
      const recaptchaToken = await getRecaptchaToken("updateComment");
      if (!recaptchaToken) {
        handleClose();
        return;
      }
      const response = await fetcher(`/user/datapack/comments/report/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "recaptcha-token": recaptchaToken
        },
        credentials: "include",
        body: JSON.stringify({
          flagged: 1
        })
      });
      if (response.ok) {
        setIsFlagged(true);
        actions.pushSnackbar("Comment reported.", "success");
        actions.removeAllErrors();
      } else {
        if (response.status === 500) {
          actions.pushError(ErrorCodes.DATAPACK_COMMENT_REPORT_FAILED);
        } else if (response.status === 404) {
          actions.pushError(ErrorCodes.DATAPACK_COMMENT_NOT_FOUND);
        }
      }
      handleClose();
    } catch (e) {
      console.error(e);
      actions.pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  };

  const handleDeleteComment = async () => {
    handleDelete(id);
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
        <MenuItem onClick={() => handleReport()} disabled={!userLoggedIn}>
          <OutlinedFlagIcon sx={{ color: "text.primary" }} />
          <Typography color="text.primary">{t("general-actions.report")}</Typography>
        </MenuItem>
        {((isSelf && userLoggedIn) || userIsAdmin) && (
          <MenuItem onClick={() => handleDeleteComment()}>
            <DeleteIcon sx={{ color: "text.primary" }} />
            <Typography color="text.primary">{t("general-actions.delete")}</Typography>
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
            <MenuItem
              onClick={handleReport}
              disabled={!userLoggedIn}
              sx={{ pointerEvents: !userLoggedIn ? "auto" : "initial" }} // Ensures tooltip still shows
            >
              <OutlinedFlagIcon sx={{ color: "text.primary" }} />
              <Typography color="text.primary">{t("general-actions.report")}</Typography>
            </MenuItem>

            {((isSelf && userLoggedIn) || userIsAdmin) && (
              <MenuItem onClick={() => handleDeleteComment()}>
                <DeleteIcon sx={{ color: "text.primary" }} />
                <Typography color="text.primary">{t("general-actions.delete")}</Typography>
              </MenuItem>
            )}
          </Box>
        </DialogContent>
      </Dialog>
      {pictureUrl ? (
        <Avatar src={pictureUrl} sx={{ border: "2px solid", borderColor: "gray" }} />
      ) : (
        <Avatar sx={{ border: "2px solid", borderColor: "gray" }}>
          <PersonIcon />
        </Avatar>
      )}
      <div className={styles.textContainer}>
        <div className={styles.topTextContainer}>
          <Typography className={styles.usernameText}>{username}</Typography>
          <Typography className={styles.dateText}>{formattedDate}</Typography>
        </div>
        <Typography className={styles.commentText}>{commentText}</Typography>
        {isFlagged && (
          <Typography className={styles.flaggedText} style={{ color: theme.palette.error.main }}>
            {t("settings.datapacks.comment-flagged")}
          </Typography>
        )}
      </div>
    </Box>
  );
};
