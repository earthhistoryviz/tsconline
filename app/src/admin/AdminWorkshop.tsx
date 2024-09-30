import { Box, Dialog, useTheme, TextField, Typography, IconButton } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import React, { useContext, useState, useEffect } from "react";
import { context } from "../state";
import { ColDef } from "ag-grid-community";
import { TSCButton, InputFileUpload, CustomTooltip, TSCPopup, Lottie } from "../components";
import loader from "../assets/icons/loading.json";
import { ErrorCodes } from "../util/error-codes";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { DateTimePicker, renderTimeViewClock } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { SharedWorkshop } from "@tsconline/shared";
import { displayServerError } from "../state/actions/util-actions";
import EditIcon from "@mui/icons-material/Edit";
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
    setWorkshop: (workshop: SharedWorkshop) => void;
  };
  data: SharedWorkshop;
};
const ActionsCellRenderer: React.FC<ActionsCellRendererProps> = (props) => {
  const { setEditWorkshopFormOpen, setWorkshop } = props.context;
  const { data } = props;
  const handleClick = () => {
    setWorkshop(data);
    setEditWorkshopFormOpen(true);
  };
  return (
    <CustomTooltip title="Edit Workshop" enterDelay={800}>
      <IconButton onClick={handleClick}>
        <EditIcon />
      </IconButton>
    </CustomTooltip>
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
    valueFormatter: (params) => dayjs(params.value).format("MMMM D, YYYY [at] h:mm A")
  },
  {
    headerName: "Workshop End Date",
    field: "end",
    flex: 1,
    valueFormatter: (params) => dayjs(params.value).format("MMMM D, YYYY [at] h:mm A")
  },
  { headerName: "Active", field: "active", flex: 0.2, cellRenderer: checkboxRenderer },
  {
    headerName: "Actions",
    cellRenderer: ActionsCellRenderer,
    flex: 0.2,
    cellStyle: { textAlign: "center", border: "none" }
  }
];

export const AdminWorkshop = observer(function AdminWorkshop() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const [createWorkshopFormOpen, setCreateWorkshopFormOpen] = useState(false);
  const [editWorkshopFormOpen, setEditWorkshopFormOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [invalidEmails, setInvalidEmails] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [workshop, setWorkshop] = useState<SharedWorkshop | null>(null);
  const [workshopTitle, setWorkshopTitle] = useState("");
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [emails, setEmails] = useState<string>("");

  useEffect(() => {
    if (editWorkshopFormOpen && workshop) {
      setWorkshopTitle(workshop.title || "");
      setStartDate(dayjs(workshop.start));
      setEndDate(dayjs(workshop.end));
    }
  }, [editWorkshopFormOpen, workshop]);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      setLoading(true);
      event.preventDefault();
      if (!workshopTitle) {
        actions.pushError(ErrorCodes.INVALID_FORM);
        return;
      }
      if (!startDate || !endDate) {
        actions.pushError(ErrorCodes.INVALID_FORM);
        return;
      }
      const start = dayjs(startDate).toISOString();
      const end = dayjs(endDate).toISOString();
      if (dayjs(start).isAfter(dayjs(end))) {
        actions.pushError(ErrorCodes.ADMIN_WORKSHOP_START_AFTER_END);
        return;
      }
      let workshopId: number;
      if (createWorkshopFormOpen) {
        const createdWorkshopId = await actions.adminCreateWorkshop(workshopTitle, start, end);
        if (!createdWorkshopId) {
          actions.pushError(ErrorCodes.ADMIN_CREATE_WORKSHOP_FAILED);
          return;
        }
        workshopId = createdWorkshopId;
      } else {
        if (!workshop) {
          actions.pushError(ErrorCodes.ADMIN_WORKSHOP_NOT_FOUND);
          return;
        }
        workshopId = workshop.workshopId;
        const { title: oldTitle, start: oldStart, end: oldEnd } = workshop;
        const isWorkshopUnchanged = oldTitle === workshopTitle && oldStart === start && oldEnd === end;
        if (!isWorkshopUnchanged) {
          const editSuccess = await actions.adminEditWorkshop(workshop.workshopId, workshopTitle, start, end);
          if (!editSuccess) {
            return;
          }
        }
        if (isWorkshopUnchanged && !file && !emails) {
          actions.pushSnackbar("No changes made", "info");
          return;
        }
      }
      const verb = createWorkshopFormOpen ? "created" : "edited";
      if (file || emails) {
        const form = new FormData();
        if (emails) form.append("emails", emails);
        if (file) form.append("file", file);
        form.append("workshopId", workshopId.toString());
        const response = await actions.adminAddUsersToWorkshop(form);
        if (!response.success) {
          actions.pushSnackbar(`Workshop ${verb} successfully but users could not be added`, "warning");
          setInvalidEmails(response.invalidEmails);
          return;
        } else {
          actions.removeAllErrors();
          actions.pushSnackbar(`Workshop ${verb} successfully and users added succesfully`, "success");
        }
      } else {
        actions.removeAllErrors();
        actions.pushSnackbar(`Workshop ${verb} successfully`, "success");
      }
      handleDialogClose();
    } catch (error) {
      displayServerError(
        error,
        ErrorCodes.ADMIN_CREATE_WORKSHOP_FAILED,
        ErrorCodes[ErrorCodes.ADMIN_CREATE_WORKSHOP_FAILED]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0];
    if (!file) {
      return;
    }
    const ext = file.name.split(".").pop();
    if (
      file.type !== "application/vnd.ms-excel" && // for .xls files
      file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && // for .xlsx files
      file.type !== ""
    ) {
      actions.pushError(ErrorCodes.UNRECOGNIZED_EXCEL_FILE);
      return;
    }
    if (!ext || !/^(xlx|xlsx)$/.test(ext)) {
      actions.pushError(ErrorCodes.UNRECOGNIZED_EXCEL_FILE);
      return;
    }
    setFile(file);
  };

  const handleDialogClose = () => {
    setCreateWorkshopFormOpen(false);
    setEditWorkshopFormOpen(false);
    setWorkshopTitle("");
    setStartDate(null);
    setEndDate(null);
    setEmails("");
    setFile(null);
    setInvalidEmails("");
    setWorkshop(null);
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
        <TSCPopup
          open={!!invalidEmails}
          title="Please fix the following emails:"
          message={invalidEmails}
          onClose={() => setInvalidEmails("")}
          maxWidth="xs"
        />
        <Dialog open={createWorkshopFormOpen || editWorkshopFormOpen} onClose={handleDialogClose}>
          <Box textAlign="center" padding="10px">
            <Typography variant="h5" mb="5px">
              {createWorkshopFormOpen ? "Create Workshop" : "Edit Workshop"}
            </Typography>
            <Box
              component="form"
              gap="20px"
              display="flex"
              flexDirection="column"
              alignItems="center"
              onSubmit={handleFormSubmit}>
              <TextField
                label="Workshop Title"
                name="workshopTitle"
                placeholder="Enter a title for the workshop"
                fullWidth
                size="small"
                required
                value={workshopTitle}
                onChange={(event) => setWorkshopTitle(event.target.value)}
              />
              <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center" gap={5}>
                <DateTimePicker
                  label="Start Date"
                  name="startDate"
                  viewRenderers={{
                    hours: renderTimeViewClock,
                    minutes: renderTimeViewClock
                  }}
                  slotProps={{
                    textField: {
                      required: true,
                      size: "small"
                    },
                    popper: {
                      className: "date-time-picker",
                      sx: {
                        "& .MuiPaper-root": {
                          backgroundColor: theme.palette.secondaryBackground.main
                        }
                      }
                    }
                  }}
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  minDateTime={dayjs(workshop?.start).isBefore(dayjs()) ? dayjs(workshop?.start) : dayjs()}
                  disablePast={!editWorkshopFormOpen}
                />
                <DateTimePicker
                  label="End Date"
                  name="endDate"
                  viewRenderers={{
                    hours: renderTimeViewClock,
                    minutes: renderTimeViewClock
                  }}
                  slotProps={{
                    textField: {
                      required: true,
                      size: "small"
                    },
                    popper: {
                      className: "date-time-picker",
                      sx: {
                        "& .MuiPaper-root": {
                          backgroundColor: theme.palette.secondaryBackground.main
                        }
                      }
                    }
                  }}
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  disablePast
                />
              </Box>
              <Box textAlign="center" width="100%">
                <Typography variant="h5" mb="5px">
                  Add Users
                </Typography>
                <Box gap="20px" display="flex" flexDirection="column" alignItems="center">
                  <TextField
                    label="Paste Emails"
                    name="emails"
                    multiline
                    rows={5}
                    placeholder="Enter multiple emails, separated by commas"
                    size="small"
                    fullWidth
                    onChange={(event) => setEmails(event.target.value)}
                  />
                  <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center">
                    <InputFileUpload
                      text="Upload Excel File of Emails"
                      onChange={handleFileUpload}
                      accept=".xls,.xlsx"
                      startIcon={<CloudUploadIcon />}
                    />
                    <Typography ml="10px">{file?.name || "No file selected"}</Typography>
                  </Box>
                  <TSCButton type="submit">{createWorkshopFormOpen ? "Create Workshop" : "Confirm Selection"}</TSCButton>
                </Box>
                {loading && (
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    width="100%"
                    height="100%"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    bgcolor={theme.palette.mode === "dark" ? "rgba(26, 34, 45, 0.7)" : "rgba(255, 255, 255, 0.7)"}
                    zIndex={1}>
                    <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Dialog>
      </Box>
      <AgGridReact
        columnDefs={workshopColDefs}
        rowData={Array.from(state.admin.workshops.values())}
        components={{ ActionsCellRenderer }}
        context={{ setEditWorkshopFormOpen, setWorkshop }}
        rowSelection="single"
      />
    </Box>
  );
});
