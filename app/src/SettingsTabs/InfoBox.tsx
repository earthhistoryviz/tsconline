import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { context } from "../state";
import {
    Box,
    Typography,
    useTheme
} from "@mui/material";
import "./InfoBox.css"
import {StyledScrollbar} from "../components";

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
            : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.popup;

    return (
        <div className="container">
            <Typography>Information and References</Typography>
            <Box className="info-box">
                <StyledScrollbar className="scroll-bar">
                    <Typography>{info}</Typography>
                </StyledScrollbar>
            </Box>
        </div>
    );
});
