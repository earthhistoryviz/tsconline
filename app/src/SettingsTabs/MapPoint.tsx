import { observer } from "mobx-react-lite";
import React from "react";
import { mapStore } from "../map/MapStore";
export const MapPoint = observer(function MapPoint() {
    const mapElementId = "map"; 
    mapStore.initializeMap(mapElementId);
    return (
        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
            <div id={mapElementId} style={{ height: '100%', width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    This is Map Point
            </div>
        </div>
    )
}

)