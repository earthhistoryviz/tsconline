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
  const chartConfig = queryParams.get("chartConfig");
  const parsedBase = parseFloat(queryParams.get("baseVal") ?? "");
  const baseVal = isNaN(parsedBase) ? 10 : parsedBase;
  const parsedTop = parseFloat(queryParams.get("topVal") ?? "");
  const topVal = isNaN(parsedTop) ? 0 : parsedTop;
  const parsedStep = parseFloat(queryParams.get("unitStep") ?? "");
  const unitStep = isNaN(parsedStep) ? 0.1 : parsedStep;
  const unitType = queryParams.get("unitType") ?? "Ma";
  const minMaxPlot = queryParams.get("minMaxPlot"); // treatise use only: min_total-max_total-min_new-max_new-min_extinct-max_extinct

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
        actions.addDatapack(fetchedDatapack);

        const externalDatapackConfig: DatapackConfigForChartRequest = {
          storedFileName: fetchedDatapack.storedFileName,
          title: fetchedDatapack.title,
          isPublic: fetchedDatapack.isPublic,
          type: "official"
        };

        if (chartConfig === "Internal") {
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
          actions.addDatapack(internalDatapack);

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
        } else {
          await actions.processDatapackConfig([externalDatapackConfig]);
        }

        // !isNaN here isn't redundant, reason is because 0 and negative numbers need to also work
        // This is mainly to warn users one of their inputs didn't work
        if (isNaN(parsedTop) || isNaN(parsedBase) || isNaN(parsedStep)) {
          console.warn(
            "Base Unit Value, Top Unit Value, and Unit Step must ALL be provided with number values. Using Default."
          );
          console.warn("Provided values: baseVal: ", baseVal, ", topVal: ", topVal, ", unitStep: ", unitStep);
        }

        try {
          if (topVal > baseVal) {
            console.warn("Top Unit Value must be less than Base Unit Value. No changes made.");
          } else if (unitStep <= 0) {
            console.warn("Unit Step must be greater than 0. No changes made.");
          } else {
            actions.setBaseStageAge(baseVal, unitType);
            actions.setTopStageAge(topVal, unitType);
            actions.setUnitsPerMY(unitStep, unitType);
          }
        } catch (err) {
          console.warn("Failed to set stage ages or unit steps: ", err);
        }

        if (chartConfig === "Internal" && minMaxPlot) {
          const parts = minMaxPlot.split("-");
          if (parts.length == 6) {
            const values = parts.map(Number); // [minTotal, maxTotal, minNew, maxNew, minExtinct, maxExtinct]
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
              "Warning: chartInfo format is incorrect. No changes to settings. Expected 6 parts, got:",
              parts.length
            );
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
      {loading ? <LoadingChart /> : <Typography variant="h4">{t("chart.no-chart-yet")}</Typography>}
    </Box>
  );
};
