import { DatapackParsingPack } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Box, Typography } from "@mui/material";
import styles from "./TSCCompactDatapackRow.module.css";
import Color from "color";
import { useTheme } from "@mui/material";
import { CheckIcon, Loader } from "../TSCComponents";
import { devSafeUrl } from "../../util";
import { useNavigate } from "react-router";

type TSCCompactDatapackRowProps = {
  name: string;
  datapack: DatapackParsingPack;
  value: boolean;
  onChange: (name: string) => Promise<void>;
};
export const TSCCompactDatapackRow: React.FC<TSCCompactDatapackRowProps> = observer(function TSCCompactDatapackRow({
  name,
  datapack,
  value,
  onChange
}) {
  const [imageUrl, setImageUrl] = useState(devSafeUrl("/datapack-images/" + datapack.image));
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");
  return (
    <Box
      className={styles.rc}
      bgcolor="secondaryBackground.main"
      onClick={() => navigate(`/datapack/${encodeURIComponent(name)}`)}
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
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await onChange(name);
          setLoading(false);
        }}>
        {loading ? <Loader /> : value ? <CheckIcon /> : <span className="add-circle" />}
      </Box>
      <img className={styles.image} src={imageUrl} alt="datapack" onError={() => setImageUrl(defaultImageUrl)} />
      <div className={styles.right}>
        <Typography className={styles.header} color="textSecondary">
          {datapack.title}
        </Typography>
      </div>
    </Box>
  );
});
