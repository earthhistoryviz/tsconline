import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "./state";
import loadingSVG from './assets/loading.svg';
import { useTheme } from '@mui/material/styles'
import './Chart.css';


export const Chart = observer(function () {
  const { state } = useContext(context);
  const theme = useTheme();

  return (
    <div style={{ height: "92vh" }}>
      {state.chartLoading ? 
        <div className="loading-container" style={{
          fontFamily: theme.typography.fontFamily
        }}>
          <img src={loadingSVG} alt="LOADING" className="svg-style"/>
          <div className="loading">  L O A D I N G . . . </div> 
          <div className="loading-sub">  (this could take more than a minute)</div> 
        </div>
        : 
        <object data={state.chartPath} type="application/pdf" width="100%" height="100%"></object>
      }
    </div>
  );
});
