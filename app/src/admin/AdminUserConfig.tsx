import { observer } from "mobx-react-lite";
import { useContext, useEffect, useRef, useState } from "react";
import { context } from "../state";
import { loadRecaptcha, removeRecaptcha } from "../util";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef } from "ag-grid-community";
import { Box, useTheme } from "@mui/material";
import { AdminAddUserForm } from "./AdminAddUserForm";
import { AdminSharedUser, DatapackIndex, assertAdminSharedUser } from "@tsconline/shared";
import { TSCButton } from "../components";

const checkboxRenderer = (params: { value: boolean }) => {
  if (params.value === true) {
    return <span className="ag-icon-tick" />;
  } else {
    return <span className="ag-icon-cross" />;
  }
};

const userColDefs: ColDef[] = [
  {
    headerName: "Username",
    field: "username",
    sortable: true,
    filter: true,
    rowDrag: true,
    checkboxSelection: true,
    headerCheckboxSelection: true,
    minWidth: 120
  },
  { headerName: "Email", field: "email", sortable: true, filter: true },
  { headerName: "UUID", field: "uuid" },
  { headerName: "User ID", field: "userId", flex: 1 },
  {
    headerName: "Admin",
    field: "isAdmin",
    width: 90,
    autoHeaderHeight: true,
    wrapHeaderText: true,
    flex: 1,
    cellRenderer: checkboxRenderer
  },
  {
    headerName: "Email Verified",
    field: "emailVerified",
    width: 90,
    flex: 1,
    autoHeaderHeight: true,
    wrapHeaderText: true,
    cellRenderer: checkboxRenderer
  },
  { headerName: "Google User", field: "isGoogleUser", width: 120, flex: 1, cellRenderer: checkboxRenderer },
  {
    headerName: "Invalidated Session?",
    field: "invalidateSession",
    width: 110,
    autoHeaderHeight: true,
    wrapHeaderText: true,
    flex: 1,
    cellRenderer: checkboxRenderer
  },
  { headerName: "Picture URL", field: "pictureUrl", width: 80, autoHeaderHeight: true, wrapHeaderText: true, flex: 1 }
];
const userDefaultColDefs = {
  flex: 2,
  minWidth: 80
};

export const AdminUserConfig = observer(function AdminUserConfig() {
  const { state, actions } = useContext(context);
  const [userDatapackIndex, setUserDatapackIndex] = useState<{ [uuid: string]: DatapackIndex }>({});
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
  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <AgGridReact
        defaultColDef={userDefaultColDefs}
        ref={gridRef}
        isRowSelectable={(node) => node.data.email !== state.user.email}
        rowMultiSelectWithClick
        rowSelection="multiple"
        rowDragManaged
        columnDefs={userColDefs}
        rowData={state.admin.displayedUsers}
        onRowSelected={async (event) => {
          if (event.node.isSelected()) {
            if (!event.data.uuid || typeof event.data.uuid !== "string") return;
            const datapackIndex = await actions.adminFetchUserDatapacks(event.data.uuid);
            if (!datapackIndex) return;
            setUserDatapackIndex({ ...userDatapackIndex, [event.data.uuid]: datapackIndex });
          } else {
            setUserDatapackIndex({ ...userDatapackIndex, [event.data.uuid]: {} });
          }
        }}
      />
      <Box className="admin-user-config-buttons">
        <AdminAddUserForm />
        <TSCButton onClick={deleteUsers}>Delete Selected Users</TSCButton>
      </Box>
      <AdminDatapackDetails
        datapackIndex={Object.values(userDatapackIndex).reduce((acc, val) => ({ ...acc, ...val }), {})}
      />
    </Box>
  );
});

const datapackColDefs: ColDef[] = [
  { headerName: "Datapack Title", field: "title", sortable: true, filter: true, rowDrag: true, flex: 1 },
  { headerName: "Age Units", field: "ageUnits", flex: 1 },
  { headerName: "Description", field: "description", flex: 1 },
  { headerName: "File Name", field: "file", flex: 1 },
  { headerName: "Size", field: "size", flex: 1 },
  { headerName: "Format Version", field: "formatVersion", flex: 1 }
];
type AdminDatapackDetailsProps = {
  datapackIndex: DatapackIndex;
};
const AdminDatapackDetails: React.FC<AdminDatapackDetailsProps> = observer(({ datapackIndex }) => {
  const theme = useTheme();
  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <AgGridReact columnDefs={datapackColDefs} rowData={Object.values(datapackIndex)} />
    </Box>
  );
});
