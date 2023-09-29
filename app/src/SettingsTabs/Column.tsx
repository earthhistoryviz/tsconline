import { observer } from "mobx-react-lite";
import React from "react";
export const Column = observer(function Column() {
    return (
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            This is Column
            </div>
    )
}

)