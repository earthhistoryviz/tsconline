import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { context } from "../state";
import styles from "./CrossPlotSideBar.module.css";
import { Box, Button, Typography, useTheme } from "@mui/material";
import Color from "color";
import { Column, ColumnDisplay } from "../settings_tabs/Column";
import { AccessTimeRounded, BookmarkRounded, TableChartRounded } from "@mui/icons-material";
import { StyledScrollbar } from "../components";

export const CrossPlotSideBar: React.FC = observer(() => {
  const { state } = useContext(context);
  const [tabIndex, setTabIndex] = useState(0);
  const theme = useTheme();
  const tabs = [
    { tabName: "Time", Icon: AccessTimeRounded, component: <div>Time</div> },
    {
      tabName: "Columns",
      Icon: TableChartRounded,
      component: <ColumnDisplay/>
    },
    { tabName: "Markers", Icon: BookmarkRounded, component: <div>Markers</div> }
  ];
  return (
    <Box className={styles.crossPlotSideBar} bgcolor="backgroundColor.main" borderColor="divider">
      <Box className={styles.tabs} bgcolor={Color(theme.palette.dark.main).alpha(0.9).toString()}>
        {tabs.map((tab, index) => {
          const sx = {
            color: index === tabIndex ? theme.palette.button.main : theme.palette.dark.contrastText
          };
          return (
            <Box
              className={styles.tab}
              key={index}
              sx={{
                "&:hover > *": {
                  color: theme.palette.button.main
                }
              }}
              onClick={() => setTabIndex(index)}>
              <tab.Icon sx={sx} />
              <Typography
                className={styles.tabText}
                sx={sx}
                color="dark.contrastText"
                onClick={() => setTabIndex(index)}>
                {tab.tabName}
              </Typography>
            </Box>
          );
        })}
      </Box>
        <Box overflow="auto">
        {tabs[tabIndex].component}
        </Box>
    </Box>
  );
});
