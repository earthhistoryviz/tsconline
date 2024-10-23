import { observer } from "mobx-react-lite";
import { useContext, useEffect, useRef } from "react";
import { context } from "../state";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef } from "ag-grid-community";
import { Box, Divider, Typography, useTheme } from "@mui/material";
import { AdminAddUserForm } from "./AdminAddUserForm";
import {
  AdminSharedUser,
  DatapackIndex,
  BaseDatapackProps,
  assertAdminSharedUser,
  isUserDatapack
} from "@tsconline/shared";
import { TSCButton } from "../components";
import { isOwnedByUser } from "../state/non-action-util";
import React from "react";
import { ShowAdditionalUserInfo } from "./AdminShowAdditionalUserInfo";
import { loadRecaptcha, removeRecaptcha } from "../util";

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
  { headerName: "Picture URL", field: "pictureUrl", width: 80, autoHeaderHeight: true, wrapHeaderText: true, flex: 1 },
  {
    headerName: "More",
    field: "workshopsId",
    width: 100,
    autoHeaderHeight: true,
    wrapHeaderText: true,
    flex: 1,
    cellRenderer: ShowAdditionalUserInfo
  }
];
const userDefaultColDefs = {
  flex: 2,
  minWidth: 80
};

export const AdminUserConfig = observer(function AdminUserConfig() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const gridRef = useRef<AgGridReact<AdminSharedUser>>(null);

  /**
   * delete selected users
   * @returns
   */
  const deleteUsers = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || !selectedNodes.length) return;
    try {
      const users = selectedNodes.map((node) => {
        assertAdminSharedUser(node.data);
        return node.data;
      });
      await actions.adminDeleteUsers(users);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <Box className="admin-user-config-buttons">
        <AdminAddUserForm />
        <TSCButton onClick={deleteUsers}>Delete Selected Users</TSCButton>
      </Box>
      <AgGridReact
        defaultColDef={userDefaultColDefs}
        ref={gridRef}
        rowMultiSelectWithClick
        rowSelection="multiple"
        rowDragManaged
        columnDefs={userColDefs}
        rowData={state.admin.displayedUsers}
        components={{ ShowAdditionalUserInfo }}
        onModelUpdated={() => actions.adminSetDisplayedUserDatapacks({})}
        onRowSelected={async (event) => {
          if (event.node.isSelected()) {
            if (!event.data.uuid || typeof event.data.uuid !== "string") return;
            await actions.adminAddDisplayedUserDatapack(event.data.uuid);
          } else {
            // remove the user's datapacks from the index
            if (!event.data.uuid || typeof event.data.uuid !== "string") return;
            actions.adminRemoveDisplayedUserDatapack(event.data.uuid);
          }
        }}
      />
      <Box mt="20px">
        <Typography variant="h5">Selected Users&apos; Datapacks</Typography>
        <Box m="20px">
          <Divider />
        </Box>
      </Box>
      <AdminDatapackDetails
        datapackIndex={Object.values(state.admin.displayedUserDatapacks).reduce((acc, val) => ({ ...acc, ...val }), {})}
      />
    </Box>
  );
});

const datapackColDefs: ColDef[] = [
  {
    headerName: "Datapack Title",
    field: "title",
    sortable: true,
    filter: true,
    rowDrag: true,
    flex: 1,
    checkboxSelection: true
  },
  { headerName: "File Name", field: "file", flex: 1, sortable: true, filter: true },
  { headerName: "Age Units", field: "ageUnits", flex: 1 },
  { headerName: "Description", field: "description", flex: 1 },
  { headerName: "Size", field: "size", flex: 1 },
  { headerName: "Format Version", field: "formatVersion", flex: 1 }
];
type AdminDatapackDetailsProps = {
  datapackIndex: DatapackIndex;
};
const AdminDatapackDetails: React.FC<AdminDatapackDetailsProps> = observer(({ datapackIndex }) => {
  const theme = useTheme();
  const { actions, state } = useContext(context);
  const gridRef = useRef<AgGridReact<BaseDatapackProps>>(null);
  /**
   * delete selected datapacks then refetch the user's datapacks
   * @returns
   */
  const deleteDatapacks = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || !selectedNodes.length) return;
    try {
      const datapacks = selectedNodes.map((node) => {
        if (!node.data?.storedFileName || !isOwnedByUser(node.data, state.user?.uuid))
          throw new Error("Invalid datapack");
        return { uuid: isUserDatapack(node.data) ? node.data.uuid : "", datapack: node.data.storedFileName };
      });
      const uuids = new Set<string>(datapacks.map((dp) => dp.uuid).filter((uuid) => !!uuid));
      await actions.adminDeleteUserDatapacks(datapacks);
      actions.updateAdminUserDatapacks([...uuids]);
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <Box m="10px">
        <TSCButton onClick={deleteDatapacks}>Delete Selected Datapacks</TSCButton>
      </Box>
      <AgGridReact
        ref={gridRef}
        rowSelection="multiple"
        rowMultiSelectWithClick
        rowDragManaged
        columnDefs={datapackColDefs}
        rowData={Object.values(datapackIndex)}
      />
    </Box>
  );
});
