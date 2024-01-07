import React from 'react';
import { useContext } from 'react'
import Color from 'color';
import { observer } from 'mobx-react-lite';
import ForwardIcon from '@mui/icons-material/Forward';
import { useNavigate } from 'react-router-dom';
import { ChartConfig } from '@tsconline/shared';
import { primary_light, primary_dark, secondary } from './constant';
import { devSafeUrl } from './util';
import { context } from './state';
import { Box, Button, List, ListItem,FormGroup, FormControlLabel, Checkbox, FormControl, CardActions, Card, Grid, Container, CardContent, Typography, CardMedia } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import { TSCCheckbox, TSCButton }  from './assets'
import { CustomCard }  from './PresetListComponent' 

import "./Home.css"

export const Home = observer(function Home() {
  const { state, actions } = useContext(context); 
  const theme = useTheme();



  const navigate = useNavigate();

  return (
    <div className="whole_page" style={{
      background: theme.palette.gradient.main,
    }}>
      <div className="top_box" style={{
        }}>
        { !state.chart ? <React.Fragment /> : 
          <div className="chart_display">
            <div className="holds_picture">
              <img className="chart" src={devSafeUrl(state.chart.img)} />
            </div>
            <div className="details" style ={{ fontFamily: theme.typography.fontFamily }}>
              <h2 className="preset_name"style={{color: secondary}}>{state.chart.title} </h2>
              <p className="description" style={{color: secondary}}>{state.chart.description}</p>
                <TSCButton 
                  onClick={() => {
                    actions.setTab(1);
                    actions.setAllTabs(true);
                    actions.generateChart();
                    navigate('/chart');
                  }}
                  variant="contained" 
                  style={{
                    width: "325px", 
                    height: "75px", 
                    marginLeft: "auto", 
                    marginRight: "auto"}} 
                  endIcon={<ForwardIcon />}
                >
                  Make your own chart 
                </TSCButton>
                <FormControlLabel control={
                <TSCCheckbox 
                checked={state.useCache}
                onChange={(e) => {
                  actions.setUseCache(e.target.checked)
                }}
                />} label="Use Cache" />
            </div>
          </div>
        }
      </div>
      <TSCPresetHighlights/>
      <div className="bottom_button">
        <TSCButton
          variant="contained" style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "10vh",
            width: "30vh", 
            marginLeft: "auto", 
            marginRight: "auto",
          }} 
          onClick={() => {
            actions.removeCache();
          }}>
            Remove Cache
        </TSCButton>
      </div>
    </div>
  );
});

const TSCPresetHighlights = observer(function TSCPresetHighlights() {
  const { state, actions } = useContext(context);
  const theme = useTheme()
  return (
    <Grid className="presets" container spacing={4} style={{
      background: "#00" 
    }}>
      {state.presets.map((preset, index) => (
        <Grid item key={index}>
        <CustomCard
          color={theme.palette.navbar.main}
          date={"02.04.2020"}
          img={
            devSafeUrl(preset.img)
          }
          logo={devSafeUrl(preset.img)}
          title={
            <>
              {preset.title}
              <br />
            </>
          }
          onClick={ () => {
            actions.setChart(index)
          }
          }
        />
      </Grid> ))}
    </Grid>
  );
})
