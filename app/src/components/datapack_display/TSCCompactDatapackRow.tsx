import { Datapack, DatapackConfigForChartRequest, isUserDatapack } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { Box, Typography } from "@mui/material";
import styles from "./TSCCompactDatapackRow.module.css";
import Color from "color";
import { useTheme } from "@mui/material";
import { CheckIcon, Loader } from "../TSCComponents";
import { useNavigate } from "react-router";
import TrashCanIcon from "../../assets/icons/trash-icon.json";
import Lottie from "../TSCLottie";
import { context } from "../../state";
import {
  getDatapackProfileImageUrl,
  getNavigationRouteForDatapackProfile,
  isOwnedByUser
} from "../../state/non-action-util";
import { Public } from "@mui/icons-material";

type TSCCompactDatapackRowProps = {
  datapack: Datapack;
  value: boolean;
  onChange: (datapack: DatapackConfigForChartRequest) => void;
};
export const TSCCompactDatapackRow: React.FC<TSCCompactDatapackRowProps> = observer(function TSCCompactDatapackRow({
  datapack,
  value,
  onChange
}) {
  const [loading, setLoading] = useState(false);
  const { actions, state } = useContext(context);
  const theme = useTheme();
  const navigate = useNavigate();
  return (
    <Box
      className={styles.rc}
      bgcolor="secondaryBackground.main"
      onClick={() => navigate(getNavigationRouteForDatapackProfile(datapack.title, datapack.type))}
      sx={{
        "&:hover": {
          bgcolor:
            theme.palette.mode === "light"
              ? Color(theme.palette.secondaryBackground.main).darken(0.04).string()
              : Color(theme.palette.secondaryBackground.main).lighten(0.26).string()
        }
      }}>
      <Box
        className={`${styles.cc} ${loading ? styles.loading : ""}`}
        bgcolor={
          value
            ? Color(theme.palette.button.light).alpha(0.4).string()
            : Color(theme.palette.secondaryBackground.light).alpha(0.5).string()
        }
        onClick={async (e) => {
          e.stopPropagation();
          setLoading(true);
          onChange(datapack);
          setLoading(false);
        }}>
        {loading ? <Loader /> : value ? <CheckIcon /> : <span className="add-circle" />}
      </Box>
      <img className={styles.image} src={getDatapackProfileImageUrl(datapack)} alt="datapack" />
      <div className={styles.title}>
        <Box className={styles.titleHeader}>
          <Typography className={styles.header} color="textSecondary">
            {datapack.title}
          </Typography>
          {isUserDatapack(datapack) && datapack.isPublic && <Public className={styles.publicIcon} />}
        </Box>
      </div>
      {isOwnedByUser(datapack, state.user?.uuid) && (
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
  );
});
