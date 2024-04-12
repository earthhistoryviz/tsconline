import { observer } from "mobx-react-lite";
import React, { useContext} from "react";
import { context } from "../state";
import {
    Box,
    Typography,
} from "@mui/material";
import "./InfoBox.css"
import {StyledScrollbar} from "../components";

export const InfoBox = observer(() => {
    const { state } = useContext(context);
    const info =
        state.settingsTabs.columnSelected === null
            ? ""
            : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.popup;
    return (
        <div className="container">
            <Typography style={{fontWeight: "bold"}}>Information and References</Typography>
            <Box className="info-box">
                <StyledScrollbar className="scroll-bar">
                    <div dangerouslySetInnerHTML={{__html: info.substring(1, info.length - 1).replace('""', '"')}}/>
                </StyledScrollbar>
            </Box>
        </div>
    );
});
