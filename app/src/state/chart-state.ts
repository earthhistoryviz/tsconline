import { observable } from "mobx";

export type ChartState = {
  backgroundColor: string;
  width: number;
  height: number;
  header: {
    logoHeight: number;
    logoWidth: number;
    paddingX: number;
    paddingY: number;
    fontSize: number;
  };
};
export const chartState = observable<ChartState>({
  backgroundColor: "white",
  width: 1000,
  height: 800,
  header: {
    logoHeight: 50,
    logoWidth: 50,
    paddingX: 20,
    paddingY: 20,
    fontSize: 20
  }
});
