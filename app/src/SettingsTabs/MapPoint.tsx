import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../state";
import { ImageRowComponent } from "../assets"
export const MapPoint = observer(function MapPoint() {
    const { state } = useContext(context);
    return (
        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
            { !state.settingsTabs.mapImages || state.settingsTabs.mapImages.length === 0 ?
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    This is Map Point
                </div>
                :
                <ImageRowComponent maps={state.settingsTabs.maps}/>
        }
        </div>
    )
}

)