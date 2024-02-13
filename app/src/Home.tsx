import React, {useState} from 'react';
import { useContext } from 'react'
import Color from 'color';
import { observer } from 'mobx-react-lite';
import ForwardIcon from '@mui/icons-material/Forward';
import { useNavigate } from 'react-router-dom';
import { ChartConfig } from '@tsconline/shared';
import { devSafeUrl } from './util';
import { context } from './state';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Drawer, Accordion, AccordionSummary, AccordionDetails, FormControlLabel, Grid, Typography } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import { TSCIcon, TSCCheckbox, TSCButton, TSCCard }  from './components'
import TSCreatorLogo from './assets/TSCreatorLogo.png'

import "./Home.css"
import { setSelectedPreset } from './state/actions';

const HeaderContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
}));

const HeaderIcon = styled(TSCIcon)(({ theme }) => ({
  fontSize: theme.typography.h4.fontSize, 
}));

const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.dark.main,
  fontSize: theme.typography.h2.fontSize, 
}));

const TSCOnlineHeader = () => {
  return (
    <HeaderContainer>
      <TSCIcon src={TSCreatorLogo} alt="Logo" size="80px" marginTop="20px"/>
      <HeaderTitle variant="h2">Time Scale Creator Online</HeaderTitle>
    </HeaderContainer>
  );
};

export const Home = observer(function Home() {
  const { state, actions } = useContext(context); 
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <div className="whole_page" style={{
      background: theme.palette.gradient.main,
    }}>
      <TSCOnlineHeader/>
      {Object.entries(state.presets).map(([type, configArray]) => {
        return (
          <TSCPresetHighlights key={type} navigate={navigate} configArray={configArray} type={type}/>
        )
      })}
      <div className="bottom-button">
        <TSCButton
          className="remove-cache-button"
          style={{
            fontSize: theme.typography.pxToRem(12),
          }}
          onClick={() => {
            actions.removeCache();
            actions.resetState();
          }}>
            Remove Cache
        </TSCButton>
      </div>
      <Drawer anchor="bottom" 
        open={state.showPresetInfo} 
        onClose={() => {
          // actions.setChart(0)
          actions.setShowPresetInfo(false)
        }}>
          {!state.selectedPreset ? <React.Fragment /> : 
          <div className="chart_display" style={{
            background:`${Color(theme.palette.navbar.main).darken(0.5)}`
          }}>
            <div className="holds_picture">
              <img className="chart" src={devSafeUrl(state.selectedPreset.background)} />
            </div>
            <div className="details" style ={{ fontFamily: theme.typography.fontFamily }}>
              <h2 className="preset_name"style={{color: theme.palette.primary.main}}>{state.selectedPreset.title} </h2>
              <p className="description" style={{color: theme.palette.primary.main}}>{state.selectedPreset.description}</p>
                <TSCButton 
                  className="info-button"
                  onClick={() => {
                    actions.generateChart();
                    navigate('/chart');
                  }}
                  variant="contained" 
                  endIcon={<ForwardIcon />}
                >
                  Make your own chart 
                </TSCButton>
                <FormControlLabel 
                className="checkbox"
                  control={
                    <TSCCheckbox 
                    checked={state.useCache}
                    onChange={(e) => {
                      actions.setUseCache(e.target.checked)
                  }}
                  />
                }
                style={{color: theme.palette.primary.main}}
                label="Use Cache" />
            </div>
          </div>
          }
      </Drawer>
    </div>
  );
});

const TSCPresetHighlights = observer(function TSCPresetHighlights({type, navigate, configArray}: {type: string, navigate: Function, configArray: ChartConfig[]}) {
  const { state, actions } = useContext(context);
  const theme = useTheme()
  const [expanded, setExpanded] = useState(true);
  const handleAccordionChange = () => {
    setExpanded(!expanded);
  };
  return (
    <>
    <Accordion 
    style={{
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
        <Typography sx={{ fontSize: "1.5rem"}}>{`${type} PRESETS`}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid className="presets" container style={{
          display: "flex",
          flexWrap: "nowrap",
          overflowX: "auto",
          width: "auto",
          paddingBottom: "9vh",
        }}>
          {configArray.map((preset, index) => (
            <Grid item key={index} style={{ marginRight: '16px', marginLeft: '16px'}}>
            <TSCCard
              color={theme.palette.navbar.main}
              date={preset.date}
              icon={
                devSafeUrl(preset.icon)
              }
              background={devSafeUrl(preset.background)}
              title={
                <>
                  {preset.title}
                  <br />
                </>
              }
              onInfoClick={ async () => {
                // wait to see if we can grab necessary data
                setSelectedPreset(preset)
                const success = await actions.setDatapackConfig(preset.datapacks, preset.settings)
                if (success) {
                  actions.setShowPresetInfo(true)
                }
                //TODO add an error message saying the data is irregular and can't be loaded
              }
            }
              generateChart={async () => {
                setSelectedPreset(preset)
                const success = await actions.setDatapackConfig(preset.datapacks, preset.settings)
                // wait to see if we can grab necessary data
                if (success) {
                  actions.generateChart()
                  navigate('/chart')
                }
                //TODO add an error message saying the data is irregular and can't be loaded
              }}
              
            />
          </Grid> ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
    </>
  );
})
