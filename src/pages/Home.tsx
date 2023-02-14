import { useCallback, useContext } from 'react'
import { observer } from 'mobx-react-lite';
import { context } from '../state';
import React from "react";
import ChartInfo from "../components/ChartInfo"
import { ChartBlock } from "../components/ChartInfo";
import imgSrc from '../assets/AfricaBight_Nigeria_Image.jpg'
import "./Home.css"
import { Chart } from './Chart';
import { Button } from '@mui/material';
import ForwardIcon from '@mui/icons-material/Forward';
import { Link } from "react-router-dom";


export const Home = observer(function () {
    const { state, actions } = useContext(context); 

    const handleClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    return (

         <div style={{position: "sticky", width: "1350px", height: "300px", outline: "4px solid blue"}}>
            <div className="chart_display">
                <div className="holds_picture" style={{width: "450px", height: "250px"}}>
                    <img style={{minWidth: "100%", maxHeight: "100%"}} src={state.chart.imageSrc}></img>
                </div>
                <div className="details" >
                    <h2 style={{ marginLeft: 100, marginRight: 50 }}>Preset Title: chart number is {state.chart.chartNumber} </h2>
                    <p className="description" style={{ marginLeft: 100, marginRight: 50 }}>description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart description of the chart </p>
                    <Link className="button_link" to="/chart" style={{marginLeft: 220, width: "450px", height: "100px"}}>
                    <Button 
                        onClick={() => {
                        actions.setTab(1);
                        actions.setAllTabs(true);

                    }}
                    variant="contained" style={{width: "450px", height: "100px"}} 
                    endIcon={<ForwardIcon />}
                    >
                    Make your own chart 
                    </Button>
                    </Link>

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
    )
});
