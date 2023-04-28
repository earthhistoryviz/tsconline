import imgSrc1 from '../assets/AfricaBight_Nigeria_Image.jpg'
import imgSrc2 from '../assets/Past_10_yr_image.jpg'
import { action, runInAction } from 'mobx';
import axios from "axios";
import { state, State } from './state';

export const setTab = action('setTab', (newval: number) => {
  state.tab = newval;
});

export const setChart= action('setChart', (newval: number) => {
  state.chart = state.charts[newval]!;
});

export const setAllTabs = action('setAllTabs', (newval: boolean) => {
    state.showAllTabs = newval;
})

export const generateChart = action('generateChart', async () => {
  await axios
      .post(
        "http://localhost:3000/getchart",
      {
        title: "Past_10_yr_image"
      })
      .then((response: any) => {
        runInAction(() => state.chartPath = response.data.url);
        console.log(state.chartPath);
      })
      .catch((error: any) => {
      })
})


export const loadCharts = action('loadCharts', (charts: any) => {
  //newval = newval.json();
  let index: any = 0;
  for (index in charts) {
    //state.charts[index] = {
    //}
    console.log(charts[index]);
    state.charts[index] = ({
      imageSrc: charts[index].imgSrc,
      dataPackTitle: charts[index].dataPackTitle,
      dataPackDescription: charts[index].dataPackDescription,
      chartNumber: charts[index].chartNumber
    })
    console.log('actions did this');
  }
  state.chart = state.charts[0];
  console.log(state.charts[0].chartNumber + ' this is the charts');

});
