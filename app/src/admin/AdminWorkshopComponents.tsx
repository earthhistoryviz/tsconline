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
  Avatar,
  FormControl
} from "@mui/material";
import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { context } from "../state";
import {
  TSCButton,
  InputFileUpload,
  TSCPopup,
  DatapackUploadForm,
  TSCDialogLoader,
  CustomDivider
} from "../components";
import { ErrorCodes } from "../util/error-codes";
import { DateTimePicker, renderTimeViewClock } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { SharedWorkshop, isOfficialDatapack } from "@tsconline/shared";
import { displayServerError } from "../state/actions/util-actions";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import "./AdminWorkshop.css";

type AddDatapacksToWorkshopFormProps = {
  currentWorkshop: SharedWorkshop;
  onClose: () => void;
};
export const AddDatapacksToWorkshopForm: React.FC<AddDatapacksToWorkshopFormProps> = observer(
  function AddDatapacksToWorkshopForm({ currentWorkshop, onClose }) {
    const { state, actions } = useContext(context);
    const [datapack, setDatapack] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [uploadDatapacks, setUploadDatapacks] = useState(false);

    const handleDialogClose = () => {
      setDatapack("");
      setLoading(false);
      onClose();
    };

    const addOfficialDatapacks = async () => {
      setLoading(true);
      try {
        if (!datapack) {
          actions.pushError(ErrorCodes.INVALID_FORM);
          return;
        }
        await actions.adminAddOfficialDatapackToWorkshop(currentWorkshop.workshopId, datapack);
      } catch (error) {
        displayServerError(
          error,
          ErrorCodes.ADMIN_ADD_OFFICIAL_DATAPACK_TO_WORKSHOP_FAILED,
          ErrorCodes[ErrorCodes.ADMIN_ADD_OFFICIAL_DATAPACK_TO_WORKSHOP_FAILED]
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
                <InputLabel id="datapacks-label">Select Official Datapack</InputLabel>
                <Select
                  className="datapack-select"
                  name="datapack"
                  label="Select Official Datapacks"
                  labelId="datapacks-label"
                  value={datapack}
                  onChange={(event: SelectChangeEvent<typeof datapack>) => {
                    setDatapack(event.target.value as string);
                  }}
                  autoWidth>
                  {Array.from(state.datapackMetadata)
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
              <TSCButton className="datapack-buttons" onClick={addOfficialDatapacks}>
                Add Datapack
              </TSCButton>
              <TSCButton className="datapack-buttons" onClick={() => setUploadDatapacks(true)}>
                Upload Datapack
              </TSCButton>
            </Box>
            {loading && <TSCDialogLoader open={loading} headerText="Adding Datapack" />}
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
  }
);

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
  const { actions, state } = useContext(context);
  const [loading, setLoading] = useState(false);
  const [workshop, setWorkshop] = useState<SharedWorkshop | null>(currentWorkshop);
  const [invalidEmails, setInvalidEmails] = useState<string>("");
  const [workshopTitle, setWorkshopTitle] = useState(editMode ? workshop?.title || "" : "");
  const [startDate, setStartDate] = useState<Dayjs | null>(editMode ? dayjs(workshop?.start) : null);
  const [endDate, setEndDate] = useState<Dayjs | null>(editMode ? dayjs(workshop?.end) : null);
  const [emails, setEmails] = useState<string>("");
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[] | null>(null);
  const [coverPicture, setCoverPicture] = useState<File | null>(null);
  const [regLink, setRegLink] = useState<string | undefined>(undefined);
  const [regRestrict, setRegRestrict] = useState(false);

  const handleDialogClose = () => {
    setWorkshopTitle("");
    setStartDate(null);
    setEndDate(null);
    setEmails("");
    setEmailFile(null);
    setFiles(null);
    setWorkshop(null);
    onClose();
  };
  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      setLoading(true);
      event.preventDefault();
      const errorMessages: string[] = [];

      if (!workshopTitle) {
        console.log("here");
        actions.pushError(ErrorCodes.INVALID_FORM);
        return;
      }
      if (!startDate || !endDate) {
        console.log("here");
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
        const createdWorkshopId = await actions.adminCreateWorkshop(
          workshopTitle,
          start,
          end,
          regRestrict,
          state.user.uuid,
          regLink
        );
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
        if (new Date(workshop.end) <= new Date()) {
          actions.pushError(ErrorCodes.ADMIN_WORKSHOP_ENDED);
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
            actions.pushError(ErrorCodes.ADMIN_WORKSHOP_EDIT_FAILED);
            return;
          }
          edited = true;
          setWorkshop(newWorkshop);
        }

        if (
          isWorkshopUnchanged &&
          !emailFile &&
          !emails &&
          !regLink &&
          !files &&
          !coverPicture &&
          regRestrict === currentWorkshop?.regRestrict
        ) {
          actions.pushSnackbar("No changes made.", "info");
          return;
        }
      }

      if (emailFile || emails) {
        const form = new FormData();
        if (emails) form.append("emails", emails);
        if (emailFile) form.append("file", emailFile);
        form.append("workshopId", workshopId.toString());
        const response = await actions.adminAddUsersToWorkshop(form);
        if (!response.success) {
          errorMessages.push("Users could not be added.");
          setInvalidEmails(response.invalidEmails);
        }
      }

      if (coverPicture) {
        const response = await actions.adminAddCoverPicToWorkshop(workshopId, coverPicture);
        if (!response) {
          errorMessages.push("Cover picture could not be uploaded.");
        }
      }

      if (files && files.length !== 0) {
        const response = await actions.adminAddFilesToWorkshop(workshopId, files);
        if (!response) {
          errorMessages.push("Files could not be uploaded.");
        }
      }

      if (errorMessages.length > 0) {
        actions.pushSnackbar(errorMessages.join(" "), "warning");
      }
      const successMessage = created ? "Workshop created successfully." : edited ? "Workshop edited successfully." : "";

      if (successMessage.length > 0 && errorMessages.length == 0) {
        actions.pushSnackbar(successMessage, "success");
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

  const handleEmailFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    setEmailFile(file);
  };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) {
      return;
    }

    const filesArray = Array.from(uploadedFiles);

    setFiles((prevFiles) => {
      const fileMap = new Map<string, File>();
      let duplicated = false;

      prevFiles?.forEach((file) => fileMap.set(file.name, file));

      filesArray.forEach((file) => {
        if (fileMap.has(file.name)) {
          duplicated = true;
        }
        fileMap.set(file.name, file);
      });

      if (duplicated) {
        actions.pushSnackbar("Duplicate file detected. The newest uploaded versions have been kept.", "warning");
      }

      return Array.from(fileMap.values());
    });
  };

  const handleCoverPictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedCoverPicture = event.target.files![0];
    if (!uploadedCoverPicture) {
      return;
    }
    const ext = uploadedCoverPicture.name.split(".").pop();
    if (!uploadedCoverPicture.type.startsWith("image/") || !ext || !/^(jpg|jpeg|png)$/.test(ext)) {
      actions.pushError(ErrorCodes.UNRECOGNIZED_IMAGE_FILE);
      return;
    }
    setCoverPicture(uploadedCoverPicture);
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
        {loading && <TSCDialogLoader open={loading} headerText={editMode ? "Editing Workshop" : "Creating Workshop"} />}
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
            <TextField
              label="Workshop Registration Link"
              name="WorkshopRegLink"
              placeholder="Enter a registration link for the workshop"
              fullWidth
              size="small"
              value={regLink ? regLink : ""}
              onChange={(event) => setRegLink(event.target.value)}
            />
            <Box display="flex" alignItems="center" justifyContent="space-between" width="70%">
              <Typography>Open for public registration?</Typography>
              <Select
                value={regRestrict === true ? "Yes" : "No"}
                sx={{ height: "30px" }}
                onChange={() => {
                  setRegRestrict(regRestrict === false ? true : true);
                }}>
                <MenuItem sx={{ height: "30px" }} value="Yes">
                  Yes
                </MenuItem>
                <MenuItem sx={{ height: "30px" }} value="No">
                  No
                </MenuItem>
              </Select>
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
                    onChange={handleEmailFileUpload}
                    accept=".xls,.xlsx"
                    startIcon={<CloudUploadIcon />}
                  />
                  <Typography ml="10px">{emailFile?.name || "No file selected"}</Typography>
                </Box>
                <CustomDivider
                  style={{
                    height: "0.05px",
                    width: "100%",
                    backgroundColor: theme.palette.divider
                  }}
                />
                <Box textAlign="center" width="100%">
                  <Typography variant="h5" mb="5px">
                    Add Files
                  </Typography>
                  <Box gap="20px" display="flex" flexDirection="column" alignItems="center">
                    <Typography ml="10px">
                      {" "}
                      {files && files.length > 0 ? (
                        <ul>
                          {files.map((file, index) => (
                            <li key={index}>{file.name}</li>
                          ))}
                        </ul>
                      ) : (
                        "No file selected"
                      )}
                    </Typography>
                    <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center">
                      <InputFileUpload
                        text="Upload Files for the workshop"
                        onChange={handleFileUpload}
                        startIcon={<CloudUploadIcon />}
                        multiple
                      />
                    </Box>
                  </Box>

                  <Typography variant="h5" mb="5px" mt="15px">
                    Add Cover Picture
                  </Typography>
                  <Box gap="20px" display="flex" flexDirection="column" alignItems="center">
                    {coverPicture ? (
                      <Avatar
                        variant="square"
                        src={URL.createObjectURL(coverPicture)}
                        alt="Cover Picture"
                        sx={{ width: 100, height: 100 }}
                      />
                    ) : (
                      // TODO: Update this to use the route serving the cover picture (once it's finished) to check if a cover picture exists.
                      // currentWorkshop?.coverPictureUrl ?
                      // (
                      //   // workshop has a old cover picture
                      //   <Avatar
                      //     variant="square"
                      //     src={currentWorkshop?.coverPictureUrl} //use safeurl
                      //     alt="Workshop Avatar"
                      //     sx={{ width: 100, height: 100 }}
                      //   />
                      // ) : (
                      <Typography>No cover picture for this workshop</Typography>
                    )}
                    <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center">
                      <InputFileUpload
                        text="Upload a Cover Picture for the workshop"
                        onChange={handleCoverPictureUpload}
                        startIcon={<CloudUploadIcon />}
                        multiple
                      />
                    </Box>
                  </Box>
                </Box>
                <CustomDivider
                  style={{
                    height: "0.05px",
                    width: "100%",
                    backgroundColor: theme.palette.divider
                  }}
                />
                <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center" gap="10px">
                  {editMode && (
                    <>
                      <TSCButton
                        onClick={() => {
                          setWorkshopTitle(workshop?.title || "");
                          setStartDate(dayjs(workshop?.start));
                          setEndDate(dayjs(workshop?.end));
                          setEmails("");
                          setEmailFile(null);
                          setFiles(null);
                          setCoverPicture(null);
                          setRegLink(undefined);
                          setRegRestrict(false);
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
