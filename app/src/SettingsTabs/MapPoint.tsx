import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../state";
import { MapRowComponent } from "../MapPointAssets"
import { Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export const MapPoint = observer(function MapPoint() {
    const { state } = useContext(context);
    const theme = useTheme();
    return (
        <div>
            { !state.settingsTabs.maps || Object.entries(state.settingsTabs.maps).length === 0 ?
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: '80vh'}}>
                    <Typography sx={{
                    fontSize: theme.typography.pxToRem(18),
                    }}>
                        No Map Points available for this datapack
                    </Typography>
                </div>
                :
                <MapRowComponent maps={state.settingsTabs.maps}/>
        }
        </div>
    )
}

)