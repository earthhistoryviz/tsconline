import { Box, Typography, styled } from "@mui/material";
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
  return (
    <Box bgcolor="background.main" className="loading-container">
      <Typography mt={5}>{stage}</Typography>
      <BorderLinearProgress variant="determinate" value={percent} />
    </Box>
  );
};
export default LoadingChart;
