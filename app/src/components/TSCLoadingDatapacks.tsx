import React from "react";
import { Box, Dialog, Typography } from "@mui/material";
import loader from "../assets/icons/loading.json";
import { Lottie } from "../components";
import styles from "../settings_tabs/Datapack.module.css";
import { useTranslation } from "react-i18next";

type TSCLoadingDatapacksProps = {
  open: boolean;
};
export const TSCLoadingDatapacks: React.FC<TSCLoadingDatapacksProps> = ({ open }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} classes={{ paper: styles.dd }}>
      <Box className={styles.loader}>
        <Lottie className={styles.loader} animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
        <Typography variant="h1" className="loading" marginRight={2}>
          {t("loading.loading-datapacks")}
        </Typography>
        <Typography className="loading-sub" marginLeft={2} marginBottom={2}>
          {" "}
          ({t("loading.time")})
        </Typography>
      </Box>
    </Dialog>
  );
};
