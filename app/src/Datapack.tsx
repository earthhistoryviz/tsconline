import { observer } from "mobx-react-lite";
import React from "react";
import { Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles';
export const Datapack = observer(function Datapack() {
    const theme = useTheme()
    return (
        <div style={{display: 'flex',
            justifyContent: 'center',
            alignItems: 'center', 
            width: '100%',
            minHeight: '100vh',
            background: theme.palette.settings.light
        }}>
            <Typography sx={{
            fontSize: theme.typography.pxToRem(18),
            }}>
                Datapack functionality is not supported yet.
            </Typography>
        </div>
    )
})