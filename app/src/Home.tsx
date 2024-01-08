import React, {useState} from 'react';
import { useContext } from 'react'
import Color from 'color';
import { observer } from 'mobx-react-lite';
import ForwardIcon from '@mui/icons-material/Forward';
import { useNavigate } from 'react-router-dom';
import { ChartConfig } from '@tsconline/shared';
import { primary_light, primary_dark, secondary } from './constant';
import { devSafeUrl } from './util';
import { context } from './state';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionSummary, AccordionDetails, Box, Button, List, ListItem,FormGroup, FormControlLabel, Checkbox, FormControl, CardActions, Card, Grid, Container, CardContent, Typography, CardMedia } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import { TSCCheckbox, TSCButton, TSCCardList }  from './components'

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
            height: "7vh",
            width: "16vh", 
            marginLeft: "auto", 
            marginRight: "auto",
            borderRadius: "40px",
            fontSize: theme.typography.pxToRem(12),
          }} 
          onClick={() => {
            actions.removeCache();
            actions.resetState();
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
  const [expanded, setExpanded] = useState(true);
  const handleAccordionChange = () => {
    setExpanded(!expanded);
  };
  return (
    <Accordion style={{
      background: 'transparent',
      marginLeft: '5vh',
      marginRight: '5vh',
      border: '1px solid gray',
      borderRadius: '4px',
      overflow: 'hidden',
    }}
    onChange={handleAccordionChange}
    expanded={expanded}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel1a-content"
        id="panel1a-header"
        style={{
          borderBottom: '1px solid rgba(0, 0, 0, 0.20)',
          backgroundColor: 'rgba(0, 0, 0, 0.04)', 
        }}
      >
        <Typography sx={{ fontSize: "1.5rem"}}>BASIC PRESETS</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid className="presets" container style={{
          display: "flex",
          flexWrap: "nowrap",
          overflowX: "auto",
          width: "auto",
          paddingBottom: "9vh",
        }}>
          {state.presets.map((preset, index) => (
            <Grid item key={index} style={{ marginRight: '16px', marginLeft: '16px'}}>
            <TSCCardList
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
      </AccordionDetails>
    </Accordion>
  );
})
