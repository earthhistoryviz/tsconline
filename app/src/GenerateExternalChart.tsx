// import { useEffect, useContext, useState } from "react";
// import { context } from "./state";
// import { getCurrentUserDatapacks, getPublicOfficialDatapacks } from "./state/non-action-util";
// import { ErrorCodes } from "./util/error-codes";
// import { ColumnInfo, DatapackConfigForChartRequest } from "@tsconline/shared";
// import { useNavigate, useLocation } from "react-router-dom";
// import { Box, Typography } from "@mui/material";
// import LoadingChart from "./LoadingChart";

// export function GenerateExternalChart() {
//   const location = useLocation();
//   const queryParams = new URLSearchParams(location.search);
//   const datapackHash = queryParams.get("hash");
//   const { state, actions } = useContext(context);
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(true);
//   const [errorPushed, setErrorPushed] = useState(false);

//   const toggleSpecificColumns = (columnNames: string[]) => {
//     const findAndToggleColumn = (columns: ColumnInfo[], targetName: string) => {
//       for (const column of columns) {
//         if (column.name === targetName) {
//           actions.toggleSettingsTabColumn(column);
//           return true;
//         }
//         if (column.children && column.children.length > 0) {
//           const found = findAndToggleColumn(column.children, targetName);
//           if (found) return true;
//         }
//       }
//       return false;
//     };

//     columnNames.forEach((name) => {
//       if (state.settingsTabs.columns && !findAndToggleColumn(state.settingsTabs.columns.children, name)) {
//         console.warn(`Column with name "${name}" not found.`);
//       }
//     });
//   };

//   useEffect(() => {
//     if (!datapackHash && !errorPushed) {
//       actions.pushError(ErrorCodes.INVALID_DATAPACK_HASH);
//       setErrorPushed(true);
//       return;
//     }

//     const fetchData = async () => {
//       if (datapackHash) {
//         setLoading(true);
//         try {
//           // Call API to load the external datapack
//           await actions.fetchTreatiseDatapack(datapackHash);
//           // wait 1 seconds for datapack to load
//           await new Promise((resolve) => setTimeout(resolve, 1000));
//           const fetchedDatapack = getCurrentUserDatapacks("treatise", state.datapacks).find(
//             (dp) => dp.title === datapackHash
//           );
//           const internalDatapack = getPublicOfficialDatapacks(state.datapacks).find(
//             (dp) => dp.title === "TimeScale Creator Internal Datapack"
//           );

//           if (!fetchedDatapack || !internalDatapack) {
//             if (!fetchedDatapack) {
//               console.error("Error: Treatise Datapack not found. DatapackHash:", datapackHash);
//             }
//             if (!internalDatapack) {
//               console.error("Error: Internal Datapack not found.");
//             }
//             actions.pushError(ErrorCodes.USER_FETCH_DATAPACK_FAILED);
//             return;
//           }
          
//           const dataReqTreatise: DatapackConfigForChartRequest = {
//             storedFileName: fetchedDatapack.storedFileName,
//             title: fetchedDatapack.title,
//             isPublic: fetchedDatapack.isPublic,
//             uuid: "treatise",
//             type: "user"
//           };

//           const internalDatapackConfig: DatapackConfigForChartRequest = {
//             storedFileName: internalDatapack.storedFileName,
//             title: internalDatapack.title,
//             isPublic: internalDatapack.isPublic,
//             type: "official"
//           };

//           await actions.processDatapackConfig([internalDatapackConfig, dataReqTreatise]);
//           const columnNamesToToggle = [
//             "Geomagnetic Polarity",
//             "Marine Macrofossils (Mesozoic-Paleozoic)",
//             "Microfossils"
//           ];
//           toggleSpecificColumns(columnNamesToToggle);

//           const parts = datapackHash.split("-");
//           const oldestTime = parseInt(parts[1], 10);
//           const newestTime = parseInt(parts[2], 10);
//           actions.setBaseStageAge(oldestTime, "Ma");
//           actions.setTopStageAge(newestTime, "Ma");
//           actions.setUnitsPerMY(0.1, "Ma");

//           actions.initiateChartGeneration(navigate, location.pathname);
//         } catch (error) {
//           actions.pushError(ErrorCodes.USER_FETCH_DATAPACK_FAILED);
//         } finally {
//           setLoading(false);
//         }
//       }
//     };
//     fetchData();
//   }, [datapackHash, errorPushed]);

//   if (!datapackHash) {
//     return (
//       <Box display="flex" justifyContent="center" alignItems="center" height="100vh" textAlign="center">
//         <Typography variant="h3">Error: Unable to Generate Chart</Typography>
//       </Box>
//     );
//   }

//   if (loading) {
//     return <LoadingChart />;
//   }
// }
