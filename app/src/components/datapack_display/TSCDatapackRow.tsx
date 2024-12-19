import { Datapack, DatapackConfigForChartRequest, DatapackMetadata } from "@tsconline/shared";
import styles from "./TSCDatapackRow.module.css";
import { useContext, useState } from "react";
import { Box, IconButton, Skeleton, Typography, useTheme } from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useNavigate } from "react-router";
import { DatapackMenu } from "../../settings_tabs/Datapack";
import "./SharedDatapackDisplay.css";
import { CheckIcon, Loader } from "../TSCComponents";
import Color from "color";
import Lottie from "../TSCLottie";
import TrashCanIcon from "../../assets/icons/trash-icon.json";
import { context } from "../../state";
import {
  getDatapackProfileImageUrl,
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
  return (
    <Box
      className={styles.rc}
      borderBottom="2px solid"
      borderColor="divider"
      bgcolor="secondaryBackground.main"
      sx={{
        "&:hover": {
          bgcolor:
            theme.palette.mode === "light"
              ? Color(theme.palette.secondaryBackground.main).darken(0.04).string()
              : Color(theme.palette.secondaryBackground.main).lighten(0.26).string()
        }
      }}
      onClick={
        !skeleton ? () => navigate(getNavigationRouteForDatapackProfile(datapack.title, datapack.type)) : () => {}
      }>
      <Box
        className={`${styles.cc} ${loading ? styles.loading : ""}`}
        borderRight="1px solid"
        borderLeft="1px solid"
        borderColor="divider"
        bgcolor={
          value
            ? Color(theme.palette.button.light).alpha(0.4).string()
            : Color(theme.palette.secondaryBackground.light).alpha(0.5).string()
        }
        onClick={
          !skeleton
            ? async (e) => {
                e.stopPropagation();
          if (loading) return;
                setLoading(true);
                await onChange(datapack);
                setLoading(false);
              }
            : () => {}
        }>
        {skeleton ? (
          <Skeleton variant="circular" width={22} height={22} />
        ) : loading ? (
          <Loader />
        ) : value ? (
          <CheckIcon />
        ) : (
          <span className="add-circle" />
        )}
      </Box>
      {skeleton ? (
        <Skeleton className={styles.image} />
      ) : (
        <img className={styles.image} src={getDatapackProfileImageUrl(datapack)} alt="datapack" />
      )}
      <div className={styles.middle}>
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
            {datapack.totalColumns} Columns · {datapack.size} · {datapack.datapackImageCount} Images
            {datapack.date && ` · Created ${datapack.date}`}
          </Typography>
        )}
      </div>
      {!skeleton && isOwnedByUser(datapack, state.user?.uuid) && (
        <div
          className={styles.right}
          onClick={(e) => {
            e.stopPropagation();
          }}>
          <DatapackMenu
            datapack={datapack}
            button={
              <IconButton className={styles.iconbutton}>
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
  );
};
