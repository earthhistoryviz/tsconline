import {
  Box,
  Dialog,
  useTheme,
  TextField,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  ListItemText,
  SelectChangeEvent,
  FormControl
} from "@mui/material";
import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { context } from "../state";
import { TSCButton, InputFileUpload, TSCPopup, Lottie, DatapackUploadForm } from "../components";
import loader from "../assets/icons/loading.json";
import { ErrorCodes } from "../util/error-codes";
import { DateTimePicker, renderTimeViewClock } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { SharedWorkshop, isOfficialDatapack } from "@tsconline/shared";
import { displayServerError } from "../state/actions/util-actions";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import "./AdminWorkshop.css";

type AddDatapacksFormProps = {
  currentWorkshop: SharedWorkshop;
  onClose: () => void;
};
export const AddDatapacksForm: React.FC<AddDatapacksFormProps> = observer(function AddDatapacksForm({
  currentWorkshop,
  onClose
}) {
  const { state, actions } = useContext(context);
  const [datapack, setDatapack] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploadDatapacks, setUploadDatapacks] = useState(false);
  const theme = useTheme();

  const handleDialogClose = () => {
    setDatapack("");
    setLoading(false);
    onClose();
  };

  const addServerDatapacks = async () => {
    setLoading(true);
    try {
      if (!datapack) {
        actions.pushError(ErrorCodes.INVALID_FORM);
        return;
      }
      await actions.adminAddServerDatapackToWorkshop(currentWorkshop.workshopId, datapack);
    } catch (error) {
      displayServerError(
        error,
        ErrorCodes.ADMIN_ADD_SERVER_DATAPACK_TO_WORKSHOP_FAILED,
        ErrorCodes[ErrorCodes.ADMIN_ADD_SERVER_DATAPACK_TO_WORKSHOP_FAILED]
      );
    } finally {
      setLoading(false);
    }
  };

  return !uploadDatapacks ? (
    <Dialog open={true} onClose={handleDialogClose} maxWidth="md">
      <Box textAlign="center" padding="10px">
        <Typography variant="h5" mb="5px">
          Add Datapacks to Workshop
        </Typography>
        <Box gap="20px" display="flex" alignItems="center">
          <Box display="flex" alignItems="center" gap={5}>
            <FormControl variant="outlined" sx={{ m: 1 }}>
              <InputLabel id="datapacks-label">Select Server Datapack</InputLabel>
              <Select
                className="datapack-select"
                name="datapack"
                label="Select Server Datapacks"
                labelId="datapacks-label"
                value={datapack}
                onChange={(event: SelectChangeEvent<typeof datapack>) => {
                  setDatapack(event.target.value as string);
                }}
                autoWidth>
                {Array.from(state.datapacks)
                  .filter((datapack) => isOfficialDatapack(datapack))
                  .map((datapack) => (
                    <MenuItem key={datapack.title} value={datapack.title}>
                      <ListItemText primary={datapack.title} />
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
          <Box display="flex" alignItems="flex-start" gap={1}>
            <TSCButton className="datapack-buttons" onClick={addServerDatapacks}>
              Add Datapack
            </TSCButton>
            <TSCButton className="datapack-buttons" onClick={() => setUploadDatapacks(true)}>
              Upload Datapack
            </TSCButton>
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
              <Lottie animationData={loader} autoplay loop width={200} height={100} speed={0.7} />
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  ) : (
    <Dialog open={true} onClose={() => setUploadDatapacks(false)} maxWidth={false}>
      <DatapackUploadForm
        close={() => setUploadDatapacks(false)}
        upload={actions.adminUploadDatapackToWorkshop}
        type={{ type: "workshop", uuid: `workshop-${currentWorkshop.workshopId}` }}
        forcePublic
      />
    </Dialog>
  );
});

type WorkshopFormProps = {
  editMode: boolean;
  currentWorkshop: SharedWorkshop | null;
  onClose: () => void;
};
export const WorkshopForm: React.FC<WorkshopFormProps> = observer(function WorkshopForm({
  editMode,
  currentWorkshop,
  onClose
}) {
  const theme = useTheme();
  const { actions } = useContext(context);
  const [loading, setLoading] = useState(false);
  const [workshop, setWorkshop] = useState<SharedWorkshop | null>(currentWorkshop);
  const [invalidEmails, setInvalidEmails] = useState<string>("");
  const [workshopTitle, setWorkshopTitle] = useState(editMode ? workshop?.title || "" : "");
  const [startDate, setStartDate] = useState<Dayjs | null>(editMode ? dayjs(workshop?.start) : null);
  const [endDate, setEndDate] = useState<Dayjs | null>(editMode ? dayjs(workshop?.end) : null);
  const [emails, setEmails] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const handleDialogClose = () => {
    setWorkshopTitle("");
    setStartDate(null);
    setEndDate(null);
    setEmails("");
    setFile(null);
    setWorkshop(null);
    onClose();
  };

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
      if (dayjs(start).isAfter(dayjs(end)) || dayjs(start).isSame(dayjs(end))) {
        actions.pushError(ErrorCodes.ADMIN_WORKSHOP_START_AFTER_END);
        return;
      }

      let workshopId: number;
      let edited = false;
      let created = false;

      if (!editMode) {
        const createdWorkshopId = await actions.adminCreateWorkshop(workshopTitle, start, end);
        if (!createdWorkshopId) {
          actions.pushError(ErrorCodes.ADMIN_CREATE_WORKSHOP_FAILED);
          return;
        }
        workshopId = createdWorkshopId;
        created = true;
      } else {
        if (!workshop) {
          actions.pushError(ErrorCodes.ADMIN_WORKSHOP_NOT_FOUND);
          return;
        }
        workshopId = workshop.workshopId;
        const { title: oldTitle, start: oldStart, end: oldEnd } = workshop;
        const updatedFields = {} as Partial<SharedWorkshop>;
        if (oldTitle !== workshopTitle) updatedFields.title = workshopTitle;
        if (oldStart !== start) updatedFields.start = start;
        if (oldEnd !== end) updatedFields.end = end;
        updatedFields.workshopId = workshopId;
        const isWorkshopUnchanged = Object.keys(updatedFields).length === 1;
        if (!isWorkshopUnchanged) {
          const newWorkshop = await actions.adminEditWorkshop(updatedFields);
          if (!newWorkshop) {
            return;
          }
          edited = true;
          setWorkshop(newWorkshop);
        }
        if (isWorkshopUnchanged && !file && !emails) {
          actions.pushSnackbar("No changes made", "info");
          return;
        }
      }

      if (file || emails) {
        const form = new FormData();
        if (emails) form.append("emails", emails);
        if (file) form.append("file", file);
        form.append("workshopId", workshopId.toString());
        const response = await actions.adminAddUsersToWorkshop(form);
        if (!response.success) {
          if (created || edited)
            actions.pushSnackbar(
              `Workshop ${created ? "created" : "edited"} successfully but users could not be added`,
              "warning"
            );
          setInvalidEmails(response.invalidEmails);
          if (created) handleDialogClose();
          return;
        } else {
          actions.removeAllErrors();
          let message = "";
          if (created || edited) {
            message = `Workshop ${created ? "created" : "edited"} successfully and users added`;
          } else {
            message = "Users added successfully";
          }
          actions.pushSnackbar(message, "success");
        }
      } else {
        actions.removeAllErrors();
        actions.pushSnackbar(`Workshop ${created ? "created" : "edited"} successfully`, "success");
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

  return (
    <>
      <TSCPopup
        open={!!invalidEmails}
        title="Please fix the following emails:"
        message={invalidEmails}
        onClose={() => setInvalidEmails("")}
        maxWidth="xs"
      />
      <Dialog open={true} onClose={handleDialogClose}>
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
        <Box textAlign="center" padding="10px">
          <Typography variant="h5" mb="5px">
            {editMode ? "Edit Workshop" : "Create Workshop"}
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
                disablePast={!editMode}
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
                  value={emails}
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
                <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center" gap="10px">
                  {editMode && (
                    <>
                      <TSCButton
                        onClick={() => {
                          setWorkshopTitle(workshop?.title || "");
                          setStartDate(dayjs(workshop?.start));
                          setEndDate(dayjs(workshop?.end));
                          setEmails("");
                          setFile(null);
                        }}>
                        Reset Form
                      </TSCButton>
                    </>
                  )}
                  <TSCButton type="submit">{editMode ? "Confirm Selection" : "Create Workshop"}</TSCButton>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </>
  );
});
