import { useCallback, useContext } from 'react'
import { observer } from 'mobx-react-lite';
import { context } from '../state';
import React from "react";
import ChartInfo from "../components/ChartInfo"
import { ChartBlock } from "../components/ChartInfo";
import imgSrc from '../assets/AfricaBight_Nigeria_Image.jpg'
import "./Home.css"
import {Chart} from './Chart';


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

    const handleClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    }
                //{ chartToDisplay = charts.at(state.chart)!  
    let chartToDisplay: ChartBlock = charts.at(state.chart)!;
            //
    return (

            <div className="panel">
         <div style={{position: "relative", width: "1350px", height: "300px", outline: "4px solid blue"}}>
            <div className="chart_display">
                <img style={{width: "450px", height: "300px"}} src={charts.at(state.chart).imageSrc}></img>
                <div className="details" >
                    <h2 style={{ marginLeft: 100, marginRight: 50 }}>Preset Title</h2>
                    <p className="description" style={{ marginLeft: 100, marginRight: 50 }}>description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart </p>
                    <img style={{marginLeft: 220, width: "450px", height: "100px"}} src={imgSrc}></img>
                </div>
            </div>
        <div className="options">
            {...charts.map((chart) => (
                <div className="item" onClick={() => {
                actions.setChart(chart.chartNumber)
                

                }}>
                    <ChartInfo{...chart} />
                </div>
            ))}
        </div>
        </div>
        </div>
    )
}
