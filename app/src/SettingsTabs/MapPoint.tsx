import { observer } from "mobx-react-lite";
export const MapPoint = observer(function MapPoint() {
    return (
        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    This is Map Point
            </div>
        </div>
    )
}

)