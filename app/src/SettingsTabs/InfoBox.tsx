import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { context } from "../state";
import {
    Box,
    Typography,
    useTheme
} from "@mui/material";
import "./InfoBox.css"

export const InfoBox = observer(() => {
    const { state } = useContext(context);
    const theme = useTheme();
    const name =
        state.settingsTabs.columnSelected === null
            ? ""
            : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.editName;
    const info =
        state.settingsTabs.columnSelected === null
            ? ""
            : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.name;
    const [open, setOpen] = useState(false);

    return (
        <div>
            <Box className="info-box">
                <Typography>Information and References</Typography>
                <Typography>test test test test test test test test test test test test</Typography>
            </Box>
        </div>
    );
});
