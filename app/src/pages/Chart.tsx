import React from "react";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../state";


export const Chart = observer(function () {
    const { state, actions } = useContext(context);
    return (
        <div>
            This is where the chart will show
        </div>
    )
});
