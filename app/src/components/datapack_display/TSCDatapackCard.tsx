import { Card, CardActions, CardContent, CardMedia, IconButton, Typography } from "@mui/material";
import { DatapackParsingPack } from "@tsconline/shared";
import { devSafeUrl } from "../../util";
import { useState } from "react";
import styles from "./TSCDatapackCard.module.css";
import { TSCCheckbox } from "../TSCCheckbox";
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
    <Card className={styles.card} onClick={() => navigate(`/datapack/${name}`)}>
      <CardMedia component="img" height="140" image={imageUrl} onError={() => setImageUrl(defaultImageUrl)} />
      <CardContent className={styles.cc}>
        <div className={styles.hc}>
          <Typography className={styles.header}>{name}</Typography>
          <DatapackMenu
            name={name}
            button={
              <IconButton className={styles.other} onClick={(e) => e.stopPropagation()}>
                <span className={styles.more} />
              </IconButton>
            }
          />
        </div>
        <Typography className={styles.description}>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys
          standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to
          make a type specimen book. It has survived not only five centuries, but also the leap into electronic
          typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset
          sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus
          PageMaker including versions of Lorem Ipsum
        </Typography>
        <Typography className={styles.fd}>Dixon, Dougal, et al. (1980) · 10 MB</Typography>
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
