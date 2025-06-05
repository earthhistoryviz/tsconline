import { Avatar, IconButton, TextField, Typography } from "@mui/material";
import styles from "./TSCDiscussion.module.css";
import { CustomDivider } from "./TSCComponents";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import { Comment } from "./TSCComment";
import { useContext, useEffect } from "react";
import { fetcher } from "../util";
import { useParams } from "react-router";
import { ErrorCodes } from "../util/error-codes";
import { context } from "../state";
import { observer } from "mobx-react-lite";
import { getRecaptchaToken } from "../state/actions";
import { CommentType, assertCommentType } from "@tsconline/shared";

export const Discussion = observer(() => {
  const { id } = useParams();
  const { state, actions } = useContext(context);
  const { uuid, username, pictureUrl } = state.user;

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
            assertCommentType(com);
            const loadedComment: CommentType = {
              id: com.id,
              username: com.username,
              uuid: com.uuid,
              pictureUrl: com.pictureUrl,
              dateCreated: new Date(com.dateCreated),
              flagged: Boolean(com.flagged),
              isSelf: com.uuid === uuid,
              commentText: com.commentText,
              datapackTitle: com.datapackTitle
            };
            loadedComments.push(loadedComment);
          }
          loadedComments.sort((a, b) => b.dateCreated.getTime() - a.dateCreated.getTime());
          actions.setDatapackProfileComments(loadedComments);
          actions.removeAllErrors();
        } else {
          if (response.status === 500) {
            actions.pushError(ErrorCodes.DATAPACK_COMMENT_FETCH_FAILED);
          }
        }
        const response2 = await fetcher(`/admin/datapack/dailyComments`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: "leytonbostre@gmail.com"
          })
        });
        if (response2.ok) {
          console.log("Daily comments fetched successfully.");
        }
      } catch (e) {
        console.error(e);
        actions.pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
      }
    }
    fetchComments();
  }, []);

  const addComment = async () => {
    if (!id || state.commentInput === "") {
      return;
    }

    if (!state.isLoggedIn) {
      actions.pushSnackbar("You must be logged in to post a comment.", "warning");
      return;
    }

    try {
      const recaptchaToken = await getRecaptchaToken("addComment");
      if (!recaptchaToken) return;
      const response = await fetcher(`/user/datapack/addComment/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "recaptcha-token": recaptchaToken
        },
        credentials: "include",
        body: JSON.stringify({
          commentText: state.commentInput,
          datapackTitle: id
        })
      });
      if (response.ok) {
        const data = await response.json();
        const newCommentId = data.id;
        const date = new Date();
        const newComment = {
          username: username,
          dateCreated: date,
          commentText: state.commentInput,
          isSelf: true,
          id: newCommentId,
          uuid: uuid,
          flagged: false,
          pictureUrl: pictureUrl ?? null,
          datapackTitle: id
        };
        actions.addDatapackProfileComment(newComment);
        actions.setCommentInput("");
        actions.pushSnackbar("Comment added.", "success");
        actions.removeAllErrors();
      } else {
        if (response.status === 401) {
          actions.pushError(ErrorCodes.NOT_LOGGED_IN);
        } else if (response.status === 500) {
          actions.pushError(ErrorCodes.DATAPACK_COMMENT_CREATION_FAILED);
        }
      }
    } catch (e) {
      console.error(e);
      actions.pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  };

  const deleteComment = async (id: number) => {
    if (state.user.isAdmin) {
      const response = await actions.adminDeleteDatapackComment(id);
      if (!response) {
        actions.pushError(ErrorCodes.DATAPACK_COMMENT_DELETE_FAILED);
      }
      return;
    }
    try {
      const recaptchaToken = await getRecaptchaToken("deleteComment");
      if (!recaptchaToken) return;
      const response = await fetcher(`/user/datapack/comments/${id}`, {
        method: "DELETE",
        headers: {
          "recaptcha-token": recaptchaToken
        },
        credentials: "include"
      });
      if (response.ok) {
        actions.deleteDatapackProfileComment(id);
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
      console.error(e);
      actions.pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
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
          value={state.commentInput}
          onChange={(e) => actions.setCommentInput(e.target.value)}
          inputProps={{ className: styles.userinput }}
          InputProps={{ classes: { notchedOutline: styles.notchedOutline }, className: styles.userInput }}
        />
        <IconButton className={styles.send} onClick={addComment}>
          <SendIcon />
        </IconButton>
      </div>
      <CustomDivider />
      <div className={styles.dc}>
        {state.datapackProfilePage.comments.length === 0 ? (
          <>
            <Typography className={styles.dt}>No discussions yet</Typography>
            <Typography className={styles.description}>
              Be the first to start a discussion about this datapack
            </Typography>
          </>
        ) : (
          <div className={styles.commentsContainer}>
            {state.datapackProfilePage.comments.map((comment) => (
              <Comment
                key={`${comment.id}${comment.uuid}`}
                comment={comment}
                isSelf={comment.uuid === uuid}
                handleDelete={() => deleteComment(comment.id)}
                userLoggedIn={state.isLoggedIn}
                userIsAdmin={state.user.isAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
