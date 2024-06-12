import { DatapackParsingPack } from "@tsconline/shared";
import styles from "./TSCDatapackRow.module.css";
import { useState } from "react";
import { devSafeUrl } from "../../util";
import { IconButton, Typography } from "@mui/material";
import { CustomFormControlLabel } from "../TSCComponents";
import { TSCCheckbox } from "../TSCCheckbox";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

type TSCDatapackRowProps = {
  name: string;
  datapack: DatapackParsingPack;
};

export const TSCDatapackRow: React.FC<TSCDatapackRowProps> = ({ name, datapack }) => {
  const [imageUrl, setImageUrl] = useState(devSafeUrl("/datapack-images/" + datapack.image));
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");
  return (
    <div className={styles.rc}>
      <TSCCheckbox className={styles.checkbox} />
      <img className={styles.image} src={imageUrl} alt="datapack" onError={() => setImageUrl(defaultImageUrl)} />
      <div className={styles.middle}>
        <Typography className={styles.header}>{name}</Typography>
        <Typography className={styles.fd}>Dixon, Dougal, et al. · Created 10/10/2024</Typography>
        <Typography className={styles.ci}>50 Columns · 10 Mb · 350 images </Typography>
      </div>
      <div className={styles.right}>
        <div className={styles.vc}>
          <Typography className={styles.views}>100</Typography>
          <span className={styles.eye} />
        </div>
        <IconButton className={styles.iconbutton}>
          <MoreHorizIcon />
        </IconButton>
      </div>
    </div>
  );
};
