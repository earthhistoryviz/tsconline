import React from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from "@mui/material";
import { TSCButton } from "./TSCButton";
import loader from "../assets/icons/loading.json";
import { Lottie } from "../components";
import styles from "../settings_tabs/Datapack.module.css";

type TSCLoadingDatapacksProps = {
    open: boolean;

};
export const TSCLoadingDatapacks: React.FC<TSCLoadingDatapacksProps> = ({ open }) => {

    return (<Dialog
        open={open}
        classes={{ paper: styles.dd }}
    >
        <Box className={styles.loader}>
            <Lottie className={styles.loader} animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
            <Typography variant="h1" className="loading" marginRight={2}>
                Loading Datapacks...
            </Typography>
            <Typography className="loading-sub" marginLeft={2} marginBottom={2}> (this could take more than a minute)</Typography>

        </Box>

    </Dialog>
    )
};




