import { Box, Divider, Tab, Tabs, Typography, styled } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AdminUserConfig } from "./AdminUserConfig";
import { useContext, useEffect } from "react";
import { context } from "../state";
import { PersonOutline, DataObject, School } from "@mui/icons-material";
import { useState } from "react";
import Color from "color";
import "./Admin.css";
import { UnauthorizedAccess } from "./UnauthorizedAccess";
import { AdminDatapackConfig } from "./AdminDatapackConfig";
import { AdminWorkshop } from "./AdminWorkshop";
import { loadRecaptcha, removeRecaptcha } from "../util";
import { usePopupBlocker } from "../util/blocker";
import { TSCYesNoPopup } from "../components";

const AdminTab = styled(Tab)(({ theme }) => ({
  textTransform: "none",
  minHeight: "auto",
  borderRadius: "10px",
  "&.Mui-selected": {
    backgroundColor: Color(theme.palette.button.main).alpha(0.15).string(),
    transition: "background-color 0.3s"
  },
  "&:hover:not(.Mui-selected)": {
    backgroundColor: Color(theme.palette.button.light).alpha(0.1).string(),
    transition: "background-color 0.3s"
  }
}));
const AdminTabs = styled(Tabs)(() => ({
  margin: "20px 5px",
  width: "180px",
  justifyContent: "flex-start",
  "& .MuiTabs-indicator": {
    display: "none"
  }
}));

export const Admin = observer(function Admin() {
  const [tabIndex, setTabIndex] = useState(0);
  const { actions, state } = useContext(context);
  /**
   * Make sure the user is an admin before loading the recaptcha and fetching users
   */
  useEffect(() => {
    if (!state.user.isAdmin) return;
    loadRecaptcha().then(async () => {
      await actions.adminFetchUsers();
      await actions.adminFetchWorkshops();
      await actions.adminFetchPrivateOfficialDatapacks();
    });
    return () => {
      removeRecaptcha();
    };
  }, [state.user.isAdmin]);

  const { showPopup, setShowPopup, handleCancel, handleConfirm } = usePopupBlocker({
    shouldBlock: !!state.admin.datapackConfig.tempRowData,
    onConfirm: async () => {
      await actions.adminUpdateDatapackPriority(state.admin.datapackConfig.rowPriorityUpdates);
      actions.resetAdminConfigTempState();
    },
    onCancel: async () => {
      actions.resetAdminConfigTempState();
    }
  });

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };
  if (!state.user.isAdmin) return <UnauthorizedAccess />;
  const tabs = [
    {
      tabName: "Users",
      component: <AdminUserConfig />
    },
    {
      tabName: "Server Datapacks",
      component: <AdminDatapackConfig setShowPopup={setShowPopup} />
    },
    {
      tabName: "Workshops",
      component: <AdminWorkshop />
    }
  ];
  return (
    <Box className="admin-container">
      <TSCYesNoPopup
        open={showPopup || (state.admin.datapackConfig.tempRowData !== null && tabIndex !== 1)}
        title="Confirm Priority Changes"
        message="Are you sure you want to discard your changes?"
        customNo="Discard"
        customYes="Save"
        onYes={handleConfirm}
        onNo={handleCancel}
        onClose={handleCancel}
      />
      <Typography variant="h4" mb="20px" mt="20px">
        Admin Settings
      </Typography>
      <Box display="flex" flexDirection="row">
        <AdminTabs onChange={handleChange} value={tabIndex} orientation="vertical">
          <AdminTab icon={<PersonOutline />} iconPosition="start" label={tabs[0].tabName} />
          <AdminTab icon={<DataObject />} iconPosition="start" label={tabs[1].tabName} />
          <AdminTab icon={<School />} iconPosition="start" label={tabs[2].tabName} />
        </AdminTabs>
        <Box display="flex" flexDirection="column" flexGrow={1} m="10px">
          <Typography variant="h5">{tabs[tabIndex].tabName}</Typography>
          <Box m="20px">
            <Divider />
          </Box>
          {tabs[tabIndex].component}
        </Box>
      </Box>
    </Box>
  );
});
