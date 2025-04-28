import { Avatar, IconButton, TextField, Typography } from "@mui/material";
import styles from "./TSCDiscussion.module.css";
import { CustomDivider } from "./TSCComponents";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import { Comment } from "./TSCComment";
import { useState } from "react";

type CommentType = {
  text: string;
  username: string;
  date: string;
};

export const Discussion = () => {
  const [comments, setComments] = useState<CommentType[]>([
    {
      username: "Username",
      date: "10 days ago",
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis vel  molestie metus, quis pellentesque odio. Morbi mattis rutrum  pellentesque. Aenean. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis vel  molestie metus, quis pellentesque odio. Morbi mattis rutrum  pellentesque. Aenean."
    },
    {
      username: "Username",
      date: "10 days ago",
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis vel  molestie metus, quis pellentesque odio. Morbi mattis rutrum  pellentesque. Aenean."
    },
    {
      username: "Username",
      date: "10 days ago",
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis vel  molestie metus, quis pellentesque odio. Morbi mattis rutrum  pellentesque. Aenean."
    }
  ]);
  const [input, setInput] = useState("");
  const addComment = () => {
    const date = new Date();
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    setComments((prevState) => [...prevState, { username: "breh", date: formattedDate, text: input }]);
    setInput("");
  };

  return (
    <div className={styles.discussion}>
      <div className={styles.header}>
        <Typography className={styles.ht}>Comments</Typography>
      </div>
      <div className={styles.user}>
        <Avatar className={styles.avatar}>
          <PersonIcon />
        </Avatar>
        <TextField
          className={styles.usercomment}
          multiline
          placeholder="Write your comment here"
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputProps={{ className: styles.userinput }}
          InputProps={{ classes: { notchedOutline: styles.notchedOutline }, className: styles.userInput }}
        />
        <IconButton className={styles.send} onClick={() => addComment()}>
          <SendIcon />
        </IconButton>
      </div>
      <CustomDivider />
      <div className={styles.dc}>
        {comments.length === 0 ? (
          <>
            <Typography className={styles.dt}>No discussions yet</Typography>
            <Typography className={styles.description}>
              Be the first to start a discussion about this datapack
            </Typography>
          </>
        ) : (
          <div className={styles.commentsContainer}>
            {comments.map((comment, index) => (
              <Comment key={index} username={comment.username} date={comment.date} text={comment.text} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
