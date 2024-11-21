import { Box, Dialog, useTheme } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { useContext, useEffect, useRef, useState } from "react";
import { context } from "../state";
import { CellValueChangedEvent, ColDef, RowDragEndEvent, ValueSetterParams } from "ag-grid-community";
import { TSCButton, DatapackUploadForm } from "../components";
import { BaseDatapackProps, DatapackPriorityChangeRequest, assertBaseDatapackProps } from "@tsconline/shared";
import { runInAction, toJS } from "mobx";
import _ from "lodash";
import { compareExistingDatapacks } from "../state/non-action-util";
import { pushError } from "../state/actions";
import { ErrorCodes } from "../util/error-codes";

export const AdminDatapackConfig = observer(function AdminDatapackConfig() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);
  const [rowPriorityUpdates, setRowPriorityUpdates] = useState<DatapackPriorityChangeRequest[]>([]);
  const [tempRowData, setTempRowData] = useState<BaseDatapackProps[] | null>(null);
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
        const newValue = parseInt(data.newValue ?? "");
        if (isNaN(newValue)) return false;
        setTempRowData(
          [
            ...[...(tempRowData || rowData)].filter((dp) => !compareExistingDatapacks(dp, data.data)),
            { ...data.data, priority: newValue }
          ].sort((a, b) => a.priority - b.priority)
        );
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
    { headerName: "Age Units", field: "ageUnits", flex: 0.5 },
    { headerName: "Description", field: "description", flex: 1 },
    { headerName: "Size", field: "size", flex: 0.5 },
    { headerName: "Format Version", field: "formatVersion", flex: 0.8 }
  ];
  // delete selected datapacks
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
  // debounce the update of datapack priority
  // update the priority of the datapacks on row drag
  async function onRowDragEnd(event: RowDragEndEvent<BaseDatapackProps>) {
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
    setTempRowData(updatedRowData);
    setRowPriorityUpdates(updatedNodes);
  }
  // update the priority of the datapacks on cell value change
  async function onCellValueChanged(event: CellValueChangedEvent<BaseDatapackProps>) {
    if (event.colDef.field === "priority") {
      event.api.stopEditing();
      const { data } = event;
      const updatedNodes: DatapackPriorityChangeRequest = toJS({
        id: data.title,
        uuid: "official",
        priority: data.priority
      });
      setRowPriorityUpdates([...rowPriorityUpdates.filter((node) => node.id !== updatedNodes.id), updatedNodes]);
    }
  }
  async function submitPriorityChanges() {
    try {
      await actions.adminUpdateDatapackPriority(rowPriorityUpdates);
      setRowPriorityUpdates([]);
      setTempRowData(null);
    } catch (e) {
      console.error(e);
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR)
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
        {/* {tempRowData && ( */}
          <TSCButton disabled={!tempRowData} onClick={async () => await submitPriorityChanges()}>Confirm Priority Changes</TSCButton>
        {/* )} */}
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
        containerStyle={{ outline: tempRowData ? "1px solid red" : "none" }}
        loading={state.admin.datapackPriorityLoading}
        rowDragManaged
        gridOptions={{
          onRowDragEnd,
          onCellValueChanged,
          getRowId: (params) => params.data.title
        }}
        rowMultiSelectWithClick
        rowData={tempRowData || rowData}
      />
    </Box>
  );
});
