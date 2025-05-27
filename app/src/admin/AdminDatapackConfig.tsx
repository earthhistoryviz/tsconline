import { Box, Dialog, useTheme } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { useContext, useRef, useState } from "react";
import { context } from "../state";
import { ColDef, RowDragEndEvent, ValueSetterParams } from "ag-grid-community";
import { TSCButton, DatapackUploadForm } from "../components";
import { Datapack, DatapackPriorityChangeRequest, assertDatapackMetadata } from "@tsconline/shared";
import { compareExistingDatapacks } from "../state/non-action-util";
import { pushError } from "../state/actions";
import { ErrorCodes } from "../util/error-codes";

export const AdminDatapackConfig = observer(function AdminDatapackConfig() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);
  const rowData = Object.values(state.datapackMetadata)
    .filter((datapack) => datapack.type === "official")
    .sort((a, b) => a.priority - b.priority);
  const gridRef = useRef<AgGridReact<Datapack>>(null);
  const datapackColDefs: ColDef[] = [
    {
      headerName: "Priority",
      editable: true,
      field: "priority",
      flex: 0.6,
      rowDrag: true,
      valueSetter: (data: ValueSetterParams<Datapack, string>) => {
        // to make sure the value is changed WITHIN an action
        if (data.newValue === undefined) return false;
        const newValue = parseInt(data.newValue ?? "");
        if (isNaN(newValue)) return false;
        actions.setAdminDatapackConfigTempRowData(
          [
            ...[...(state.admin.datapackConfig.tempRowData || rowData)].filter(
              (dp) => !compareExistingDatapacks(dp, data.data)
            ),
            { ...data.data, priority: newValue }
          ].sort((a, b) => a.priority - b.priority)
        );
        actions.setAdminRowPriorityUpdates([
          ...state.admin.datapackConfig.rowPriorityUpdates.filter((node) => node.id !== data.data.title),
          {
            id: data.data.title,
            uuid: "official",
            priority: newValue
          }
        ]);
        return true;
      }
    },
    {
      headerName: "Datapack Title",
      field: "title",
      sortable: true,
      filter: true,
      flex: 1,
      checkboxSelection: true
    },
    { headerName: "File Name", field: "originalFileName", flex: 1, sortable: true, filter: true },
    { headerName: "Description", field: "description", flex: 1 },
    { headerName: "Size", field: "size", flex: 0.5 }
  ];
  // delete selected datapacks
  const deleteDatapacks = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || !selectedNodes.length) return;
    try {
      const datapacks = selectedNodes.map((node) => {
        assertDatapackMetadata(node.data);
        return node.data;
      });
      await actions.adminDeleteOfficialDatapacks(datapacks);
    } catch (e) {
      console.error(e);
    }
  };
  // debounce the update of datapack priority
  // update the priority of the datapacks on row drag
  async function onRowDragEnd(event: RowDragEndEvent<Datapack>) {
    const { api } = event;
    const rowCount = api.getDisplayedRowCount();
    const updatedRowData = [];
    const updatedNodes: DatapackPriorityChangeRequest[] = [];
    for (let i = 0; i < rowCount; i++) {
      const rowNode = api.getDisplayedRowAtIndex(i);
      if (!rowNode || !rowNode.data) continue;
      const { data } = rowNode;
      // if the row differs in order to the original and/or the priority has changed
      if (data.priority !== i + 1 || data.priority !== i + 1) {
        updatedNodes.push({ id: rowNode.data.title, uuid: "official", priority: i + 1 });
      }
      updatedRowData.push({ ...rowNode.data, priority: i + 1 });
    }
    actions.setAdminDatapackConfigTempRowData(updatedRowData);
    actions.setAdminRowPriorityUpdates(updatedNodes);
  }
  async function submitPriorityChanges() {
    try {
      await actions.adminUpdateDatapackPriority(state.admin.datapackConfig.rowPriorityUpdates);
      actions.resetAdminConfigTempState();
    } catch (e) {
      console.error(e);
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  }
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
        <TSCButton
          disabled={!state.admin.datapackConfig.tempRowData}
          onClick={async () => await submitPriorityChanges()}>
          Confirm Priority Changes
        </TSCButton>
        <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth={false}>
          <DatapackUploadForm
            close={() => setFormOpen(false)}
            upload={actions.adminUploadOfficialDatapack}
            type={{ type: "official" }}
          />
        </Dialog>
      </Box>
      <AgGridReact
        ref={gridRef}
        columnDefs={datapackColDefs}
        rowSelection="multiple"
        containerStyle={{ outline: state.admin.datapackConfig.tempRowData ? "1px solid red" : "none" }}
        loading={state.admin.datapackPriorityLoading}
        rowDragManaged
        gridOptions={{
          onRowDragEnd,
          getRowId: (params) => params.data.title
        }}
        rowMultiSelectWithClick
        rowData={state.admin.datapackConfig.tempRowData || rowData}
      />
    </Box>
  );
});
