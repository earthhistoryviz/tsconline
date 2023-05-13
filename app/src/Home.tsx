import React from 'react';
import { useContext } from 'react'
import { observer } from 'mobx-react-lite';
import { Button } from '@mui/material';
import ForwardIcon from '@mui/icons-material/Forward';
import { useNavigate } from 'react-router-dom';
import { ChartConfig } from '@tsconline/shared';
import { primary_light, primary_dark, secondary } from './constant';
import { devSafeUrl } from './util';
import { context } from './state';

import "./Home.css"

export const Home = observer(function Home() {
  const { state, actions } = useContext(context); 

  const navigate = useNavigate();

  const displayPreset = (p: ChartConfig) => (
    <div className="panel">
      <img style={{ maxWidth: "100%", maxHeight:"100%"}} src={devSafeUrl(p.img)} />
      <h1 className="header1">{p.title}</h1>
      <h2 className="header2">{p.description}</h2>
    </div>
  );

  return (
    <div className="whole_page">
      <div className="top_box" style={{backgroundColor: primary_light}}>
        { !state.chart ? <React.Fragment /> : 
          <div className="chart_display">
            <div className="holds_picture">
              <img className="chart" src={devSafeUrl(state.chart.img)} />
            </div>
            <div className="details">
              <h2 className="preset_name"style={{color: secondary}}>Preset Title: {state.chart.title} </h2>
              <p className="description" style={{color: secondary}}>{state.chart.description}</p>
              <Button 
                sx={{backgroundColor: primary_dark, color: "#FFFFFF"}}
                onClick={() => {
                  actions.setTab(1);
                  actions.setAllTabs(true);
                  actions.generateChart();
                  navigate('/chart');
                }}
                variant="contained" style={{width: "325px", height: "75px", marginLeft: "auto", marginRight: "auto"}} 
                endIcon={<ForwardIcon />}
              >
                Make your own chart 
              </Button>
            </div>
          </div>
        }
      </div>
      <div className="options">
        { state.presets.map((chart, index) => (
          <div key={`chart_${index}`} className="item" onClick={() => {
            actions.setChart(index)
          }}>
            { displayPreset(chart) }
          </div>
        ))}
      </div>
    </div>
  );
});
