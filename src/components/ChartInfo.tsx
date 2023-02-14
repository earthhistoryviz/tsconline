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
            { (chart.imageSrc === ('../assets/AfricaBright_Nigeria_Image.jpg')) ?
                <img style={{maxWidth: "100%", maxHeight:"100%"}} src={chart.imageSrc} />
                :
                <img style={{maxWidth: "100%", maxHeight:"100%"}} src={chart.imageSrc} />

            }
            <h1 className="header1">{chart.dataPackTitle}</h1>
            <h2 className="header2">{chart.dataPackDescription}</h2>
        </div>

        )
});
