import { Box, Typography, styled } from "@mui/material";
import { useTranslation } from "react-i18next";
import LinearProgress from "@mui/material/LinearProgress";

const BorderLinearProgress = styled(LinearProgress)(() => ({
  height: 10,
  borderRadius: 5,
  width: "30%"
}));

type LoadingChartProps = {
  percent: number;
  stage: string;
};
const LoadingChart = ({ percent, stage }: LoadingChartProps) => {
  const { t } = useTranslation();
  return (
    <Box bgcolor="background.main" className="loading-container">
      <Typography variant="h1" className="loading">
        {t("loading.loading-chart")}
      </Typography>
      <Typography className="loading-sub">({t("loading.time")})</Typography>
      <Typography mt={5}>{stage}</Typography>
      <BorderLinearProgress variant="determinate" value={percent} />
    </Box>
  );
};
export default LoadingChart;
