import React from 'react';
import { useContext } from 'react'
import { observer } from 'mobx-react-lite';
import ForwardIcon from '@mui/icons-material/Forward';
import { useNavigate } from 'react-router-dom';
import { ChartConfig } from '@tsconline/shared';
import { primary_light, primary_dark, secondary } from './constant';
import { devSafeUrl } from './util';
import { context } from './state';
import { Box, Button, List, ListItem,FormGroup, FormControlLabel, Checkbox, FormControl, CardActions, Card, Grid, Container, CardContent, Typography, CardMedia } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { TSCCheckbox }  from './assets'

import "./Home.css"

export const Home = observer(function Home() {
  const { state, actions } = useContext(context); 
  const theme = useTheme();

  const navigate = useNavigate();

  return (
    <div className="whole_page">
      <div className="top_box" style={{backgroundColor: theme.palette.altbackground.main}}>
        { !state.chart ? <React.Fragment /> : 
          <div className="chart_display">
            <div className="holds_picture">
              <img className="chart" src={devSafeUrl(state.chart.img)} />
            </div>
            <div className="details">
              <h2 className="preset_name"style={{color: secondary}}>{state.chart.title} </h2>
              <p className="description" style={{color: secondary}}>{state.chart.description}</p>
                <Button 
                  sx={{backgroundColor: theme.palette.button.main, color: "#FFFFFF"}}
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
      <Container sx={{ py: 8 }} maxWidth="md">
          {/* End hero unit */}
          <Grid container spacing={4}>
            {state.presets.map((preset, index) => (
              <Grid item key={index} xs={12} sm={6} md={4}>
                <Card
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  <CardMedia
                    component="div"
                    sx={{
                      // 16:9
                      pt: '56.25%',
                    }}
                    image={devSafeUrl(preset.img)}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h5" component="h2">
                     {preset.title} 
                    </Typography>
                    <Typography>
                      {preset.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small">View</Button>
                    <Button size="small">Edit</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      <div className="bottom_button" >
        <Button
          sx={{backgroundColor: theme.palette.button.main, color: "#FFFFFF"}}
          variant="contained" style={{width: "325px", height: "75px", marginLeft: "auto", marginRight: "auto"}} 
          onClick={() => {
            actions.removeCache();
          }}>
            Remove Cache
        </Button>
      </div>
    </div>
  );
});
