import { Avatar, IconButton, TextField, Typography } from "@mui/material";
import styles from "./TSCDiscussion.module.css";
import { CustomDivider } from "./TSCComponents";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import { Comment } from "./TSCComment";
import { useContext, useState } from "react";
import { context } from "../state";

export type CommentType = {
  id: number;
  username: string;
  date: Date;
  text: string;
  isSelf?: boolean;
  isFlagged?: boolean;
};

export const Discussion = () => {
  const { state } = useContext(context);
  const [comments, setComments] = useState<CommentType[]>([
    {
      id: 0,
      username: "TestUser88",
      date: new Date("May 5, 2025"),
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis vel  molestie metus, quis pellentesque odio. Morbi mattis rutrum  pellentesque. Aenean."
    },

    {
      id: 1,
      username: "TestUser3",
      date: new Date("May 3, 2025"),
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis vel  molestie metus, quis pellentesque odio. Morbi mattis rutrum  pellentesque. Aenean."
    },
    {
      id: 2,
      username: "Username",
      date: new Date("May 1, 2025"),
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis vel  molestie metus, quis pellentesque odio. Morbi mattis rutrum  pellentesque. Aenean. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis vel  molestie metus, quis pellentesque odio. Morbi mattis rutrum  pellentesque. Aenean.",
      isFlagged: true
    }
  ]);
  const [input, setInput] = useState("");
  const addComment = () => {
    const date = new Date();
    setComments((prevState) => {
      const newComments = [{ username: "You", date, text: input, isSelf: true, id: prevState.length }, ...prevState];
      newComments.sort((a, b) => b.date.getTime() - a.date.getTime());
      return newComments;
    });
    setInput("");
  };

  const deleteComment = (id: number): void => {
    setComments((prevState) => prevState.filter((comment) => comment.id !== id));
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
              <Comment
                key={index}
                id={comment.id}
                username={comment.username}
                date={comment.date}
                text={comment.text}
                isSelf={comment?.isSelf}
                isFlagged={comment?.isFlagged}
                handleDelete={() => deleteComment(comment.id)}
                userSignedIn={state.user !== null}
                userIsAdmin={state.user.isAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
