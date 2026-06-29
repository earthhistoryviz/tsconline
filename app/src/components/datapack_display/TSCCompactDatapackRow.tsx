import { DatapackConfigForChartRequest, isUserDatapack, DatapackMetadata } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import styles from "./TSCCompactDatapackRow.module.css";
import { useTheme } from "@mui/material";
import { DatapackChartAction, datapackAddedColors } from "./TSCDatapackCard";
import { useNavigate } from "react-router";
import TrashCanIcon from "../../assets/icons/trash-icon.json";
import Lottie from "../TSCLottie";
import { context } from "../../state";
import {
  getDatapackProfileImageUrl,
  getDatapackUUID,
  getNavigationRouteForDatapackProfile,
  isOwnedByUser
} from "../../state/non-action-util";
import { Public } from "@mui/icons-material";
import { LondonSyncButton } from "../../admin/LondonDatabaseSync";

// compact datapack list view (default) — one short row per datapack
type TSCCompactDatapackRowProps = {
  datapack?: DatapackMetadata;
  value?: boolean; // true when this datapack is staged for the chart
  onChange?: (datapack: DatapackConfigForChartRequest) => Promise<void>;
};
export const TSCCompactDatapackRow: React.FC<TSCCompactDatapackRowProps> = observer(function TSCCompactDatapackRow({
  datapack,
  value,
  onChange
}) {
  const skeleton = !datapack || !onChange || value === undefined;
  const [loading, setLoading] = useState(false);
  const { actions, state } = useContext(context);
  const theme = useTheme();
  const added = datapackAddedColors(theme);
  const navigate = useNavigate();

  // go to the datapack detail page (title or image click)
  const openProfile = () => {
    if (skeleton) return;
    navigate(getNavigationRouteForDatapackProfile(getDatapackUUID(datapack), datapack.title, datapack.type));
  };

  // add or remove this datapack from the staged chart selection
  const toggleChart = async () => {
    if (loading || skeleton) return;
    setLoading(true);
    try {
      await onChange(datapack);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      className={styles.rc}
      sx={{
        // green highlight when staged for the chart
        bgcolor: value ? added.tint : "secondaryBackground.main",
        border: "1px solid",
        borderColor: value ? added.main : "divider",
        borderRadius: "8px"
      }}>
      {skeleton ? (
        <Skeleton className={styles.image} />
      ) : (
        <img className={styles.image} src={getDatapackProfileImageUrl(datapack)} alt="" onClick={openProfile} />
      )}
      <div className={styles.title} onClick={openProfile}>
        <Box className={styles.titleHeader}>
          {skeleton ? (
            <Skeleton className={styles.header} width="90%" />
          ) : (
            <Typography className={styles.header} color="textSecondary">
              {datapack.title}
            </Typography>
          )}
          {!skeleton && isUserDatapack(datapack) && datapack.isPublic && <Public className={styles.publicIcon} />}
          <LondonSyncButton datapack={datapack} />
        </Box>
      </div>
      {/* right side: add/remove button (compact = short "Add" / "Added" labels) */}
      <Box className={styles.actions} onClick={(e) => e.stopPropagation()}>
        {skeleton ? (
          <Skeleton width={76} height={28} sx={{ borderRadius: 1 }} />
        ) : (
          <DatapackChartAction selected={!!value} loading={loading} compact onClick={toggleChart} />
        )}
        {!skeleton && isOwnedByUser(datapack, state.user?.uuid) && (
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
        )}
      </Box>
    </Box>
  );
});
