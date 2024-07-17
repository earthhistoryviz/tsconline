import { Box, Tab, Tabs, Typography, styled } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AdminUserConfig } from "./AdminUserConfig";
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { useState } from "react";

const AdminTab = styled(Tab)(({ theme }) => ({
    textTransform: 'none',
}))

export const Admin = observer(function Admin() {
    const [tabIndex, setTabIndex] = useState(0);
    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };
    return (
        <Box ml="50px" mt="50px" display="flex" flexDirection="column">
            <Tabs onChange={handleChange} value={tabIndex}>
                <AdminTab icon={<PersonOutlineIcon />} iconPosition="start" label="User Config" />
                <AdminTab icon={<DataObjectIcon/>} iconPosition="start" label="Datapack Config" />
            </Tabs>
            <AdminUserConfig/>
        </Box>
    );
})