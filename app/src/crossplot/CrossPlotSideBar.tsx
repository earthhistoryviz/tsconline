import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../state";
import styles from "./CrossPlotSideBar.module.css";
import { Box, useTheme } from "@mui/material";
import Color from "color";

export const CrossPlotSideBar: React.FC = observer(() => {
  const { state } = useContext(context);
  return (
    <Box
      className={styles.crossPlotSideBar}
      bgcolor="backgroundColor.main"
      borderRight="2px solid"
      borderColor="divider"
      boxShadow="5px 0 10px -5px rgba(0, 0, 0, 0.5)">
      <LeftTabs />
    </Box>
  );
});

const LeftTabs: React.FC = observer(() => {
  const { state } = useContext(context);
  const theme = useTheme();
  return <Box className={styles.leftTabs} bgcolor={Color(theme.palette.dark.main).alpha(0.9).toString()}></Box>;
});
