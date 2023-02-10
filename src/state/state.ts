import { observable } from 'mobx';

export type Chart = {
  imageSrc: string,
  dataPackTitle: string,
  dataPackDescription: string,
  chartNumber: number,
};

export type State = {
  tab: number,
  chart: Chart,
  charts: Chart[],
};

const charts = [];
for (let i = 0; i < 10; i++) {
  charts.push({
    imageSrc: `charts/chart_${i}/image.jpg`,
    dataPackTitle: 'AfricaBight_Nigeria_Image Maps ' + i,
    dataPackDescription: 'data pack number ' + i,
    chartNumber: i,
  });
}
export const state = observable<State>({
  tab: 0,
  chart: charts[0]!,
  charts,
});
