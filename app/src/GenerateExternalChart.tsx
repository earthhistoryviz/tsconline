import { useEffect, useContext, useState } from "react";
import { context } from "./state";
import { ErrorCodes } from "./util/error-codes";
import { DatapackConfigForChartRequest, assertPointSettings } from "@tsconline/shared";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import LoadingChart from "./LoadingChart";
import { useTranslation } from "react-i18next";
import "./Chart.css";

export const GenerateExternalChart: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const datapackTitle = queryParams.get("datapackTitle");
  const { actions } = useContext(context);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorPushed, setErrorPushed] = useState(false);
  const { state } = useContext(context);

  const fetchData = async (controller: AbortController) => {
    if (datapackTitle) {
      setLoading(true);
      try {
        const fetchedDatapack = await actions.fetchDatapack(
          {
            isPublic: true,
            title: datapackTitle,
            type: "official"
          },
          { signal: controller.signal }
        );
        if (!fetchedDatapack) {
          console.error("Error: Datapack not found. Title:", datapackTitle);
          return;
        }

        const internalDatapack = await actions.fetchDatapack(
          {
            isPublic: true,
            title: "TimeScale Creator Internal Datapack",
            type: "official"
          },
          { signal: controller.signal }
        );
        if (!internalDatapack) {
          console.error("Error: Internal Datapack not found.");
          return;
        }

        actions.addDatapack(fetchedDatapack);
        actions.addDatapack(internalDatapack);

        const externalDatapackConfig: DatapackConfigForChartRequest = {
          storedFileName: fetchedDatapack.storedFileName,
          title: fetchedDatapack.title,
          isPublic: fetchedDatapack.isPublic,
          type: "official"
        };

        const internalDatapackConfig: DatapackConfigForChartRequest = {
          storedFileName: internalDatapack.storedFileName,
          title: internalDatapack.title,
          isPublic: internalDatapack.isPublic,
          type: "official"
        };

        await actions.processDatapackConfig([internalDatapackConfig, externalDatapackConfig]);

        actions.toggleSettingsTabColumn("Geomagnetic Polarity");
        actions.toggleSettingsTabColumn("Marine Macrofossils (Mesozoic-Paleozoic)");
        actions.toggleSettingsTabColumn("Microfossils");
        actions.toggleSettingsTabColumn("Global Reconstructions (R. Blakey)");

        const chartInfo = queryParams.get("chartInfo");
        if (chartInfo) {
          const parts = chartInfo.split("-");
          if (parts.length == 8) {
            const oldestTime = parseInt(parts[0], 10);
            const newestTime = parseInt(parts[1], 10);
            if (isNaN(oldestTime) || isNaN(newestTime)) {
              console.warn(
                `Warning: Oldest time or newest time is NaN. Oldest time: ${oldestTime}, Newest time: ${newestTime}`
              );
            } else {
              if (oldestTime <= newestTime) {
                console.warn(
                  `Warning: Oldest time should be greater than newst time. Oldest time: ${oldestTime}, Newest time: ${newestTime}`
                );
              } else {
                actions.setBaseStageAge(oldestTime, "Ma");
                actions.setTopStageAge(newestTime, "Ma");
                actions.setUnitsPerMY(0.1, "Ma");
              }
            }

            const values = parts.slice(2).map(Number); // [minTotal, maxTotal, minNew, maxNew, minExtinct, maxExtinct]
            const columnNames = ["Total", "New", "Extinct"];
            for (let i = 0; i < columnNames.length; i++) {
              const columnInfo = state.settingsTabs.columnHashMap.get(`${datapackTitle} ${columnNames[i]}-Genera`);
              if (columnInfo && columnInfo.columnSpecificSettings) {
                const [min, max] = [values[i * 2], values[i * 2 + 1]];

                if (isNaN(min) || isNaN(max) || min > max) {
                  console.warn(
                    `Warning: Invalid min-max numbers detected for ${columnNames[i]}-Genera ${datapackTitle}. Skipping...`
                  );
                  continue;
                }

                const stepValue = Math.floor((max - min) / 20);
                assertPointSettings(columnInfo.columnSpecificSettings);
                actions.setPointColumnSettings(columnInfo.columnSpecificSettings, { scaleStep: stepValue });
              }
            }
          } else {
            console.warn(
              "Warning: chartInfo format is incorrect. No changes to settings. Expected 8 parts, got:",
              parts.length
            );
          }
        } else {
          console.warn("Warning: chartInfo not found in URL. No changes to step and time settings");
        }

        actions.initiateChartGeneration(navigate, location.pathname);
      } catch (error) {
        actions.pushError(ErrorCodes.USER_FETCH_DATAPACK_FAILED);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (!datapackTitle && !errorPushed) {
      actions.pushError(ErrorCodes.INVALID_DATAPACK_TITLE);
      setErrorPushed(true);
      setLoading(false);
      return;
    }
    fetchData(controller).catch((e) => {
      console.error("Error fetching datapack", e);
      setLoading(false);
    });
    return () => {
      // In dev, because react calls use effect twice, the first call will be aborted, causing an error to be pushed
      // and the screen to flicker
      // This is not an issue in production
      controller.abort();
    };
  }, [datapackTitle, errorPushed]);
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh"
      }}>
      {loading ? (
        <LoadingChart percent={state.chartTab.percent} stage={state.chartTab.stage} />
      ) : (
        <Typography variant="h4">{t("chart.no-chart-yet")}</Typography>
      )}
    </Box>
  );
};
