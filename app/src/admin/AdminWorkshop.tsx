import { Box, Dialog, useTheme, TextField, Typography, IconButton } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import React, { useContext, useState } from "react";
import { context } from "../state";
import { ColDef } from "ag-grid-community";
import { TSCButton, InputFileUpload, CustomTooltip, TSCPopup, Lottie } from "../components";
import loader from "../assets/icons/loading.json";
import { ErrorCodes } from "../util/error-codes";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { DateTimePicker, renderTimeViewClock } from "@mui/x-date-pickers";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import dayjs from "dayjs";
import { Workshop } from "@tsconline/shared";
import "./AdminWorkshop.css";

type AddUsersCellRendererProps = {
  context: {
    setAddUsersFormOpen: (open: boolean) => void;
    setWorkshopId: (workshopId: number) => void;
  };
  data: Workshop;
};
const AddUsersCellRenderer: React.FC<AddUsersCellRendererProps> = (props) => {
  const { setAddUsersFormOpen, setWorkshopId } = props.context;
  const { data } = props;
  const handleClick = () => {
    setAddUsersFormOpen(true);
    setWorkshopId(data.workshopId);
  };
  return (
    <CustomTooltip title="Add Users" enterDelay={800}>
      <IconButton onClick={handleClick}>
        <GroupAddIcon />
      </IconButton>
    </CustomTooltip>
  );
};

type AddUsersFormProps = {
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  file: File | null;
  loading: boolean;
};
const AddUsersForm: React.FC<AddUsersFormProps> = observer(({ handleFileUpload, file, loading }) => {
  return (
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
        <TSCButton type="submit">Submit</TSCButton>
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
          bgcolor="rgba(255, 255, 255, 0.7)"
          zIndex={1}>
          <Lottie animationData={loader} autoplay loop width={200} height={200} speed={0.7} />
        </Box>
      )}
    </Box>
  );
});

const workshopColDefs: ColDef[] = [
  {
    headerName: "Workshop Title",
    field: "title",
    filter: true,
    flex: 1
  },
  { headerName: "Workshop Start Date", field: "start", flex: 1 },
  { headerName: "Workshop End Date", field: "end", flex: 1 },
  {
    headerName: "Actions",
    cellRenderer: AddUsersCellRenderer,
    width: 100,
    cellStyle: { textAlign: "center", border: "none" }
  }
];

export const AdminWorkshop = observer(function AdminWorkshop() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const [addUsersFormOpen, setAddUsersFormOpen] = useState(false);
  const [createWorkshopFormOpen, setCreateWorkshopFormOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [invalidEmails, setInvalidEmails] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [workshopId, setWorkshopId] = useState<number | null>(null);
  const handleAddUsersSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      setLoading(true);
      event.preventDefault();
      if (!workshopId) {
        actions.pushError(ErrorCodes.ADMIN_ADD_USERS_TO_WORKSHOP_FAILED);
        return;
      }
      const response = await handleAddUsers(new FormData(event.currentTarget), workshopId);
      if (!response.success) {
        setInvalidEmails(response.invalidEmails);
      } else {
        actions.pushSnackbar("Users added successfully to workshop", "success");
        setAddUsersFormOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };
  const handleCreateWorkshopSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      setLoading(true);
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const title = form.get("workshopTitle")?.toString();
      if (!title) {
        actions.pushError(ErrorCodes.INVALID_FORM);
        return;
      }
      const startDate = form.get("startDate")?.toString();
      const endDate = form.get("endDate")?.toString();
      if (!startDate || !endDate) {
        actions.pushError(ErrorCodes.INVALID_FORM);
        return;
      }
      const start = dayjs(startDate).format("YYYY-MM-DD HH:mm");
      const end = dayjs(endDate).format("YYYY-MM-DD HH:mm");
      if (dayjs(start).isAfter(dayjs(end))) {
        actions.pushError(ErrorCodes.ADMIN_WORKSHOP_START_AFTER_END);
        return;
      }
      const password = form.get("password")?.toString();
      const createdWorkshopId = await actions.adminCreateWorkshop(title, start, end, password);
      if (!createdWorkshopId) {
        return;
      }
      if (file || form.get("emails")) {
        const response = await handleAddUsers(form, createdWorkshopId);
        if (!response.success) {
          actions.pushSnackbar("Workshop created successfully but users could not be added", "warning");
          setInvalidEmails(response.invalidEmails);
          return;
        } else {
          actions.pushSnackbar("Workshop created succesfully and users added succesfully", "success");
        }
      } else {
        actions.pushSnackbar("Workshop created successfully", "success");
      }
      setCreateWorkshopFormOpen(false);
    } finally {
      setLoading(false);
    }
  };
  const handleAddUsers = async (
    form: FormData,
    workshopId: number
  ): Promise<{ success: boolean; invalidEmails: string }> => {
    const emails = form.get("emails")?.toString();
    if (!emails && !file) {
      actions.pushError(ErrorCodes.ADMIN_WORKSHOP_FIELDS_EMPTY);
      return { success: false, invalidEmails: "" };
    }
    if (file) form.append("file", file);
    form.append("workshopId", workshopId.toString());
    const response = await actions.adminAddUsersToWorkshop(form);
    setFile(null);
    return response;
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
        <Dialog open={createWorkshopFormOpen} onClose={() => setCreateWorkshopFormOpen(false)}>
          <Box textAlign="center" padding="10px">
            <Typography variant="h5" mb="5px">
              Create Workshop
            </Typography>
            <Box
              component="form"
              gap="20px"
              display="flex"
              flexDirection="column"
              alignItems="center"
              onSubmit={handleCreateWorkshopSubmit}>
              <TextField
                label="Workshop Title"
                name="workshopTitle"
                placeholder="Enter a title for the workshop"
                fullWidth
                size="small"
                required
              />
              <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center" gap={5}>
                <DateTimePicker
                  label="Start Date"
                  name="startDate"
                  viewRenderers={{
                    hours: renderTimeViewClock,
                    minutes: renderTimeViewClock
                  }}
                  disablePast
                  slotProps={{
                    textField: {
                      required: true,
                      size: "small"
                    },
                    popper: { className: "date-time-picker" }
                  }}
                />
                <DateTimePicker
                  label="End Date"
                  name="endDate"
                  viewRenderers={{
                    hours: renderTimeViewClock,
                    minutes: renderTimeViewClock
                  }}
                  disablePast
                  slotProps={{
                    textField: {
                      required: true,
                      size: "small"
                    },
                    popper: { className: "date-time-picker" }
                  }}
                />
              </Box>
              <TextField
                label="Password"
                name="password"
                placeholder="Enter a password for the workshop"
                fullWidth
                size="small"
              />
              <AddUsersForm handleFileUpload={handleFileUpload} file={file} loading={loading} />
            </Box>
          </Box>
        </Dialog>
        <Dialog open={addUsersFormOpen} onClose={() => setAddUsersFormOpen(false)} fullWidth>
          <Box component="form" onSubmit={handleAddUsersSubmit} padding="10px">
            <AddUsersForm handleFileUpload={handleFileUpload} file={file} loading={loading} />
          </Box>
        </Dialog>
      </Box>
      <AgGridReact
        columnDefs={workshopColDefs}
        rowData={Array.from(state.admin.workshops.values())}
        components={{ AddUsersCellRenderer }}
        context={{ setAddUsersFormOpen, setWorkshopId }}
        rowSelection="single"
      />
    </Box>
  );
});
