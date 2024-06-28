import { Card, CardActions, CardContent, CardMedia, IconButton, Typography } from "@mui/material";
import { DatapackParsingPack } from "@tsconline/shared";
import { devSafeUrl } from "../../util";
import { useState } from "react";
import styles from "./TSCDatapackCard.module.css";
import { CheckIcon, CustomFormControlLabel, Loader } from "../TSCComponents";
import { useNavigate } from "react-router";
import { DatapackMenu } from "../../settings_tabs/Datapack";

type TSCDatapackCardProps = {
  name: string;
  datapack: DatapackParsingPack;
  value: boolean;
  onChange: (name: string) => Promise<void>;
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
      onClick={() => navigate(`/datapack/${encodeURIComponent(name)}`)}>
      <CardMedia component="img" height="140" image={imageUrl} onError={() => setImageUrl(defaultImageUrl)} />
      <CardContent className={styles.cc}>
        <div className={styles.hc}>
          <Typography className={styles.header}>{datapack.title}</Typography>
          <DatapackMenu
            name={name}
            button={
              <IconButton className={styles.other} onClick={(e) => e.stopPropagation()}>
                <span className={styles.more} />
              </IconButton>
            }
          />
        </div>
        <Typography className={styles.description}>{datapack.description}</Typography>
        <Typography className={styles.fd}>Dixon, Dougal, et al. (1980) · {datapack.size}</Typography>
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
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  await onChange(name);
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
