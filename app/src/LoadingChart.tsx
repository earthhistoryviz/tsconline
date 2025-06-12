import { Box, Typography, styled } from "@mui/material";
import { Lottie } from "./components";
import loader from "./assets/icons/loading.json";
import { useTranslation } from "react-i18next";
import LinearProgress from "@mui/material/LinearProgress";

const BorderLinearProgress = styled(LinearProgress)(() => ({
  height: 10,
  borderRadius: 5
}));

type LoadingChartProps = {
  percent: number;
  stage: string;
};
const LoadingChart = ({ percent, stage }: LoadingChartProps) => {
  const { t } = useTranslation();
  return (
    <Box bgcolor="background.main" className="loading-container">
      <div>
        <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center">
          <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
          <div>
            <Typography variant="h1" className="loading">
              {" "}
              {t("loading.loading-chart")}
            </Typography>
            <Typography className="loading-sub"> ( {t("loading.time")})</Typography>
          </div>
        </Box>
        <Typography>{stage}</Typography>
        <BorderLinearProgress variant="determinate" value={percent} />
      </div>
    </Box>
  );
};
export default LoadingChart;
