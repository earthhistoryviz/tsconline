import { Box } from "@mui/material"
import { Profile } from "./Profile"
import { observer } from "mobx-react-lite"
import { CustomTabs } from "../components/TSCCustomTabs"
import { useContext, useEffect, useState } from "react"
import { context } from "../state"
import "./AccountSettings.css"

export const AccountSettings = observer(() => {
    const [tabValue, setTabValue] = useState(0);
    const { state } = useContext(context)
    const tabs = state.user.isAdmin ? ["Profile", "Admin"] : ["Profile"]
    return (
        <Box className="account-settings-container">
            <CustomTabs
            tabs={tabs.map(tab => ({ id: tab, tab}))}
            tabIndex={tabValue}
            onChange={(index) => setTabValue(index)}
            orientation="vertical-left"
            tabIndicatorLength={20}
            />
            <Profile/>
        </Box>
    )
})