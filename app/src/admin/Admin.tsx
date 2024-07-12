import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import { context } from "../state";
import { UnauthorizedAccess } from "./UnauthorizedAccess";
import { AgGridReact } from "ag-grid-react";
import { executeRecaptcha, fetcher, loadRecaptcha, removeRecaptcha } from "../util";
import { User } from "../types";
import { ErrorCodes } from "../util/error-codes";
import { Typography } from "@mui/material";

export const Admin = observer(function Admin() {
  const { state, actions } = useContext(context);
  useEffect(() => {
    loadRecaptcha().then(() => {
      actions.fetchUsers();
    });
    return () => {
      removeRecaptcha();
    };
  }, []);
  if (!state.user.isAdmin) return <UnauthorizedAccess />;
  return (
    <div>
      {state.admin.displayedUsers.map((user) => (
        <Typography key={user.uuid}>{user.username}</Typography>
      ))}
    </div>
  );
});
