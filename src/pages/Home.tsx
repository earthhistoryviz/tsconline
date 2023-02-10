import { useCallback, useContext } from 'react'
import { observer } from 'mobx-react-lite';
import { context } from '../state';
import React from "react";
import ChartInfo from "../components/ChartInfo"
import { ChartBlock } from "../components/ChartInfo";
import imgSrc from '../assets/AfricaBight_Nigeria_Image.jpg'
import "./Home.css"
import {Chart} from './Chart';


export const Home = observer(function () {
    const { state, actions } = useContext(context); 

    const handleClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    return (

      <div className="panel">
         <div style={{position: "relative", width: "1350px", height: "300px", outline: "4px solid blue"}}>
            <div className="chart_display">
                <img style={{width: "450px", height: "300px"}} src={imgSrc}></img>
                <div className="details" >
                    <h2 style={{ marginLeft: 100, marginRight: 50 }}>Preset Title: chart number is {state.chart.chartNumber} </h2>
                    <p className="description" style={{ marginLeft: 100, marginRight: 50 }}>description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart </p>
                    <img style={{marginLeft: 220, width: "450px", height: "100px"}} src={imgSrc}></img>
                </div>
            </div>
            <div className="options">
              {state.charts.map((chart, index) => (
                <div key={`chart_${index}`} className="item" onClick={() => {
                  actions.setChart(chart.chartNumber)
                }}>
                  <ChartInfo {...chart} />
                </div>
              ))}
            </div>
          </div>
        </div>
    )
});
