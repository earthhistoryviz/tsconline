import { observable } from 'mobx';
import imgSrc1 from '../assets/AfricaBight_Nigeria_Image.jpg'
import imgSrc2 from '../assets/Past_10_yr_image.jpg'

export type Chart = {
  imageSrc: string,
  dataPackTitle: string,
  dataPackDescription: string,
  chartNumber: number,
};

export type State = {
  tab: number,
  showAllTabs: boolean,
  chart: Chart,
  charts: Chart[],
};

const charts = [];

for (let i = 0; i < 3; i++) {
  charts.push({
    imageSrc: "",
    dataPackTitle: "",
    dataPackDescription: "",
    chartNumber: -1 
  })
}
/*
for (let i = 0; i < 10; i++) {
  if (i % 2 == 0) {
      charts.push({
        imageSrc: imgSrc1,
        dataPackTitle: 'AfricaBight_Nigeria_Image Maps ' + i,
        dataPackDescription: 'data pack number ' + i,
        chartNumber: i,
      });
  }
  else {
      charts.push({
        imageSrc: imgSrc1,
        dataPackTitle: 'AfricaBight_Nigeria_Image Maps ' + i,
        dataPackDescription: 'data pack number ' + i,
        chartNumber: i,
      });
  }
}
*/
export const state = observable<State>({
  tab: 0,
  showAllTabs: false,
  chart: charts[0]!,
  charts,
});
