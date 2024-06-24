import { Box, Typography, useTheme } from "@mui/material";
import { Lottie } from "./components";
import loader from "./assets/icons/loading.json";

const LoadingChart = () => {
  const theme = useTheme();
  return (
    <Box bgcolor="background.main" className="loading-container">
      <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
      <div>
        <Typography variant="h1" className="loading">
          {" "}
          Loading Chart...
        </Typography>
        <Typography className="loading-sub"> (this could take more than a minute)</Typography>
      </div>
    </Box>
  );
};
export default LoadingChart;
