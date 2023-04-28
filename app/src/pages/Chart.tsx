import React from "react";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../state";
import pdf from '../assets/example_chart.pdf'
import axios from "axios"


export const Chart = observer(function () {
    const { state, actions } = useContext(context);

    return (
        <div style={{height:"92vh"}}>
            <object data={"http://localhost:3000" + state.chartPath} type="application/pdf" width="100%" height="100%"></object>
        </div>
    )
});
