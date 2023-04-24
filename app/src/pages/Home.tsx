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
import { useNavigate } from 'react-router-dom';


export const Home = observer(function () {
    const { state, actions } = useContext(context); 

    const handleClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const navigate = useNavigate();

    return (

        <div className="whole_page">
         <div className="top_box" style={{backgroundColor: primary_light}}>
            <div className="chart_display">
                <div className="holds_picture">
                    <img className="chart" src={state.chart.imageSrc}></img>
                </div>
                <div className="details">
                    <h2 className="preset_name"style={{color: secondary}}>Preset Title: chart number is {state.chart.chartNumber} </h2>
                    <p className="description" style={{color: secondary}}>{state.chart.dataPackDescription}</p>
                    <Button 
                        sx={{backgroundColor: primary_dark, color: "#FFFFFF"}}
                        onClick={() => {
                        actions.setTab(1);
                        actions.setAllTabs(true);
                        navigate('/chart');

                    }}
                    variant="contained" style={{width: "325px", height: "75px", marginLeft: "auto", marginRight: "auto"}} 
                    endIcon={<ForwardIcon />}
                    >
                    Make your own chart 
                    </Button>

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
