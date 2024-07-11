import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../state";
import { UnauthorizedAccess } from "./UnauthorizedAccess";

export const Admin = observer(function Admin() {
  const { state } = useContext(context);
  if (!state.user.isAdmin) return <UnauthorizedAccess />;
  return <div>Admin</div>;
});
