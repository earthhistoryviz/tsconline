import { useContext } from 'react'
import { observer } from 'mobx-react-lite';
import { context } from '../state';
import React from "react";
import ChartInfo from "../components/ChartInfo"
import { ChartBlock } from "../components/ChartInfo";
import imgSrc from '../assets/AfricaBight_Nigeria_Image.jpg'
import "./Home.css"


export function Home() {
    const { state, actions } = useContext(context); 
    const charts: Array<ChartBlock> = [];

    for (let i = 0; i < 10; i++) {
        let chart: ChartBlock = {
            imageSrc: imgSrc,
            dataPackTitle: 'AfricaBight_Nigeria_Image Maps ' + i,
            dataPackDescription: 'data pack number ' + i,
            chartNumber: i,
        };

        charts.push(chart)


    }
    //charts.at(state.chart);
            //
    return (
        <div className="panel">
            <div style={{position: "relative", width: "1350px", height: "300px", outline: "4px solid blue"}}>
                This is the home page
             </div>
            <div className="options">
                {...charts.map((chart) => (
                    <div className="item" onClick={() => actions.setChart(chart.chartNumber)}>
                        <ChartInfo{...chart} />
                    </div>
                ))}
            </div>
        </div>
    )
}
