//const fetch = require('node-fetch');
//var fs = require('fs');
import { useCallback, useContext } from 'react'
import { observer } from 'mobx-react-lite';
import { context } from './index';
import { loadCharts } from './loadCharts'
import { actions } from './index'

import { state, State } from './state';

export async function initialize() {

   //const { state, actions } = useContext(context);

  // put any initialization code here
  console.log('here at initialize');
  await fetch('http://localhost:3000/charts',
              {"method": 'POST'})
    .then(res => res.json()) 
    .then(response =>  {
      console.log(response) 
      let charts = response.charts;
      actions.loadCharts(charts);
      for (let index in charts) {
        console.log(index);
      }
    });
    /*
    .then(response =>  {
      loadCharts(response);
    });
    */
}

  /*
  await axios.post('http://localhost:3000/charts')
    .then(function (response) {
      console.log(response);
  })
  */
