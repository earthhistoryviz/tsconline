import { Autocomplete, Box, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField, Typography, useTheme } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { useContext, useRef, useState } from "react";
import { context } from "../state";
import { ColDef, RowDragEndEvent, ValueSetterParams } from "ag-grid-community";
import { DatapackUploadForm, TSCButton, TSCSwitch } from "../components";
import {
  DatapackMetadata,
  DatapackPriorityChangeRequest,
  MAX_AUTHORED_BY_LENGTH,
  MAX_DATAPACK_CONTACT_LENGTH,
  MAX_DATAPACK_DESC_LENGTH,
  MAX_DATAPACK_NOTES_LENGTH,
  MAX_DATAPACK_TAGS_ALLOWED,
  MAX_DATAPACK_TAG_LENGTH,
  MAX_DATAPACK_TITLE_LENGTH,
  assertDatapackMetadata
} from "@tsconline/shared";
import { compareExistingDatapacks, formatDateForDatapack, getPublicOfficialDatapacksMetadata, groupOfficialDatapacks } from "../state/non-action-util";
import { pushError } from "../state/actions";
import { ErrorCodes } from "../util/error-codes";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";

type EditableAdminDatapack = {
  title: string;
  isPublic: boolean;
  authoredBy: string;
  description: string;
  date: Dayjs | null;
  tags: string[];
  contact: string;
  notes: string;
  priority: number;
};

type AdminHeaderRow = {
  kind: "header";
  id: string;
  title: string;
  officialHeaderOrder: number;
};

type AdminDatapackRow = DatapackMetadata & {
  kind: "datapack";
};

type AdminGridRow = AdminHeaderRow | AdminDatapackRow;

function isHeaderRow(row: AdminGridRow): row is AdminHeaderRow {
  return row.kind === "header";
}

function isDatapackRow(row: AdminGridRow): row is AdminDatapackRow {
  return row.kind === "datapack";
}

function isDatapackRowOrUndefined(row: AdminGridRow | undefined): row is AdminDatapackRow {
  return !!row && row.kind === "datapack";
}

function isHeaderRowOrUndefined(row: AdminGridRow | undefined): row is AdminHeaderRow {
  return !!row && row.kind === "header";
}

function getHeaderTitles(rows: AdminGridRow[]): string[] {
  return rows.filter(isHeaderRow).map((row) => row.title);
}

function buildPriorityUpdates(datapacks: DatapackMetadata[]): DatapackPriorityChangeRequest[] {
  return datapacks.map((datapack, index) => ({
    id: datapack.title,
    uuid: "official",
    priority: index + 1
  }));
}

function getGroupTitle(group: ReturnType<typeof groupOfficialDatapacks>[number], t: (key: string) => string) {
  return group.subgroup ? t(`settings.datapacks.official-subgroup.${group.subgroup}`) : group.label;
}

function buildGridRows(datapacks: DatapackMetadata[], t: (key: string) => string, persistedHeaderTitles: string[] = []): AdminGridRow[] {
  const rows: AdminGridRow[] = [];
  const groups = groupOfficialDatapacks(datapacks);
  const groupedByTitle = new Map(groups.map((group) => [getGroupTitle(group, t), group] as const));
  const usedTitles = new Set<string>();

  persistedHeaderTitles.forEach((title, index) => {
    rows.push({
      kind: "header",
      id: `header-persisted-${index}-${title}`,
      title,
      officialHeaderOrder: index + 1
    });
    const matchingGroup = groupedByTitle.get(title);
    if (matchingGroup) {
      usedTitles.add(title);
      matchingGroup.datapacks.forEach((datapack) => {
        rows.push({
          ...datapack,
          kind: "datapack"
        });
      });
    }
  });

  groups
    .filter((group) => !usedTitles.has(getGroupTitle(group, t)))
    .forEach((group, index) => {
      const title = getGroupTitle(group, t);
      rows.push({
        kind: "header",
        id: `header-${group.subgroup ?? group.label}-${persistedHeaderTitles.length + index}`,
        title,
        officialHeaderOrder: persistedHeaderTitles.length + index + 1
      });
      group.datapacks.forEach((datapack) => {
        rows.push({
          ...datapack,
          kind: "datapack"
        });
      });
    });
  return rows;
}

function rowsToDatapacks(rows: AdminGridRow[]): DatapackMetadata[] {
  const nextDatapacks: DatapackMetadata[] = [];
  let currentHeader: AdminHeaderRow | null = null;
  let headerOrder = 0;
  for (const row of rows) {
    if (isHeaderRow(row)) {
      headerOrder += 1;
      currentHeader = { ...row, officialHeaderOrder: headerOrder };
      continue;
    }
    nextDatapacks.push({
      ...row,
      priority: nextDatapacks.length + 1,
      officialHeader: currentHeader?.title,
      officialHeaderOrder: currentHeader?.officialHeaderOrder
    });
  }
  return nextDatapacks;
}

export const AdminDatapackConfig = observer(function AdminDatapackConfig() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedHeaderCount, setSelectedHeaderCount] = useState(0);
  const [editableDatapack, setEditableDatapack] = useState<EditableAdminDatapack | null>(null);
  const [newHeaderTitle, setNewHeaderTitle] = useState("");
  const [tempRows, setTempRows] = useState<AdminGridRow[] | null>(null);

  const officialDatapacks = getPublicOfficialDatapacksMetadata(state.datapackMetadata).filter(
    (item) => !["Treatise", "Lexicon Formations"].some((tag) => item.tags.includes(tag))
  );
  const rowData = buildGridRows(
    officialDatapacks,
    t,
    state.admin.datapackConfig.tempHeaderTitles ?? state.admin.datapackConfig.headerTitles
  );
  const currentRows = tempRows || rowData;
  const gridRef = useRef<AgGridReact<AdminGridRow>>(null);

  const datapackColDefs: ColDef[] = [
    {
      headerName: "Priority",
      editable: true,
      field: "priority",
      flex: 0.5,
      rowDrag: true,
      valueSetter: (data: ValueSetterParams<AdminGridRow, string>) => {
        if (!data.data || isHeaderRow(data.data) || data.newValue === undefined) return false;
        const newValue = parseInt(data.newValue ?? "", 10);
        if (Number.isNaN(newValue)) return false;
        const reorderedDatapacks = rowsToDatapacks(currentRows)
          .map((datapack) => (datapack.title === data.data.title ? { ...datapack, priority: newValue } : datapack))
          .sort((a, b) => a.priority - b.priority)
          .map((datapack, index) => ({ ...datapack, priority: index + 1 }));
        const nextRows = buildGridRows(reorderedDatapacks, t);
        setTempRows(nextRows);
        actions.setAdminDatapackConfigTempRowData(reorderedDatapacks);
        actions.setAdminRowPriorityUpdates(buildPriorityUpdates(reorderedDatapacks));
        actions.setAdminTempHeaderTitles(getHeaderTitles(nextRows));
        return true;
      }
    },
    {
      headerName: "Title",
      field: "title",
      sortable: true,
      filter: true,
      flex: 1.2,
      checkboxSelection: (params) => isDatapackRow(params.data)
    },
    {
      headerName: "Type",
      field: "kind",
      flex: 0.5,
      valueFormatter: ({ data }) => (isHeaderRow(data) ? "Header" : "Datapack")
    },
    {
      headerName: "Public",
      field: "isPublic",
      flex: 0.5,
      valueFormatter: ({ data }) => (isDatapackRow(data) ? (data.isPublic ? "Yes" : "No") : "")
    },
    {
      headerName: "Header",
      field: "officialHeader",
      flex: 0.9,
      valueFormatter: ({ data }) => (isDatapackRow(data) ? data.officialHeader || "Unassigned" : "")
    },
    { headerName: "File Name", field: "originalFileName", flex: 1, sortable: true, filter: true, valueFormatter: ({ data }) => (isDatapackRow(data) ? data.originalFileName : "") },
    { headerName: "Description", field: "description", flex: 1, valueFormatter: ({ data }) => (isDatapackRow(data) ? data.description : "") }
  ];

  const deleteDatapacks = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes?.length) return;
    try {
      const datapacks = selectedNodes
        .map((node) => node.data)
        .filter(isDatapackRowOrUndefined)
        .map((datapack) => {
          assertDatapackMetadata(datapack);
          return datapack;
        });
      if (datapacks.length === 0) return;
      await actions.adminDeleteOfficialDatapacks(datapacks);
    } catch (e) {
      console.error(e);
    }
  };

  const openEditDialog = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    const selectedDatapacks = selectedNodes.map((node) => node.data).filter(isDatapackRowOrUndefined);
    
    if (selectedDatapacks.length !== 1) return;
    const datapack = selectedDatapacks[0];
    setEditableDatapack({
      title: datapack.title,
      isPublic: datapack.isPublic,
      authoredBy: datapack.authoredBy,
      description: datapack.description,
      date: datapack.date ? dayjs(datapack.date) : null,
      tags: datapack.tags,
      contact: datapack.contact ?? "",
      notes: datapack.notes ?? "",
      priority: datapack.priority
    });
    setEditOpen(true);
  };

  const addHeaderRow = () => {
    const title = newHeaderTitle.trim();
    if (!title) return;
    const baseRows = tempRows || rowData;
    const nextHeader: AdminHeaderRow = {
      kind: "header",
      id: `header-custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      officialHeaderOrder: baseRows.filter(isHeaderRow).length + 1
    };
    const nextRows = [...baseRows, nextHeader];
    const nextDatapacks = rowsToDatapacks(nextRows);
    setTempRows(nextRows);
    setNewHeaderTitle("");
    actions.setAdminDatapackConfigTempRowData(nextDatapacks);
    actions.setAdminRowPriorityUpdates(buildPriorityUpdates(nextDatapacks));
    actions.setAdminTempHeaderTitles(getHeaderTitles(nextRows));
  };

  const deleteSelectedHeaders = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    const selectedHeaders = selectedNodes.map((node) => node.data).filter(isHeaderRowOrUndefined);
    if (selectedHeaders.length === 0) return;

    const selectedHeaderIds = new Set(selectedHeaders.map((header) => header.id));
    const fallbackHeaderTitle = "Other";
    const baseRows = tempRows || rowData;
    let fallbackHeaderFound = false;
    const nextRows: AdminGridRow[] = [];
    let currentHeaderDeleted = false;

    for (const row of baseRows) {
      if (isHeaderRow(row)) {
        currentHeaderDeleted = selectedHeaderIds.has(row.id);
        if (!currentHeaderDeleted) {
          if (row.title === fallbackHeaderTitle) fallbackHeaderFound = true;
          nextRows.push(row);
        }
        continue;
      }

      if (currentHeaderDeleted) {
        if (!fallbackHeaderFound) {
          nextRows.push({
            kind: "header",
            id: `header-fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: fallbackHeaderTitle,
            officialHeaderOrder: 0
          });
          fallbackHeaderFound = true;
        }
        const fallbackIndex = nextRows.findIndex((candidate) => isHeaderRow(candidate) && candidate.title === fallbackHeaderTitle);
        nextRows.splice(fallbackIndex + 1, 0, row);
      } else {
        nextRows.push(row);
      }
    }

    const dedupedRows: AdminGridRow[] = [];
    const seenHeaderTitles = new Set<string>();
    for (const row of nextRows) {
      if (isHeaderRow(row)) {
        if (seenHeaderTitles.has(row.title)) continue;
        seenHeaderTitles.add(row.title);
      }
      dedupedRows.push(row);
    }

    const nextDatapacks = rowsToDatapacks(dedupedRows);
    setTempRows(dedupedRows);
    actions.setAdminDatapackConfigTempRowData(nextDatapacks);
    actions.setAdminRowPriorityUpdates(buildPriorityUpdates(nextDatapacks));
    actions.setAdminTempHeaderTitles(getHeaderTitles(dedupedRows));
  };

  async function onRowDragEnd(event: RowDragEndEvent<AdminGridRow>) {
    const api = event.api;
    const displayedRows: AdminGridRow[] = [];
    for (let index = 0; index < api.getDisplayedRowCount(); index++) {
      const rowNode = api.getDisplayedRowAtIndex(index);
      if (rowNode?.data) displayedRows.push(rowNode.data);
    }
    const nextDatapacks = rowsToDatapacks(displayedRows);
    setTempRows(displayedRows);
    actions.setAdminDatapackConfigTempRowData(nextDatapacks);
    actions.setAdminRowPriorityUpdates(buildPriorityUpdates(nextDatapacks));
    actions.setAdminTempHeaderTitles(getHeaderTitles(displayedRows));
  }

  async function submitPriorityChanges() {
    try {
      const saved = await actions.adminSaveOfficialDatapackConfig();
      if (saved) {
        setTempRows(null);
      }
    } catch (e) {
      console.error(e);
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  }

  async function saveDatapackEdit() {
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    const selectedDatapacks = selectedNodes.map((node) => node.data).filter(isDatapackRowOrUndefined);
    if (selectedDatapacks.length !== 1 || !editableDatapack) return;
    const originalDatapack = selectedDatapacks[0];
    const updatedDatapack = await actions.adminEditOfficialDatapack(
      originalDatapack,
      {
        title: editableDatapack.title,
        isPublic: editableDatapack.isPublic,
        authoredBy: editableDatapack.authoredBy,
        description: editableDatapack.description,
        priority: editableDatapack.priority,
        tags: editableDatapack.tags,
        ...(editableDatapack.contact.trim() ? { contact: editableDatapack.contact.trim() } : { contact: "" }),
        ...(editableDatapack.notes.trim() ? { notes: editableDatapack.notes.trim() } : { notes: "" }),
        ...(editableDatapack.date ? { date: formatDateForDatapack(editableDatapack.date) } : { date: "" })
      }
    );
    if (!updatedDatapack) return;
    setEditOpen(false);
    setEditableDatapack(null);
    actions.resetAdminConfigTempState();
    setTempRows(null);
  }

  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <Box display="flex" m="10px" gap="20px" flexWrap="wrap">
        <TSCButton onClick={() => setFormOpen(!formOpen)}>Upload Datapack</TSCButton>
        <Box display="flex" gap="10px" alignItems="center">
          <TextField
            size="small"
            label="New Header"
            value={newHeaderTitle}
            onChange={(event) => setNewHeaderTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addHeaderRow();
              }
            }}
          />
          <TSCButton disabled={!newHeaderTitle.trim()} onClick={addHeaderRow}>
            Add Header
          </TSCButton>
        </Box>
        <TSCButton disabled={selectedCount !== 1} onClick={openEditDialog}>
          Edit Selected Datapack
        </TSCButton>
        <TSCButton disabled={selectedHeaderCount === 0} onClick={deleteSelectedHeaders}>
          Delete Selected Headers
        </TSCButton>
        <TSCButton onClick={deleteDatapacks}>Delete Selected Datapacks</TSCButton>
        <TSCButton disabled={!tempRows} onClick={async () => await submitPriorityChanges()}>
          Confirm Order Changes
        </TSCButton>
        <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth={false}>
          <DatapackUploadForm close={() => setFormOpen(false)} upload={actions.adminUploadOfficialDatapack} type={{ type: "official" }} />
        </Dialog>
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Edit Official Datapack</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap="16px" pt="8px">
              <TextField
                label="Datapack Name"
                value={editableDatapack?.title ?? ""}
                inputProps={{ maxLength: MAX_DATAPACK_TITLE_LENGTH }}
                onChange={(event) => setEditableDatapack((current) => (current ? { ...current, title: event.target.value } : current))}
                fullWidth
              />
              <TextField
                label="Authored By"
                value={editableDatapack?.authoredBy ?? ""}
                inputProps={{ maxLength: MAX_AUTHORED_BY_LENGTH }}
                onChange={(event) =>
                  setEditableDatapack((current) => (current ? { ...current, authoredBy: event.target.value } : current))
                }
                fullWidth
              />
              <TextField
                label="Datapack Description"
                value={editableDatapack?.description ?? ""}
                multiline
                minRows={4}
                inputProps={{ maxLength: MAX_DATAPACK_DESC_LENGTH }}
                onChange={(event) =>
                  setEditableDatapack((current) => (current ? { ...current, description: event.target.value } : current))
                }
                fullWidth
              />
              <DatePicker
                value={editableDatapack?.date ?? null}
                maxDate={dayjs()}
                onChange={(value) => setEditableDatapack((current) => (current ? { ...current, date: value } : current))}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                limitTags={MAX_DATAPACK_TAGS_ALLOWED}
                value={editableDatapack?.tags ?? []}
                onChange={(_, value) =>
                  setEditableDatapack((current) => (current ? { ...current, tags: value } : current))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags"
                    inputProps={{ ...params.inputProps, maxLength: MAX_DATAPACK_TAG_LENGTH }}
                  />
                )}
              />
              <FormControlLabel
                control={
                  <TSCSwitch
                    checked={editableDatapack?.isPublic ?? false}
                    onChange={(event) =>
                      setEditableDatapack((current) => (current ? { ...current, isPublic: event.target.checked } : current))
                    }
                  />
                }
                label="Public datapack"
              />
              <TextField
                label="Priority"
                type="number"
                value={editableDatapack?.priority ?? 0}
                inputProps={{ min: 0, max: 100 }}
                onChange={(event) =>
                  setEditableDatapack((current) =>
                    current ? { ...current, priority: Number(event.target.value || 0) } : current
                  )
                }
                fullWidth
              />
              <TextField
                label="Contact"
                value={editableDatapack?.contact ?? ""}
                inputProps={{ maxLength: MAX_DATAPACK_CONTACT_LENGTH }}
                onChange={(event) =>
                  setEditableDatapack((current) => (current ? { ...current, contact: event.target.value } : current))
                }
                fullWidth
              />
              <TextField
                label="Notes"
                value={editableDatapack?.notes ?? ""}
                multiline
                minRows={3}
                inputProps={{ maxLength: MAX_DATAPACK_NOTES_LENGTH }}
                onChange={(event) =>
                  setEditableDatapack((current) => (current ? { ...current, notes: event.target.value } : current))
                }
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <TSCButton onClick={() => setEditOpen(false)}>Cancel</TSCButton>
            <TSCButton onClick={async () => await saveDatapackEdit()}>Save Changes</TSCButton>
          </DialogActions>
        </Dialog>
      </Box>
      <Typography variant="body2" sx={{ mx: 2, mb: 1, opacity: 0.75 }}>
        Headers are draggable rows in this list. They are not editable datapacks, but moving a datapack under a header assigns it to that header.
      </Typography>
      <AgGridReact
        ref={gridRef}
        columnDefs={datapackColDefs}
        rowSelection="multiple"
        containerStyle={{ outline: tempRows ? "1px solid red" : "none" }}
        loading={state.admin.datapackPriorityLoading}
        rowDragManaged
        suppressMoveWhenRowDragging={false}
        rowClassRules={{
          "ag-row-selected-header": (params) => isHeaderRow(params.data),
          "ag-row-selected-header-dark": () => false
        }}
        getRowStyle={(params) =>
          isHeaderRow(params.data)
            ? {
                fontWeight: 700,
                backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"
              }
            : undefined
        }
        gridOptions={{
          onRowDragEnd,
          getRowId: (params) => (isHeaderRow(params.data) ? params.data.id : params.data.title)
        }}
        onSelectionChanged={() =>
          {
            const selectedRows = (gridRef.current?.api.getSelectedNodes() || []).map((node) => node.data);
            setSelectedCount(selectedRows.filter(isDatapackRowOrUndefined).length);
            setSelectedHeaderCount(selectedRows.filter(isHeaderRowOrUndefined).length);
          }
        }
        rowMultiSelectWithClick
        rowData={currentRows}
      />
    </Box>
  );
});
