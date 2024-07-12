import { observer } from "mobx-react-lite";
import { useContext, useEffect } from "react";
import { context } from "../state";
import { UnauthorizedAccess } from "./UnauthorizedAccess";
import { loadRecaptcha, removeRecaptcha } from "../util";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef } from "ag-grid-community";

const colDefs: ColDef[] = [
  { headerName: "Username", field: "username" },
  { headerName: "Email", field: "email" },
  { headerName: "UUID", field: "uuid" },
  { headerName: "User ID", field: "userId" },
  { headerName: "Is a Google User", field: "isGoogleUser" },
  { headerName: "Invalidated Sessions", field: "invalidateSession" },
  { headerName: "Email Verified", field: "emailVerified" },
  { headerName: "Picture URL", field: "pictureUrl" },
  { headerName: "Is Admin", field: "isAdmin" }
];

export const Admin = observer(function Admin() {
  const { state, actions } = useContext(context);
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
    <div className="ag-theme-quartz" style={{ height: 500 }}>
      <AgGridReact
        columnDefs={colDefs}
        rowData={state.admin.displayedUsers}
        pagination={true}
        paginationPageSize={20}
      />
    </div>
  );
});
