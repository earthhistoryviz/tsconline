import { observer } from "mobx-react-lite";
import { Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles';
import React from "react";
export const Font = observer(function Font() {
    const theme = useTheme()
    return (
        <div style={{display: 'flex',
            justifyContent: 'center',
            alignItems: 'center', 
            width: '100%',
            minHeight: '80vh'
        }}>
            <Typography sx={{
            fontSize: theme.typography.pxToRem(18),
            }}>
                Font Settings are currently not supported
            </Typography>
        </div>
    )
}

)