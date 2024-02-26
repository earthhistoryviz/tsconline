import { useTheme } from "@mui/material";
import { Lottie } from "./components";
import loader from "./assets/icons/loading.json";

const LoadingChart = () => {
  const theme = useTheme();
  return (
    <div
      className="loading-container"
      style={{
        fontFamily: theme.typography.fontFamily,
        background: theme.palette.settings.light
      }}>
      <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
      <div>
        <h1 className="loading"> Loading Chart...</h1>
        <p className="loading-sub"> (this could take more than a minute)</p>
      </div>
    </div>
  );
};
export default LoadingChart;
