import { Card, CardActions, CardContent, CardMedia, IconButton, Skeleton, Typography } from "@mui/material";
import { DatapackConfigForChartRequest, DatapackMetadata } from "@tsconline/shared";
import { useState } from "react";
import styles from "./TSCDatapackCard.module.css";
import { CheckIcon, CustomFormControlLabel, Loader } from "../TSCComponents";
import { useNavigate } from "react-router";
import { DatapackMenu } from "../../settings_tabs/Datapack";
import { getDatapackProfileImageUrl, getNavigationRouteForDatapackProfile } from "../../state/non-action-util";

type TSCDatapackCardProps = {
  datapack?: DatapackMetadata;
  value?: boolean;
  onChange?: (datapack: DatapackConfigForChartRequest) => Promise<void>;
};
export const TSCDatapackCard: React.FC<TSCDatapackCardProps> = ({ datapack, value, onChange }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const skeleton = !datapack || !onChange || value === undefined;

  return (
    <Card
      className={styles.card}
      sx={{ outline: "1px solid", outlineColor: "divider", bgcolor: "secondaryBackground.main" }}
      onClick={
        skeleton ? () => {} : () => navigate(getNavigationRouteForDatapackProfile(datapack.title, datapack.type))
      }>
      {skeleton ? (
        <Skeleton height="140px" />
      ) : (
        <CardMedia component="img" height="140" image={getDatapackProfileImageUrl(datapack)} />
      )}
      <CardContent className={styles.cc}>
        <div className={styles.hc}>
          {skeleton ? (
            <Skeleton className={styles.header} width="90%" />
          ) : (
            <Typography className={styles.header}>{datapack.title}</Typography>
          )}
          {!skeleton && (
            <DatapackMenu
              datapack={datapack}
              button={
                <IconButton className={styles.other} onClick={(e) => e.stopPropagation()}>
                  <span className={styles.more} />
                </IconButton>
              }
            />
          )}
        </div>
        {skeleton ? (
          <Skeleton className={styles.description} width="90%" />
        ) : (
          <Typography className={styles.description}>{datapack.description}</Typography>
        )}
        {skeleton ? (
          <Skeleton className={styles.fd} width="90%" />
        ) : (
          <Typography className={styles.fd}>{datapack.authoredBy}</Typography>
        )}
      </CardContent>
      <div className={styles.footer} onClick={(e) => e.stopPropagation()}>
        <CardActions className={styles.ca}>
          {skeleton ? (
            <Skeleton width="90px" />
          ) : (
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
                    if (loading) return;
                    setLoading(true);
                    !skeleton && (await onChange(datapack));
                    setLoading(false);
                  }}>
                  {loading ? <Loader /> : value ? <CheckIcon /> : <span className="add-circle" />}
                </div>
              }
            />
          )}
        </CardActions>
        <div className={styles.vc}>
          {skeleton ? (
            <Skeleton width="30px" sx={{ marginRight: "10px" }} />
          ) : (
            <Typography className={styles.views}>100</Typography>
          )}
          {skeleton ? <Skeleton width="10px" /> : <span className={styles.eye} />}
        </div>
      </div>
    </Card>
  );
};
