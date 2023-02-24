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

        <div style={{position: "sticky", width: "100%", height: "88vh"}}>
         <div style={{position: "sticky", width: "100%", height: "43vh", outline: "4px solid blue"}}>
            <div className="chart_display">
                <div className="holds_picture" style={{width: "35%", height: "38vh"}}>
                    <img style={{width: "100%", height: "100%", minWidth: "100%", maxHeight: "100%", marginTop: "3%"}} src={state.chart.imageSrc}></img>
                </div>
                <div className="details" style={{width: "100%", height: "30hv"}}>
                    <h2 style={{ marginLeft: "10%", marginRight: "5%" }}>Preset Title: chart number is {state.chart.chartNumber} </h2>
                    <p className="description" style={{ marginLeft: "10%", marginRight: "5%" }}>{state.chart.dataPackDescription} </p>
                    <Link className="button_link" to="/chart" style={{position: "relative", width: "40%", height: "50%",  top: "2%", left: "30%"}}>
                    <Button 
                        onClick={() => {
                        actions.setTab(1);
                        actions.setAllTabs(true);

                    }}
                    variant="contained" style={{width: "100%", height: "100%"}} 
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
        </div>
    )
});
