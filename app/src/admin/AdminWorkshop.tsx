import { Box, useTheme, IconButton } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import React, { useContext, useState } from "react";
import { context } from "../state";
import { ColDef } from "ag-grid-community";
import { TSCButton, CustomTooltip, TSCYesNoPopup } from "../components";
import { ErrorCodes } from "../util/error-codes";
import { SharedWorkshop } from "@tsconline/shared";
import { displayServerError } from "../state/actions/util-actions";
import EditIcon from "@mui/icons-material/Edit";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { WorkshopForm, AddDatapacksForm } from "./AdminWorkshopComponents";
import { formatDate } from "../state/non-action-util";
import "./AdminWorkshop.css";

const checkboxRenderer = (params: { value: boolean }) => {
  if (params.value === true) {
    return <span className="ag-icon-tick" />;
  } else {
    return <span className="ag-icon-cross" />;
  }
};

type ActionsCellRendererProps = {
  context: {
    setEditWorkshopFormOpen: (open: boolean) => void;
    setDeleteWorkshopFormOpen: (open: boolean) => void;
    setAddDatapacksFormOpen: (open: boolean) => void;
    setWorkshop: (workshop: SharedWorkshop) => void;
  };
  data: SharedWorkshop;
};
const ActionsCellRenderer: React.FC<ActionsCellRendererProps> = (props) => {
  const { setEditWorkshopFormOpen, setDeleteWorkshopFormOpen, setAddDatapacksFormOpen, setWorkshop } = props.context;
  const { data } = props;
  const handleEditClick = () => {
    setWorkshop(data);
    setEditWorkshopFormOpen(true);
  };
  const handleDeleteClick = () => {
    setWorkshop(data);
    setDeleteWorkshopFormOpen(true);
  };
  const handleAddDatapacksClick = () => {
    setWorkshop(data);
    setAddDatapacksFormOpen(true);
  };
  return (
    <>
      <CustomTooltip title="Edit Workshop">
        <IconButton onClick={handleEditClick}>
          <EditIcon />
        </IconButton>
      </CustomTooltip>
      <CustomTooltip title="Add Datapacks">
        <IconButton onClick={handleAddDatapacksClick}>
          <AddCircleIcon />
        </IconButton>
      </CustomTooltip>
      <CustomTooltip title="Delete Workshop">
        <IconButton onClick={handleDeleteClick}>
          <DeleteForeverIcon />
        </IconButton>
      </CustomTooltip>
    </>
  );
};

const workshopColDefs: ColDef[] = [
  {
    headerName: "Workshop Title",
    field: "title",
    filter: true,
    flex: 1
  },
  {
    headerName: "Workshop Start Date",
    field: "start",
    flex: 1,
    valueFormatter: (params) => formatDate(params.value)
  },
  {
    headerName: "Workshop End Date",
    field: "end",
    flex: 1,
    valueFormatter: (params) => formatDate(params.value)
  },
  { headerName: "Active", field: "active", flex: 0.2, cellRenderer: checkboxRenderer },
  {
    headerName: "Actions",
    cellRenderer: ActionsCellRenderer,
    flex: 0.35,
    minWidth: 150,
    cellStyle: { border: "none" }
  }
];

export const AdminWorkshop = observer(function AdminWorkshop() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const [createWorkshopFormOpen, setCreateWorkshopFormOpen] = useState(false);
  const [editWorkshopFormOpen, setEditWorkshopFormOpen] = useState(false);
  const [deleteWorkshopFormOpen, setDeleteWorkshopFormOpen] = useState(false);
  const [addDatapacksFormOpen, setAddDatapacksFormOpen] = useState(false);
  const [workshop, setWorkshop] = useState<SharedWorkshop | null>(null);

  const handleDeleteWorkshop = async () => {
    try {
      if (!workshop) {
        actions.pushError(ErrorCodes.ADMIN_WORKSHOP_NOT_FOUND);
        return;
      }
      await actions.adminDeleteWorkshop(workshop.workshopId);
      setDeleteWorkshopFormOpen(false);
    } catch (error) {
      displayServerError(
        error,
        ErrorCodes.ADMIN_DELETE_WORKSHOP_FAILED,
        ErrorCodes[ErrorCodes.ADMIN_DELETE_WORKSHOP_FAILED]
      );
    }
  };

  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <Box display="flex" m="10px" gap="20px">
        <TSCButton
          onClick={() => {
            setCreateWorkshopFormOpen(true);
          }}>
          Create Workshop
        </TSCButton>
      </Box>
      <TSCYesNoPopup
        open={deleteWorkshopFormOpen}
        title="Are you sure you want to delete this workshop?"
        onYes={handleDeleteWorkshop}
        onClose={() => setDeleteWorkshopFormOpen(false)}
        onNo={() => setDeleteWorkshopFormOpen(false)}
      />
      {((editWorkshopFormOpen && workshop) || createWorkshopFormOpen) && (
        <WorkshopForm
          editMode={editWorkshopFormOpen}
          currentWorkshop={workshop}
          onClose={() => {
            setCreateWorkshopFormOpen(false);
            setEditWorkshopFormOpen(false);
            setWorkshop(null);
          }}
        />
      )}
      {workshop && addDatapacksFormOpen && (
        <AddDatapacksForm
          currentWorkshop={workshop}
          onClose={() => {
            setAddDatapacksFormOpen(false);
            setWorkshop(null);
          }}
        />
      )}
      <AgGridReact
        columnDefs={workshopColDefs}
        rowData={Array.from(state.admin.workshops.values())}
        components={{ ActionsCellRenderer }}
        context={{
          setEditWorkshopFormOpen,
          setDeleteWorkshopFormOpen,
          setAddDatapacksFormOpen,
          setWorkshop
        }}
        rowSelection="single"
      />
    </Box>
  );
});
