import { observer } from "mobx-react-lite";
import { useContext, useEffect, useRef } from "react";
import { context } from "../state";
import { UnauthorizedAccess } from "./UnauthorizedAccess";
import { loadRecaptcha, removeRecaptcha } from "../util";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef } from "ag-grid-community";
import { Box, useTheme } from "@mui/material";
import { AdminAddUserForm } from "./AdminAddUserForm";
import { AdminSharedUser, assertAdminSharedUser } from "@tsconline/shared";
import { TSCButton } from "../components";

const colDefs: ColDef[] = [
  {
    headerName: "Username",
    field: "username",
    sortable: true,
    filter: true,
    rowDrag: true,
    checkboxSelection: true,
    headerCheckboxSelection: true
  },
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
  const gridRef = useRef<AgGridReact<AdminSharedUser>>(null);
  useEffect(() => {
    if (!state.user.isAdmin) return;
    loadRecaptcha().then(async () => {
      await actions.fetchUsers();
    });
    return () => {
      removeRecaptcha();
    };
  }, [state.user.isAdmin]);
  const deleteUsers = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || !selectedNodes.length) return;
    try {
      const users = selectedNodes.map((node) => {
        assertAdminSharedUser(node.data);
        return node.data;
      });
      actions.adminDeleteUsers(users);
    } catch (e) {
      console.error(e);
    }
  };
  if (!state.user.isAdmin) return <UnauthorizedAccess />;
  return (
    <Box display="flex" flexDirection="column">
      <Box display="flex" flexDirection="row" gap="10px" margin="auto" mt="10px" mb="10px">
        <AdminAddUserForm />
        <TSCButton
          onClick={deleteUsers}>
          Delete Selected Users
        </TSCButton>
      </Box>
      <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
        <AgGridReact
          ref={gridRef}
          isRowSelectable={(node) => node.data.email !== state.user.email}
          rowMultiSelectWithClick
          rowSelection="multiple"
          columnDefs={colDefs}
          rowData={state.admin.displayedUsers}
          rowDragManaged={true}
        />
      </Box>
    </Box>
  );
});
