import { Box, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { CustomTabs } from "../components/TSCCustomTabs";
import { AdminUserConfig } from "./AdminUserConfig";
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

export const Admin = observer(function Admin() {
    return (
        <Box ml="50px" mt="50px" display="flex" flexDirection="column">
            <AdminUserConfig/>
        </Box>
    );
})