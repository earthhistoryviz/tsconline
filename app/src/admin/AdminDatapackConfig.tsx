import { Box, Dialog, useTheme } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { useContext, useRef, useState } from "react";
import { context } from "../state";
import { ColDef } from "ag-grid-community";
import { TSCButton, TSCDatapackUploadForm } from "../components";
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
  const [formOpen, setFormOpen] = useState(false);
  const gridRef = useRef<AgGridReact<DatapackParsingPack>>(null);
  const deleteDatapacks = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || !selectedNodes.length) return;
    try {
      const datapacks = selectedNodes.map((node) => {
        assertDatapackParsingPack(node.data);
        return node.data.file;
      });
      await actions.adminDeleteServerDatapacks(datapacks);
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <Box display="flex" m="10px" gap="20px">
        <TSCButton
          onClick={() => {
            setFormOpen(!formOpen);
          }}>
          Upload Datapack
        </TSCButton>
        <TSCButton onClick={deleteDatapacks}>Delete Selected Datapacks</TSCButton>
        <Dialog open={formOpen} onClose={() => setFormOpen(false)}>
          <TSCDatapackUploadForm close={() => setFormOpen(false)} upload={actions.adminUploadServerDatapack} />
        </Dialog>
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
