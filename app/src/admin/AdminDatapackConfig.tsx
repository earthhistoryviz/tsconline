import { Box, Dialog, useTheme } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { useContext, useRef, useState } from "react";
import { context } from "../state";
import { CellValueChangedEvent, ColDef, RowDragEndEvent, ValueSetterParams } from "ag-grid-community";
import { TSCButton, DatapackUploadForm } from "../components";
import { BaseDatapackProps, DatapackPriorityChangeRequest, assertBaseDatapackProps } from "@tsconline/shared";
import { debounce } from "lodash";
import { toJS } from "mobx";

export const AdminDatapackConfig = observer(function AdminDatapackConfig() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);
  const rowData = Object.values(state.datapacks)
    .filter((datapack) => datapack.type === "official")
    .sort((a, b) => a.priority - b.priority);
  const gridRef = useRef<AgGridReact<BaseDatapackProps>>(null);
  const datapackColDefs: ColDef[] = [
    {
      headerName: "Priority",
      editable: true,
      field: "priority",
      flex: 0.6,
      rowDrag: true,
      valueSetter: (data: ValueSetterParams<BaseDatapackProps, string>) => {
        // to make sure the value is changed WITHIN an action
        if (data.newValue === undefined) return false;
        const newValue = parseInt(data.newValue || "");
        if (isNaN(newValue)) return false;
        actions.handleDatapackPriorityChange(data.data, newValue);
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
    { headerName: "File Name", field: "file", flex: 1, sortable: true, filter: true },
    { headerName: "Age Units", field: "ageUnits", flex: 0.5 },
    { headerName: "Description", field: "description", flex: 1 },
    { headerName: "Size", field: "size", flex: 0.5 },
    { headerName: "Format Version", field: "formatVersion", flex: 0.8 }
  ];
  const deleteDatapacks = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || !selectedNodes.length) return;
    try {
      const datapacks = selectedNodes.map((node) => {
        assertBaseDatapackProps(node.data);
        return node.data;
      });
      await actions.adminDeleteOfficialDatapacks(datapacks);
    } catch (e) {
      console.error(e);
    }
  };
  const debouncedUpdateDatapackPriority = debounce(async (updatedNodes: DatapackPriorityChangeRequest[]) => {
    await actions.adminUpdateDatapackPriority(updatedNodes);
  }, 3000);
  async function onRowDragEnd(event: RowDragEndEvent<BaseDatapackProps>) {
    const { api } = event;
    let prevPriority = 0;
    const rowCount = api.getDisplayedRowCount();
    const updatedRowData = [];
    const updatedNodes: DatapackPriorityChangeRequest[] = [];
    for (let i = 0; i < rowCount; i++) {
      const rowNode = api.getDisplayedRowAtIndex(i);
      if (!rowNode || !rowNode.data) continue;
      let currentPriority = toJS(rowNode.data.priority);
      if (currentPriority <= prevPriority) {
        currentPriority = prevPriority + 1;
        updatedNodes.push({ id: rowNode.data.title, uuid: "official", priority: currentPriority });
      }
      prevPriority = currentPriority;
      updatedRowData.push({ ...rowNode.data, priority: currentPriority });
    }
    api.setGridOption("rowData", updatedRowData);
    debouncedUpdateDatapackPriority(updatedNodes);
    api.refreshCells();
  }
  async function onCellValueChanged(event: CellValueChangedEvent<BaseDatapackProps>) {
    if (event.colDef.field === "priority") {
      event.api.stopEditing();
      const { data } = event;
      const updatedNodes: DatapackPriorityChangeRequest[] = [
        toJS({ id: data.title, uuid: "official", priority: data.priority })
      ];
      await actions.adminUpdateDatapackPriority(updatedNodes);
    }
  }

  async function resetPriorities() {
    const api = gridRef.current?.api;
    if (!api) return;
    const rowCount = api.getDisplayedRowCount();
    const updatedRowData = [];
    const updatedNodes: DatapackPriorityChangeRequest[] = [];
    for (let i = 0; i < rowCount; i++) {
      const rowNode = api.getDisplayedRowAtIndex(i);
      if (!rowNode || !rowNode.data) continue;
      let currentPriority = toJS(rowNode.data.priority);
      if (currentPriority !== i + 1) {
        currentPriority = i + 1;
        updatedNodes.push({ id: rowNode.data.title, uuid: "official", priority: currentPriority });
      }
      updatedRowData.push({ ...rowNode.data, priority: currentPriority });
    }
    api.setGridOption("rowData", updatedRowData);
    await actions.adminUpdateDatapackPriority(updatedNodes);
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
        <TSCButton onClick={async () => await resetPriorities()}>Reset Priorities</TSCButton>
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
        loading={state.admin.datapackPriorityLoading}
        rowDragManaged
        gridOptions={{
          onRowDragEnd,
          onCellValueChanged
        }}
        rowMultiSelectWithClick
        rowData={rowData}
      />
    </Box>
  );
});
