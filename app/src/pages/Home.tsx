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
import { primary_light, primary_dark, secondary } from '../constant';


export const Home = observer(function () {
    const { state, actions } = useContext(context); 

    const handleClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    return (

        <div style={{position: "sticky", width: "100%", height: "88vh"}}>
         <div className="top_box">
            <div className="chart_display">
                <div className="holds_picture">
                    <img style={{width: "100%", height: "100%"}} src={state.chart.imageSrc}></img>
                </div>
                <div className="details" style={{width: "100%", height: "30hv", flexWrap: "wrap"}}>
                    <h2 style={{color: secondary, marginLeft: "10%", marginRight: "5%", padding:"2%" }}>Preset Title: chart number is {state.chart.chartNumber} </h2>
                    <p className="description" style={{color: secondary, marginLeft: "10%", marginRight: "5%", padding:"2%" }}>{state.chart.dataPackDescription}</p>
                    <Link className="button_link" to="/chart">
                    <Button 
                        sx={{backgroundColor: primary_dark, color: "#FFFFFF"}}
                        onClick={() => {
                        actions.setTab(1);
                        actions.setAllTabs(true);

                    }}
                    variant="contained" style={{width: "325px", height: "75px", marginLeft: "auto", marginRight: "auto"}} 
                    endIcon={<ForwardIcon />}
                    >
                    Make your own chart 
                    </Button>
                    </Link>

                </div>
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
