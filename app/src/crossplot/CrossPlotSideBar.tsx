import { observer } from "mobx-react-lite";
import { forwardRef, useContext, useState } from "react";
import { context } from "../state";
import styles from "./CrossPlotSideBar.module.css";
import { Box, Typography, useTheme } from "@mui/material";
import Color from "color";
import { ColumnDisplay } from "../settings_tabs/Column";
import { AccessTimeRounded, BookmarkRounded, TableChartRounded } from "@mui/icons-material";

export const CrossPlotSideBar = observer(forwardRef<HTMLDivElement, {}>((_, ref) => {
  const [tabIndex, setTabIndex] = useState(0);
  const theme = useTheme();
  const tabs = [
    { tabName: "Time", Icon: AccessTimeRounded, component: <div>Time</div> },
    {
      tabName: "Columns",
      Icon: TableChartRounded,
      component: <ColumnDisplay />
    },
    { tabName: "Markers", Icon: BookmarkRounded, component: <div>Markers</div> }
  ];
  return (
    <Box
      className={styles.crossPlotSideBar}
      ref={ref}
      bgcolor="backgroundColor.main"
      borderRight="1px solid"
      borderColor="divider">
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
                "&:hover": {
                  // make the background color of the tab lighter when hovered
                  backgroundColor:
                    index === tabIndex
                      ? Color(theme.palette.button.main).alpha(0.1).toString()
                      : Color("gray").alpha(0.1).toString()
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
      <Box className={styles.tabContent}>{tabs[tabIndex].component}</Box>
    </Box>
  );
}));
