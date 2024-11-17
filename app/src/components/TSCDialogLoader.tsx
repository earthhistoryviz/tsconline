import React from "react";
import { Box, Dialog, Typography } from "@mui/material";
import loader from "../assets/icons/loading.json";
import { Lottie } from ".";
import styles from "./TSCDialogLoader.module.css";

type TSCLoaderProps = {
  open: boolean;
  headerText?: string;
  subHeaderText?: string;
  transparentBackground?: boolean;
};
export const TSCDialogLoader: React.FC<TSCLoaderProps> = ({
  transparentBackground,
  open,
  headerText,
  subHeaderText
}) => {
  const backgroundStyle = {
    style: {
      backgroundColor: "transparent",
      boxShadow: "none",
      backgroundImage: "none"
    }
  };
  return (
    <Dialog open={open} PaperProps={transparentBackground ? backgroundStyle : {}} classes={{ paper: styles.dd }}>
      <Box className={styles.loader}>
        <Lottie className={styles.loader} animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
        {headerText && (
          <Typography variant="h1" className={styles.loading} marginRight={2}>
            {headerText}
          </Typography>
        )}
        {subHeaderText && <Typography className={styles.loadingSub}>({subHeaderText})</Typography>}
      </Box>
    </Dialog>
  );
};
