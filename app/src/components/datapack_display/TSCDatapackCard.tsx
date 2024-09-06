import { Card, CardActions, CardContent, CardMedia, IconButton, Typography } from "@mui/material";
import { Datapack, DatapackConfigForChartRequest } from "@tsconline/shared";
import { devSafeUrl } from "../../util";
import { useState } from "react";
import styles from "./TSCDatapackCard.module.css";
import { CheckIcon, CustomFormControlLabel, Loader } from "../TSCComponents";
import { useNavigate } from "react-router";
import { DatapackMenu } from "../../settings_tabs/Datapack";

type TSCDatapackCardProps = {
  name: string;
  datapack: Datapack;
  value: boolean;
  onChange: (datapack: DatapackConfigForChartRequest) => void;
};
export const TSCDatapackCard: React.FC<TSCDatapackCardProps> = ({ name, datapack, value, onChange }) => {
  const [imageUrl, setImageUrl] = useState(devSafeUrl("/datapack-images/" + datapack.image));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");

  return (
    <Card
      className={styles.card}
      sx={{ outline: "1px solid", outlineColor: "divider", bgcolor: "secondaryBackground.main" }}
      onClick={() => navigate(`/datapack/${encodeURIComponent(name)}?index=${datapack.type}`)}>
      <CardMedia component="img" height="140" image={imageUrl} onError={() => setImageUrl(defaultImageUrl)} />
      <CardContent className={styles.cc}>
        <div className={styles.hc}>
          <Typography className={styles.header}>{datapack.title}</Typography>
          <DatapackMenu
            datapack={datapack}
            button={
              <IconButton className={styles.other} onClick={(e) => e.stopPropagation()}>
                <span className={styles.more} />
              </IconButton>
            }
          />
        </div>
        <Typography className={styles.description}>{datapack.description}</Typography>
        <Typography className={styles.fd}>{datapack.authoredBy}</Typography>
      </CardContent>
      <div className={styles.footer} onClick={(e) => e.stopPropagation()}>
        <CardActions className={styles.ca}>
          <CustomFormControlLabel
            label={value ? "Remove from Chart" : "Add to Chart"}
            width={110}
            fontSize="0.65rem"
            className={styles.cfcl}
            labelPlacement="end"
            control={
              <div
                className={styles.checkContainer}
                onClick={async (e) => {
                  e.stopPropagation();
                  setLoading(true);
                  onChange({ ...datapack, file: datapack.storedFileName });
                  setLoading(false);
                }}>
                {loading ? <Loader /> : value ? <CheckIcon /> : <span className="add-circle" />}
              </div>
            }
          />
        </CardActions>
        <div className={styles.vc}>
          <Typography className={styles.views}>100</Typography>
          <span className={styles.eye} />
        </div>
      </div>
    </Card>
  );
};
