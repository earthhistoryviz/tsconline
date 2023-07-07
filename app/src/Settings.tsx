import { useContext } from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ForwardIcon from '@mui/icons-material/Forward';
import { context } from './state';
import { primary_dark } from './constant';

export function Settings() {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      This is the settings page.  You can paste settings here for now until we get the UI done:
      <br/>
      <textarea style={{ minWidth: '800px', height: '300px' }} onChange={evt => actions.settingsXML(evt.target.value)}>
        {state.settingsXML}
      </textarea>
      <br/><br/>
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
  );
}
