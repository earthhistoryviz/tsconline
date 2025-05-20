import { Avatar, IconButton, TextField, Typography } from "@mui/material";
import styles from "./TSCDiscussion.module.css";
import { CustomDivider } from "./TSCComponents";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import { Comment } from "./TSCComment";
import { useEffect, useState } from "react";
import { actions, State } from "../state";
import { executeRecaptcha, fetcher } from "../util";
import { useParams } from "react-router";
import { ErrorCodes } from "../util/error-codes";

type DiscussionProps = {
  state: State;
};

export type CommentType = {
  id: number;
  username: string;
  uuid: string;
  dateCreated: Date;
  text: string;
  isSelf?: boolean;
  isFlagged?: boolean;
};

export const Discussion = ({ state }: DiscussionProps) => {
  const { id } = useParams();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [input, setInput] = useState("");
  const { uuid, username } = state.user;

  useEffect(() => {
    if (!id) return;
    // fetches datapack comments
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
              dateCreated: new Date(com.dateCreated),
              isFlagged: Boolean(com.flagged),
              isSelf: com.uuid === uuid,
              text: com.commentText
            };
            loadedComments.push(loadedComment);
          }
          loadedComments.sort((a, b) => b.dateCreated.getTime() - a.dateCreated.getTime());
          setComments(loadedComments);
          actions.removeAllErrors();
        } else {
          if (response.status === 500) {
            actions.pushError(ErrorCodes.DATAPACK_COMMENT_FETCH_FAILED);
          }
        }
      } catch (e) {
        console.log("error", e);
      }
    }
    fetchComments();
  }, [id]);

  const addComment = async () => {
    if (!id || input === "") {
      return;
    }

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
        const date = new Date();
        setComments((prevState) => {
          const newComments = [
            {
              username: username,
              dateCreated: date,
              text: input,
              isSelf: true,
              id: newCommentId,
              uuid: uuid,
              isFlagged: false
            },
            ...prevState
          ];
          newComments.sort((a, b) => b.dateCreated.getTime() - a.dateCreated.getTime());
          setInput("");
          return newComments;
        });
        actions.removeAllErrors();
      } else {
        if (response.status === 401) {
          actions.pushError(ErrorCodes.NOT_LOGGED_IN);
        } else if (response.status === 500) {
          actions.pushError(ErrorCodes.DATAPACK_COMMENT_CREATION_FAILED);
        }
      }
    } catch (e) {
      console.log("error", e);
    }
  };

  const deleteComment = async (id: number) => {
    if (state.user.isAdmin) {
      const response = await actions.adminDeleteDatapackComment(id);
      if (!response) {
        actions.pushError(ErrorCodes.DATAPACK_COMMENT_DELETE_FAILED);
      }
      actions.pushSnackbar("Comment deleted.", "success");
      return;
    }
    try {
      const recaptchaToken: string = await executeRecaptcha("deleteComment");
      if (!recaptchaToken) {
        actions.pushError(ErrorCodes.RECAPTCHA_FAILED);
        return;
      }
      const response = await fetcher(`/user/datapack/comments/${id}`, {
        method: "DELETE",
        headers: {
          "recaptcha-token": recaptchaToken
        },
        credentials: "include"
      });
      if (response.ok) {
        setComments((prevState) => prevState.filter((comment) => comment.id !== id));
        actions.pushSnackbar("Comment deleted.", "success");
        actions.removeAllErrors();
      } else {
        if (response.status === 500) {
          actions.pushError(ErrorCodes.DATAPACK_COMMENT_DELETE_FAILED);
        } else if (response.status === 404) {
          actions.pushError(ErrorCodes.DATAPACK_COMMENT_NOT_FOUND);
        }
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
          disabled={!state.isLoggedIn}
          onChange={(e) => setInput(e.target.value)}
          inputProps={{ className: styles.userinput }}
          InputProps={{ classes: { notchedOutline: styles.notchedOutline }, className: styles.userInput }}
        />
        <IconButton className={styles.send} onClick={addComment} disabled={!state.isLoggedIn}>
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
            {comments.map((comment) => (
              <Comment
                key={`${comment.id}${comment.uuid}`}
                id={comment.id}
                username={comment.username}
                dateCreated={comment.dateCreated}
                text={comment.text}
                isSelf={comment.uuid === uuid}
                isFlagged={comment.isFlagged}
                handleDelete={() => deleteComment(comment.id)}
                userLoggedIn={state.isLoggedIn}
                userIsAdmin={state.user.isAdmin}
                uuid={uuid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
