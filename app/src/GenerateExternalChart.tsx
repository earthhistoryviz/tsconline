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
  const phylum = queryParams.get("phylum");
  const { actions } = useContext(context);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorPushed, setErrorPushed] = useState(false);
  const { state } = useContext(context);

  const fetchData = async (controller: AbortController) => {
    if (phylum) {
      setLoading(true);
      try {
        const fetchedDatapack = await actions.fetchDatapack(
          {
            isPublic: true,
            title: phylum,
            type: "treatise"
          },
          { signal: controller.signal }
        );
        if (!fetchedDatapack) {
          console.error("Error: Treatise Datapack not found. Phylum:", phylum);
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

        const treatiseDatapackConfig: DatapackConfigForChartRequest = {
          storedFileName: fetchedDatapack.storedFileName,
          title: fetchedDatapack.title,
          isPublic: fetchedDatapack.isPublic,
          type: "treatise"
        };

        const internalDatapackConfig: DatapackConfigForChartRequest = {
          storedFileName: internalDatapack.storedFileName,
          title: internalDatapack.title,
          isPublic: internalDatapack.isPublic,
          type: "official"
        };

        await actions.processDatapackConfig([internalDatapackConfig, treatiseDatapackConfig]);

        actions.toggleSettingsTabColumn("Geomagnetic Polarity");
        actions.toggleSettingsTabColumn("Marine Macrofossils (Mesozoic-Paleozoic)");
        actions.toggleSettingsTabColumn("Microfossils");
        actions.toggleSettingsTabColumn("Global Reconstructions (R. Blakey)");

        const chartInfo = queryParams.get("chartInfo");
        if (chartInfo) {
          const parts = chartInfo.split("-");
          if (parts.length == 6) {
            const oldestTime = parseInt(parts[0], 10);
            const newestTime = parseInt(parts[1], 10);
            actions.setBaseStageAge(oldestTime, "Ma");
            actions.setTopStageAge(newestTime, "Ma");
            actions.setUnitsPerMY(0.1, "Ma");

            const values = parts.slice(2).map(Number); // [minTotal, maxTotal, minNew, maxNew, minExtinct, maxExtinct]
            const columnNames = ["Total", "New", "Extinct"];
            for (let i = 0; i < columnNames.length; i++) {
              const columnInfo = state.settingsTabs.columnHashMap.get(`${columnNames[i]}-Genera ${phylum}`);
              if (columnInfo && columnInfo.columnSpecificSettings) {
                const [min, max] = [values[i * 2], values[i * 2 + 1]];
                const stepValue = Math.floor((max - min) / 20);
                assertPointSettings(columnInfo.columnSpecificSettings);
                actions.setPointColumnSettings(columnInfo.columnSpecificSettings, { scaleStep: stepValue });
              }
            }
          }
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
    if (!phylum && !errorPushed) {
      actions.pushError(ErrorCodes.INVALID_DATAPACK_PHYLUM);
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
  }, [phylum, errorPushed]);
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh"
      }}>
      {loading ? <LoadingChart /> : <Typography variant="h4">{t("chart.no-chart-yet")}</Typography>}
    </Box>
  );
};
