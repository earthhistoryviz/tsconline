import { Avatar, Box, Button, IconButton, Typography, useTheme } from "@mui/material";
import styles from "./TSCComment.module.css";
import PersonIcon from "@mui/icons-material/Person";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import DeleteIcon from "@mui/icons-material/Delete";

type TSCCommentProps = {
  username: string;
  date: string;
  text: string;
  isSelf?: boolean;
};

export const Comment = ({ username, date, text, isSelf = true }: TSCCommentProps) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleReport = () => {
    console.log("reported");
  };

  const handleDelete = () => {
    console.log("delete");
  };

  return (
    <Box className={styles.container} bgcolor="secondaryBackground.main">
      <IconButton className={styles.moreVertIcon} onClick={() => setShowMenu(!showMenu)}>
        <MoreVertIcon />
      </IconButton>
      {showMenu && (
        <div className={styles.menuContainer}>
          <Button
            variant="contained"
            className={styles.reportContainer}
            sx={{ backgroundColor: "secondaryBackground.main" }}
            onClick={() => handleReport()}>
            <OutlinedFlagIcon sx={{ color: "text.primary" }} />
            <Typography color="text.primary">Report</Typography>
          </Button>
          {isSelf && (
            <Button
              variant="contained"
              className={styles.deleteContainer}
              sx={{ backgroundColor: "secondaryBackground.main" }}
              onClick={() => handleDelete()}>
              <DeleteIcon sx={{ color: "text.primary" }} />
              <Typography color="text.primary">Delete</Typography>
            </Button>
          )}
        </div>
      )}
      <Avatar>
        <PersonIcon />
      </Avatar>
      <div className={styles.textContainer}>
        <div className={styles.topTextContainer}>
          <Typography className={styles.usernameText}>{username}</Typography>
          <Typography className={styles.dateText}>{date}</Typography>
        </div>
        <Typography className={styles.commentText}>{text}</Typography>
      </div>
    </Box>
  );
};
