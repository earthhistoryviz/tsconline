import { Box, useTheme } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { useContext, useEffect, useRef } from "react";
import { context } from "../state";
import { loadRecaptcha, removeRecaptcha } from "../util";
import { ColDef } from "ag-grid-community";
import { TSCButton } from "../components";
import { DatapackParsingPack, assertDatapackParsingPack } from "@tsconline/shared";

const datapackColDefs: ColDef[] = [
  {
    headerName: "Datapack Title",
    field: "title",
    sortable: true,
    filter: true,
    rowDrag: true,
    flex: 1,
    checkboxSelection: true
  },
  { headerName: "File Name", field: "file", flex: 1, sortable: true, filter: true },
  { headerName: "Age Units", field: "ageUnits", flex: 0.5 },
  { headerName: "Description", field: "description", flex: 1 },
  { headerName: "Size", field: "size", flex: 0.5 },
  { headerName: "Format Version", field: "formatVersion", flex: 0.8 }
];

export const AdminDatapackConfig = observer(function AdminDatapackConfig() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const gridRef = useRef<AgGridReact<DatapackParsingPack>>(null);
  useEffect(() => {
    if (!state.user.isAdmin) return;
    loadRecaptcha();
    return () => {
      removeRecaptcha();
    };
  }, [state.user.isAdmin]);
  const deleteDatapacks = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || !selectedNodes.length) return;
    try {
      const datapacks = selectedNodes.map((node) => {
        assertDatapackParsingPack(node.data);
        return node.data.file;
      });
      const success = await actions.adminDeleteServerDatapacks(datapacks);
      if (!success) return;
      actions.fetchDatapackIndex();
    } catch (e) {
      console.error(e);
    }
  }
  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <Box m="10px">
        <TSCButton onClick={deleteDatapacks}>Delete Selected Datapacks</TSCButton>
      </Box>
      <AgGridReact
        ref={gridRef}
        columnDefs={datapackColDefs}
        rowSelection="multiple"
        rowDragManaged
        rowMultiSelectWithClick
        rowData={Object.values(state.datapackIndex).filter((datapack) => datapack.uuid === undefined)}
      />
    </Box>
  );
});
