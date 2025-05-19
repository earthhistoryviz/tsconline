import { Avatar, IconButton, TextField, Typography } from "@mui/material";
import styles from "./TSCDiscussion.module.css";
import { CustomDivider } from "./TSCComponents";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import { Comment } from "./TSCComment";
import { useContext, useEffect, useState } from "react";
import { actions, context } from "../state";
import { executeRecaptcha, fetcher } from "../util";
import { useParams } from "react-router";
import { ErrorCodes } from "../util/error-codes";

export type CommentType = {
  id: number;
  username: string;
  uuid: string;
  date: Date;
  text: string;
  isSelf?: boolean;
  isFlagged?: boolean;
};

export const Discussion = () => {
  const { state } = useContext(context);
  const { id } = useParams();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    async function fetchComments() {
      if (!id) {
        return;
      }
      try {
        const response = await fetcher(`/user/datapack/comments/${encodeURIComponent(id)}`, {
          method: "GET",
          credentials: "include"
        });
        if (response.ok) {
          const commentsArray = await response.json();
          const loadedComments: CommentType[] = [];
          for (const com of commentsArray) {
            const loadedComment: CommentType = {
              ...com,
              date: new Date(com.dateCreated),
              isFlagged: Boolean(com.flagged),
              text: com.commentText,
              isSelf: com.uuid === state.user.uuid
            };
            loadedComments.push(loadedComment);
          }
          setComments(loadedComments);
          actions.removeAllErrors();
        } else {
          console.log("error", response);
        }
      } catch (e) {
        console.log("error", e);
      }
    }
    fetchComments();
  }, [id]);

  const addComment = async () => {
    if (input === "") {
      return;
    }
    if (!id) {
      return;
    }
    const date = new Date();
    try {
      const recaptchaToken: string = await executeRecaptcha("addComment");
      if (!recaptchaToken) {
        actions.pushError(ErrorCodes.RECAPTCHA_FAILED);
        return;
      }
      const response = await fetcher(`/user/datapack/addComment/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "recaptcha-token": recaptchaToken
        },
        credentials: "include",
        body: JSON.stringify({
          commentText: input,
          datapackTitle: id
        })
      });
      if (response.ok) {
        const data = await response.json();
        const newCommentId = data.id;
        setComments((prevState) => {
          const newComments = [
            {
              username: state.user.username,
              date,
              text: input,
              isSelf: true,
              id: newCommentId,
              uuid: state.user.uuid
            },
            ...prevState
          ];
          newComments.sort((a, b) => b.date.getTime() - a.date.getTime());
          return newComments;
        });
        actions.removeAllErrors();
      } else {
        console.log("error", response);
      }
    } catch (e) {
      console.log("error", e);
    }
    setInput("");
  };

  const deleteComment = async (id: number, uuid: string) => {
    try {
      const recaptchaToken: string = await executeRecaptcha("deleteComment");
      if (!recaptchaToken) {
        actions.pushError(ErrorCodes.RECAPTCHA_FAILED);
        return;
      }
      if (state.user.uuid !== uuid) {
        actions.pushError(ErrorCodes.UNABLE_TO_VERIFY_ACCOUNT);
        return;
      }
      const response = await fetcher(`/user/datapack/comments/delete/${id}`, {
        method: "POST",
        headers: {
          "recaptcha-token": recaptchaToken
        },
        credentials: "include"
      });
      if (response.ok) {
        setComments((prevState) => prevState.filter((comment) => comment.id !== id));
        actions.removeAllErrors();
      } else {
        console.log("error", response);
      }
    } catch (e) {
      console.log("error", e);
    }
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
        <IconButton className={styles.send} onClick={addComment}>
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
                isFlagged={comment.isFlagged}
                handleDelete={() => deleteComment(comment.id, comment.uuid)}
                userLoggedIn={state.isLoggedIn}
                userIsAdmin={state.user.isAdmin}
                uuid={state.user.uuid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
