import { Lottie } from "../components";
import LockLottie from "../assets/icons/smartphone-lock.json";
import { Box, Typography } from "@mui/material";
import styles from "./UnauthorizedAccess.module.css";

export const UnauthorizedAccess = () => {
  return (
    <Box className={styles.container}>
      <Lottie animationData={LockLottie} width={100} height={100} autoplay loop />
      <Box>
        <Typography variant="h5">Unauthorized Access</Typography>
        <Typography variant="body1">You do not have permission to access this page.</Typography>
        <Typography variant="body2">Please contact your administrator.</Typography>
      </Box>
    </Box>
  );
};
