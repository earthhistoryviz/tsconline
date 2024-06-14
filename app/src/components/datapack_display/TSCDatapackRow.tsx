import { DatapackParsingPack } from "@tsconline/shared";
import styles from "./TSCDatapackRow.module.css";
import { useContext, useState } from "react";
import { devSafeUrl } from "../../util";
import { IconButton, Typography } from "@mui/material";
import { TSCCheckbox } from "../TSCCheckbox";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useNavigate } from "react-router";
import { context } from "../../state";
import { throttle } from "lodash";
import { observer } from "mobx-react-lite";

type TSCDatapackRowProps = {
  name: string;
  datapack: DatapackParsingPack;
};

export const TSCDatapackRow: React.FC<TSCDatapackRowProps> = observer(({ name, datapack }) => {
  const { actions, state } = useContext(context);
  const [imageUrl, setImageUrl] = useState(devSafeUrl("/datapack-images/" + datapack.image));
  const navigate = useNavigate();
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");
  return (
    <div className={styles.rc} onClick={() => navigate(`/datapack/${name}`)}>
      <div className={styles.cc} onClick={(e) => e.stopPropagation()}>
        <TSCCheckbox
          className={styles.checkbox}
          onClick={throttle((e) => {
            e.stopPropagation();
            if (state.config.datapacks.includes(name)) {
              actions.setDatapackConfig(
                state.config.datapacks.filter((datapack) => datapack !== name),
                ""
              );
            } else {
              actions.setDatapackConfig([...state.config.datapacks, name], "");
            }
          }, 200)}
        />
      </div>
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
        <IconButton className={styles.iconbutton}>
          <MoreHorizIcon />
        </IconButton>
      </div>
    </div>
  );
});
