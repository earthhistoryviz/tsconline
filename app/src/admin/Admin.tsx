import { observer } from "mobx-react-lite";
import { useContext, useEffect } from "react";
import { context } from "../state";
import { UnauthorizedAccess } from "./UnauthorizedAccess";
import { loadRecaptcha, removeRecaptcha } from "../util";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef } from "ag-grid-community";
import { Box, useTheme } from "@mui/material";
import { TSCButton } from "../components";
import { AdminAddUserForm } from "./AdminAddUserForm";

const colDefs: ColDef[] = [
  { headerName: "Username", field: "username", sortable: true, filter: true, rowDrag: true },
  { headerName: "Email", field: "email", sortable: true, filter: true },
  { headerName: "UUID", field: "uuid" },
  { headerName: "User ID", field: "userId", width: 80 },
  { headerName: "Google User", field: "isGoogleUser", width: 120 },
  {
    headerName: "Invalidated Session?",
    field: "invalidateSession",
    width: 110,
    autoHeaderHeight: true,
    wrapHeaderText: true
  },
  { headerName: "Email Verified", field: "emailVerified", width: 90, autoHeaderHeight: true, wrapHeaderText: true },
  { headerName: "Picture URL", field: "pictureUrl", width: 80, autoHeaderHeight: true, wrapHeaderText: true },
  { headerName: "Is Admin", field: "isAdmin", width: 90, autoHeaderHeight: true, wrapHeaderText: true }
];

export const Admin = observer(function Admin() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  useEffect(() => {
    loadRecaptcha().then(async () => {
      await actions.fetchUsers();
      console.log(JSON.stringify(state.admin.displayedUsers, null, 2));
    });
    return () => {
      removeRecaptcha();
    };
  }, []);
  if (!state.user.isAdmin) return <UnauthorizedAccess />;
  return (
    <Box>
      <AdminAddUserForm />
      <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
        <AgGridReact
          columnDefs={colDefs}
          rowData={state.admin.displayedUsers}
          rowDragManaged={true}
        />
      </Box>
    </Box>
  );
});
