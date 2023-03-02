import { useCallback, useContext } from 'react'
import { observer } from 'mobx-react-lite';
import { context } from '../state';

//export default observer(function loadCharts({response: response}: any) { 
export function loadCharts ({response: response}: any) { 
  const { state, actions } = useContext(context);
  let charts = response.charts;
  for (let index in charts) {
    //state.charts[index] = {
    //}
    console.log(charts[index]);
  }
};

