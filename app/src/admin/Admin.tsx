import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import { context } from "../state";
import { UnauthorizedAccess } from "./UnauthorizedAccess";
import { AgGridReact } from "ag-grid-react";
import { fetcher } from "../util";
import { User } from "../types";

const fetchUsers = async () => {
  const response = await fetcher("/admin/users", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return response;
};
export const Admin = observer(function Admin() {
  const { state } = useContext(context);
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    fetchUsers().then((response) => {
      console.log(response);
    });
  }, []);
  if (!state.user.isAdmin) return <UnauthorizedAccess />;
  return <div>Admin</div>;
});
