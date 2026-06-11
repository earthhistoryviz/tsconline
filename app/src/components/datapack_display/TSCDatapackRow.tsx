import { DatapackConfigForChartRequest, DatapackMetadata } from "@tsconline/shared";
import styles from "./TSCDatapackRow.module.css";
import { useContext, useState } from "react";
import { Box, IconButton, Skeleton, Typography, useTheme } from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useNavigate } from "react-router";
import { DatapackMenu } from "../../settings_tabs/Datapack";
import { DatapackChartAction, datapackAddedColors } from "./TSCDatapackCard";
import Lottie from "../TSCLottie";
import TrashCanIcon from "../../assets/icons/trash-icon.json";
import { context } from "../../state";
import {
  getDatapackProfileImageUrl,
  getDatapackUUID,
  getNavigationRouteForDatapackProfile,
  isOwnedByUser
} from "../../state/non-action-util";

type TSCDatapackRowProps = {
  datapack?: DatapackMetadata;
  value?: boolean;
  onChange?: (datapack: DatapackConfigForChartRequest) => Promise<void>;
};

export const TSCDatapackRow: React.FC<TSCDatapackRowProps> = ({ datapack, value, onChange }) => {
  const skeleton = !datapack || !onChange || value === undefined;
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { actions, state } = useContext(context);
  const theme = useTheme();
  const added = datapackAddedColors(theme);

  // go to the datapack detail page (title or image click)
  const openProfile = () => {
    if (skeleton) return;
    navigate(getNavigationRouteForDatapackProfile(getDatapackUUID(datapack), datapack.title, datapack.type));
  };

  // add or remove this datapack from the staged chart selection
  const toggleChart = async () => {
    if (loading || skeleton) return;
    setLoading(true);
    await onChange(datapack);
    setLoading(false);
  };

  return (
    <Box
      className={styles.rc}
      sx={{
        // green highlight when staged for the chart
        bgcolor: value ? added.tint : "secondaryBackground.main",
        border: "1px solid",
        borderColor: value ? added.main : "divider",
        borderRadius: "10px",
        mb: "6px"
      }}>
      {skeleton ? (
        <Skeleton className={styles.image} />
      ) : (
        <img className={styles.image} src={getDatapackProfileImageUrl(datapack)} alt="" onClick={openProfile} />
      )}
      <div className={styles.middle} onClick={openProfile}>
        {skeleton ? (
          <Skeleton className={styles.header} width="95%" />
        ) : (
          <Typography className={styles.header} color="textSecondary">
            {datapack.title}
          </Typography>
        )}
        {skeleton ? (
          <Skeleton className={styles.fd} width="95%" />
        ) : (
          <Typography className={styles.fd} color="textSecondary">
            {datapack.authoredBy}
          </Typography>
        )}
        {skeleton ? (
          <Skeleton className={styles.cs} width="95%" />
        ) : (
          <Typography className={styles.ci} color="textSecondary">
            {datapack.date && ` Created ${datapack.date}`}
          </Typography>
        )}
      </div>
      {/* right side add/remove button */}
      <Box className={styles.actions} onClick={(e) => e.stopPropagation()}>
        {skeleton ? (
          <Skeleton width={124} height={32} sx={{ borderRadius: 1 }} />
        ) : (
          <DatapackChartAction selected={!!value} loading={loading} onClick={toggleChart} />
        )}
        {!skeleton && isOwnedByUser(datapack, state.user?.uuid) && (
          <div className={styles.right}>
            <DatapackMenu
              datapack={datapack}
              button={
                <IconButton className={styles.iconbutton} size="small">
                  <MoreHorizIcon />
                </IconButton>
              }
            />
            <Box
              onClick={async (e) => {
                e.stopPropagation();
                await actions.userDeleteDatapack(datapack.title);
              }}>
              <Lottie
                className={styles.lottie}
                animationData={TrashCanIcon}
                width={20}
                height={20}
                playOnHover
                speed={1.7}
              />
            </Box>
          </div>
        )}
      </Box>
    </Box>
  );
};
