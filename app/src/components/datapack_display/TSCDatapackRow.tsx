import { DatapackParsingPack } from "@tsconline/shared";
import styles from "./TSCDatapackRow.module.css";
import { useState } from "react";
import { devSafeUrl } from "../../util";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useNavigate } from "react-router";
import { DatapackMenu } from "../../settings_tabs/Datapack";
import "./SharedDatapackDisplay.css";
import { CheckIcon, Loader } from "../TSCComponents";
import Color from "color";

type TSCDatapackRowProps = {
  name: string;
  datapack: DatapackParsingPack;
  value: boolean;
  onChange: (name: string) => Promise<void>;
};

export const TSCDatapackRow: React.FC<TSCDatapackRowProps> = ({ name, datapack, value, onChange }) => {
  const [imageUrl, setImageUrl] = useState(devSafeUrl("/datapack-images/" + datapack.image));
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");
  return (
    <Box className={styles.rc} 
    borderBottom="2px solid"
    borderColor="divider"
    onClick={() => navigate(`/datapack/${encodeURIComponent(name)}`)}>
      <Box
        className={`${styles.cc} ${loading ? styles.loading : ""} ${value ? styles.checked : ""}`}
        borderRight="1px solid"
        borderLeft="1px solid"
        borderColor="divider"
        bgcolor={value ? Color(theme.palette.button.light).alpha(0.2).string() : "secondaryBackground.light"}
        onClick={async (e) => {
          e.stopPropagation();
          setLoading(true);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await onChange(name);
          setLoading(false);
        }}>
        {loading ? <Loader /> : value ? <CheckIcon /> : <span className="add-circle" />}
      </Box>
      <img className={styles.image} src={imageUrl} alt="datapack" onError={() => setImageUrl(defaultImageUrl)} />
      <div className={styles.middle}>
        <Typography className={styles.header}>{name}</Typography>
        <Typography className={styles.fd}>Dixon, Dougal, et al. · Created 10/10/2024</Typography>
        <Typography className={styles.ci}>50 Columns · 10 Mb · 350 images </Typography>
      </div>
      <div
        className={styles.right}
        onClick={(e) => {
          e.stopPropagation();
        }}>
        <div className={styles.vc}>
          <Typography className={styles.views}>100</Typography>
          <span className={styles.eye} />
        </div>
        <DatapackMenu
          name={name}
          button={
            <IconButton className={styles.iconbutton}>
              <MoreHorizIcon />
            </IconButton>
          }
        />
      </div>
    </Box>
  );
};
