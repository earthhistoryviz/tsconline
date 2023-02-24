//const fetch = require('node-fetch');
//var fs = require('fs');
import { useCallback, useContext } from 'react'
import { observer } from 'mobx-react-lite';
import { context } from '../state';
import {loadCharts} from './loadCharts'


import axios from 'axios';

export async function initialize() {
  // put any initialization code here
  console.log('here at initialize');
  await fetch('http://localhost:3000/charts',
              {"method": 'POST'})
    .then(res => res.json()) 
    .then(response =>  {
      loadCharts(response);
    });
}

  /*
  await axios.post('http://localhost:3000/charts')
    .then(function (response) {
      console.log(response);
  })
  */
