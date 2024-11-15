import { Box, Typography } from "@mui/material";
import { Lottie } from "./components";
import loader from "./assets/icons/loading.json";
import { useTranslation } from "react-i18next";

const LoadingChart = () => {
  const { t } = useTranslation();
  return (
    <Box bgcolor="background.main" className="loading-container">
      <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
      <div>
        <Typography variant="h1" className="loading">
          {" "}
          {t("loading.loading-chart")}
        </Typography>
        <Typography className="loading-sub"> ( {t("loading.time")})</Typography>
      </div>
    </Box>
  );
};
export default LoadingChart;
