import { useEffect, useContext, useState } from "react";
import { context } from "./state";
import { ErrorCodes } from "./util/error-codes";
import { DatapackConfigForChartRequest } from "@tsconline/shared";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import LoadingChart from "./LoadingChart";

const GenerateExternalChart: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const datapackHash = queryParams.get("hash");
  const { actions } = useContext(context);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorPushed, setErrorPushed] = useState(false);

  const fetchData = async (controller: AbortController) => {
    if (datapackHash) {
      setLoading(true);
      try {
        const fetchedDatapack = await actions.fetchDatapack(
          {
            isPublic: false,
            title: datapackHash,
            type: "treatise"
          },
          { signal: controller.signal }
        );

        const internalDatapack = await actions.fetchDatapack(
          {
            isPublic: true,
            title: "TimeScale Creator Internal Datapack",
            type: "official"
          },
          { signal: controller.signal }
        );

        if (!fetchedDatapack || !internalDatapack) {
          if (!fetchedDatapack) {
            console.error("Error: Treatise Datapack not found. DatapackHash:", datapackHash);
          }
          if (!internalDatapack) {
            console.error("Error: Internal Datapack not found.");
          }
          actions.pushError(ErrorCodes.USER_FETCH_DATAPACK_FAILED);
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
        const parts = datapackHash.split("-");
        const oldestTime = parseInt(parts[1], 10);
        const newestTime = parseInt(parts[2], 10);
        actions.setBaseStageAge(oldestTime, "Ma");
        actions.setTopStageAge(newestTime, "Ma");
        actions.setUnitsPerMY(0.1, "Ma");

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
    if (!datapackHash && !errorPushed) {
      actions.pushError(ErrorCodes.INVALID_DATAPACK_HASH);
      setErrorPushed(true);
      return;
    }
    fetchData(controller).catch((e) => {
      console.error("Error fetching datapack", e);
    });
    return () => {
      if (import.meta.env.MODE !== "development") {
        controller.abort();
      }
    };
  }, [datapackHash, errorPushed]);

  if (!datapackHash) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" textAlign="center">
        <Typography variant="h3">Error: Unable to Generate Chart</Typography>
      </Box>
    );
  }

  if (loading) {
    return <LoadingChart />;
  }
  return null;
};

export default GenerateExternalChart;
