import { Box, Divider, Tab, Tabs, Typography, styled } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AdminUserConfig } from "./AdminUserConfig";
import { useContext } from "react";
import { context } from "../state";
import { PersonOutline, DataObject } from "@mui/icons-material";
import { useState } from "react";
import Color from "color";
import "./Admin.css";
import { UnauthorizedAccess } from "./UnauthorizedAccess";
import { AdminDatapackConfig } from "./AdminDatapackConfig";

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
  const { state } = useContext(context);
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };
  if (!state.user.isAdmin) return <UnauthorizedAccess />;
  const tabs = [
    {
      tabName: "User Config",
      component: <AdminUserConfig />
    },
    {
      tabName: "Datapack Config",
      component: <AdminDatapackConfig />
    }
  ];
  return (
    <Box className="admin-container">
      <Typography variant="h4" mb="20px">
        Admin Settings
      </Typography>
      <Box display="flex" flexDirection="row">
        <AdminTabs onChange={handleChange} value={tabIndex} orientation="vertical">
          <AdminTab icon={<PersonOutline />} iconPosition="start" label={tabs[0].tabName} />
          <AdminTab icon={<DataObject />} iconPosition="start" label={tabs[1].tabName} />
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
