import { observer } from "mobx-react-lite";
import { useNavigate, useParams } from "react-router";
import styles from "./DatapackProfile.module.css"
import { useContext, useState } from "react";
import { context } from "./state";
import { devSafeUrl } from "./util";
import { IconButton, Typography } from "@mui/material";
import { CustomDivider } from "./components";
import { CustomTabs } from "./components/TSCCustomTabs";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export const DatapackProfile = observer(() => {
const { state } = useContext(context)
  const { id } = useParams();
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");
  const navigate = useNavigate();
  if (!id) return;
  const datapack = state.datapackIndex[id]
  if (!datapack) return;
  return (
    <div className={styles.container}>
        <div className={styles.header}>
            <IconButton className={styles.back} onClick={() => navigate("/settings")}>
                <ArrowBackIcon/>
            </IconButton>
            <img className={styles.di} src={datapack.image || defaultImageUrl}/>
            <Typography className={styles.ht}>{id}</Typography>
        </div>
        <CustomTabs className={styles.tabs} centered tabs={["About", "Discussion", "Data"]}/>
        <CustomDivider className={styles.divider}/>
    </div>
  )
});
