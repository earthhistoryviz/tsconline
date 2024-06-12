import { Card, CardActions, CardContent, CardMedia, IconButton, Typography } from "@mui/material";
import { DatapackParsingPack } from "@tsconline/shared";
import { devSafeUrl } from "../util";
import { useState } from "react";
import styles from "./TSCDatapackCard.module.css";
import { TSCCheckbox } from "./TSCCheckbox";
import { CustomFormControlLabel } from "./TSCComponents";

type TSCDatapackCardProps = {
  name: string;
  datapack: DatapackParsingPack;
};
export const TSCDatapackCard: React.FC<TSCDatapackCardProps> = ({ name, datapack }) => {
  const [imageUrl, setImageUrl] = useState(devSafeUrl("/datapack-images/" + datapack.image));
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");
  return (
    <Card className={styles.card}>
      <CardMedia component="img" height="140" image={imageUrl} onError={() => setImageUrl(defaultImageUrl)} />
      <CardContent className={styles.cc}>
        <div className={styles.hc}>
          <Typography className={styles.header}>{name}</Typography>
          <IconButton className={styles.other}>
            <span className={styles.more} />
          </IconButton>
        </div>
        <Typography className={styles.description}>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's
          standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to
          make a type specimen book. It has survived not only five centuries, but also the leap into electronic
          typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset
          sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus
          PageMaker including versions of Lorem Ipsum
        </Typography>
        <Typography className={styles.fd}>Dixon, Dougal, et al. (1980) · 10 MB</Typography>
      </CardContent>
      <div className={styles.footer}>
        <CardActions className={styles.ca}>
          <CustomFormControlLabel
            label="Add to Chart"
            width={110}
            fontSize="0.75rem"
            className={styles.cfcl}
            labelPlacement="end"
            control={<TSCCheckbox />}
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