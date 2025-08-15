import { useEffect, useContext, useState } from "react";
import { context } from "./state";
import { ErrorCodes } from "./util/error-codes";
import { DatapackConfigForChartRequest } from "@tsconline/shared";
import { useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import LoadingChart from "./LoadingChart";
import { useTranslation } from "react-i18next";
import "./Chart.css";
import cloneDeep from "lodash/cloneDeep";
import { jsonToXml } from "./state/parse-settings";
import { sendChartRequestToServer, resetChartTabStateForGeneration } from "./state/actions/generate-chart-actions";
import { ChartRequest, ColumnInfo } from "@tsconline/shared";
import * as generalActions from "./state/actions/general-actions";
import { ChartSettings } from "./types";
import { state } from "./state";

/**
 * Generates a chart and returns its hash if successful so MCP can get SVG and the XML
 *
 * @returns The chart hash if successful
 */
export async function generateChartAndGetHash(): Promise<string | null> {
  resetChartTabStateForGeneration(state.chartTab.state);
  generalActions.setTab(3);
  try {
    let chartRequest: ChartRequest | null = null;
    try {
      const chartSettingsCopy: ChartSettings = cloneDeep(state.settings);
      const columnCopy: ColumnInfo = cloneDeep(state.settingsTabs.columns!);
      const xmlSettings = jsonToXml(columnCopy, state.settingsTabs.columnHashMap, chartSettingsCopy);
      chartRequest = {
        settings: xmlSettings,
        datapacks: state.config.datapacks,
        useCache: state.useCache,
        isCrossPlot: false
      };
    } catch (e) {
      console.error(e);
      generalActions.pushError(ErrorCodes.INVALID_DATAPACK_CONFIG);
      return null;
    }
    if (!chartRequest) {
      generalActions.pushError(ErrorCodes.INVALID_DATAPACK_CONFIG);
      return null;
    }
    const response = await sendChartRequestToServer(chartRequest);
    generalActions.updateChartLoadingProgress(0, "Initializing");
    if (!response) {
      // error SHOULD already displayed
      return null;
    }
    generalActions.setChartTabState(state.chartTab.state, {
      chartContent: response.chartContent,
      chartHash: response.hash,
      madeChart: true,
      unsafeChartContent: response.unsafeChartContent,
      chartTimelineEnabled: false
    });
    generalActions.removeAllErrors();
    return response.hash;
  } finally {
    generalActions.setChartTabState(state.chartTab.state, { chartLoading: false });
  }
}

export const GenerateMCPChart: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const datapackTitle = queryParams.get("datapackTitle");
  const parsedBase = parseFloat(queryParams.get("baseVal") ?? "");
  const baseVal = isNaN(parsedBase) ? 10 : parsedBase;
  const parsedTop = parseFloat(queryParams.get("topVal") ?? "");
  const topVal = isNaN(parsedTop) ? 0 : parsedTop;
  const parsedStep = parseFloat(queryParams.get("unitStep") ?? "");
  const unitStep = isNaN(parsedStep) ? 0.1 : parsedStep;
  const unitType = queryParams.get("unitType") ?? "Ma";

  const { actions } = useContext(context);
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

        await actions.processDatapackConfig([externalDatapackConfig]);
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
          } else {
            actions.setBaseStageAge(baseVal, unitType);
            actions.setTopStageAge(topVal, unitType);
          }
          if (unitStep <= 0) {
            console.warn("Unit Step must be greater than 0. No changes made.");
          } else {
            actions.setUnitsPerMY(unitStep, unitType);
          }
        } catch (err) {
          console.warn("Failed to set stage ages or unit steps: ", err);
        }
        const hash = await generateChartAndGetHash();
        if (hash) {
          console.log("Generated chart hash:", hash);
        } else {
          console.error("Chart generation failed");
        }
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
