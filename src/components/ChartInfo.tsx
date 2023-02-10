import * as React from "react"
import {observer} from "mobx-react-lite";
import imgSrc from '../assets/AfricaBight_Nigeria_Image.jpg'
import "./chartinfo.css"

export interface ChartBlock {
    imageSrc: string,
    dataPackTitle: string,
    dataPackDescription: string,
    chartNumber: number,
};
export default observer(function ChartInfo(chart: ChartBlock) {
        return (
        <div className="panel">
            <img style={{width: "375px", height: "250px"}} src={imgSrc} />
            <h1 className="header1">{chart.dataPackTitle}</h1>
            <h2 className="header2">{chart.dataPackDescription}</h2>
        </div>

        )
});
