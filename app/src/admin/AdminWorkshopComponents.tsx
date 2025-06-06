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
import { getWorkshopCoverImage } from "../state/non-action-util";

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

type CustomDateTimePickerProps = {
  label: string;
  name: string;
  onChange: (newValue: Dayjs | null) => void;
  disablePast: boolean;
  minDateTime?: Dayjs;
  value?: Dayjs | null;
};
const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({ label, name, onChange, minDateTime, value }) => {
  const theme = useTheme();
  return (
    <DateTimePicker
      label={label}
      name={name}
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
      value={value}
      onChange={onChange}
      minDateTime={minDateTime || dayjs()}
      disablePast
    />
  );
};

type AddWorkshopFilesProps = {
  presentationFile?: File | null;
  instructionsFile?: File | null;
  otherFiles?: File[] | null;
  onPresentationFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInstructionsFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOtherFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};
const AddWorkshopFiles: React.FC<AddWorkshopFilesProps> = ({
  presentationFile,
  instructionsFile,
  otherFiles,
  onPresentationFileChange,
  onInstructionsFileChange = () => {},
  onOtherFilesChange
}) => {
  return (
    <>
      <Typography variant="h5" mb="5px">
        Add Presentation
      </Typography>
      <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center">
        <InputFileUpload
          text="Upload Pdf Presentation"
          onChange={onPresentationFileChange}
          accept=".pdf"
          startIcon={<CloudUploadIcon />}
        />
        <Typography ml="10px">{presentationFile?.name || "No file selected"}</Typography>
      </Box>
      <Typography variant="h5" mb="5px">
        Add Instructions
      </Typography>
      <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center">
        <InputFileUpload
          text="Upload Pdf Instructions"
          onChange={onInstructionsFileChange}
          accept=".pdf"
          startIcon={<CloudUploadIcon />}
        />
        <Typography ml="10px">{instructionsFile?.name || "No file selected"}</Typography>
      </Box>
      <Typography variant="h5" mb="5px">
        Add Other Files
      </Typography>
      <Box display="flex" flexDirection="column" alignItems="center">
        <InputFileUpload
          text="Upload Files for the workshop"
          onChange={onOtherFilesChange}
          startIcon={<CloudUploadIcon />}
          multiple
        />
        <Typography>
          {otherFiles && otherFiles.length > 0 ? (
            <ul>
              {otherFiles.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          ) : (
            "No files added"
          )}
        </Typography>
      </Box>
    </>
  );
};

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
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const [instructionsFile, setInstructionsFile] = useState<File | null>(null);
  const [otherFiles, setOtherFiles] = useState<File[] | null>(null);
  const [coverPicture, setCoverPicture] = useState<File | null>();
  const [regLink, setRegLink] = useState<string | undefined>(undefined);
  const [regRestrict, setRegRestrict] = useState(false);
  const prevCoverPic = currentWorkshop ? getWorkshopCoverImage(currentWorkshop?.workshopId) : null;

  const resetFormState = () => {
    setWorkshopTitle(editMode ? workshop?.title || "" : "");
    setStartDate(editMode ? dayjs(workshop?.start) : null);
    setEndDate(editMode ? dayjs(workshop?.end) : null);
    setEmails("");
    setEmailFile(null);
    setPresentationFile(null);
    setInstructionsFile(null);
    setOtherFiles(null);
    setCoverPicture(null);
    setRegLink(undefined);
    setRegRestrict(false);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      setLoading(true);
      event.preventDefault();
      const errorMessages: string[] = [];

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
          setWorkshop(newWorkshop);
        }

        if (
          isWorkshopUnchanged &&
          !emailFile &&
          !emails &&
          !regLink &&
          !presentationFile &&
          !instructionsFile &&
          !otherFiles &&
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

      if ((otherFiles && otherFiles.length !== 0) || presentationFile || instructionsFile) {
        const response = await actions.adminAddFilesToWorkshop(
          workshopId,
          presentationFile,
          instructionsFile,
          otherFiles
        );
        if (!response) {
          errorMessages.push("Some or all files could not be uploaded.");
        }
      }

      if (errorMessages.length > 0) {
        actions.pushSnackbar(errorMessages.join("\n"), "warning");
      } else {
        const successMessage = editMode ? "Workshop edited successfully." : "Workshop created successfully.";
        actions.pushSnackbar(successMessage, "success");
      }
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

  const handlePresentationFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedPresentationFile = event.target.files![0];
    if (!uploadedPresentationFile) {
      return;
    }
    if (uploadedPresentationFile.type !== "application/pdf") {
      actions.pushError(ErrorCodes.UNRECOGNIZED_PDF_FILE);
      return;
    }
    setPresentationFile(uploadedPresentationFile);
  };

  const handleInstructionsFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedInstructionsFile = event.target.files![0];
    if (!uploadedInstructionsFile) {
      return;
    }
    if (uploadedInstructionsFile.type !== "application/pdf") {
      actions.pushError(ErrorCodes.UNRECOGNIZED_PDF_FILE);
      return;
    }
    setInstructionsFile(uploadedInstructionsFile);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) {
      return;
    }

    const filesArray = Array.from(uploadedFiles);

    setOtherFiles((prevFiles) => {
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
      <Dialog open={true} onClose={onClose} fullWidth>
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
              <CustomDateTimePicker
                label="Start Date"
                name="startDate"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                minDateTime={dayjs(workshop?.start).isBefore(dayjs()) ? dayjs(workshop?.start) : dayjs()}
                disablePast={!editMode}
              />
              <CustomDateTimePicker
                label="End Date"
                name="endDate"
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
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography mr={4}>Open for public registration?</Typography>
              <Select
                value={regRestrict ? "No" : "Yes"}
                sx={{ height: "30px" }}
                onChange={(e) => setRegRestrict(e.target.value === "No")}>
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
              <TextField
                label="Paste Emails"
                name="emails"
                multiline
                rows={3}
                placeholder="Enter multiple emails, separated by commas"
                size="small"
                fullWidth
                onChange={(event) => setEmails(event.target.value)}
                value={emails}
              />
              <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center" mt={2}>
                <InputFileUpload
                  text="Upload Excel File of Emails"
                  onChange={handleEmailFileUpload}
                  accept=".xls,.xlsx"
                  startIcon={<CloudUploadIcon />}
                />
                <Typography ml="10px">{emailFile?.name || "No file selected"}</Typography>
              </Box>
            </Box>
            <CustomDivider
              style={{
                height: "2px",
                width: "100%",
                backgroundColor: theme.palette.backgroundColor.main
              }}
            />
            <Box textAlign="center" width="100%">
              <AddWorkshopFiles
                presentationFile={presentationFile}
                instructionsFile={instructionsFile}
                otherFiles={otherFiles}
                onPresentationFileChange={handlePresentationFileUpload}
                onInstructionsFileChange={handleInstructionsFileUpload}
                onOtherFilesChange={handleFileUpload}
              />
              <Typography variant="h5" mb="5px" mt="15px">
                {prevCoverPic ? "Change Cover Picture" : "Add Cover Picture"}
              </Typography>
              <Box gap="20px" display="flex" flexDirection="column" alignItems="center">
                {coverPicture ? (
                  <Avatar
                    variant="square"
                    src={URL.createObjectURL(coverPicture)}
                    alt="Cover Picture"
                    sx={{ width: 100, height: 100 }}
                  />
                ) : prevCoverPic ? (
                  <Avatar variant="square" src={prevCoverPic} alt="Workshop Avatar" sx={{ width: 100, height: 100 }} />
                ) : (
                  <Typography>No cover picture for this workshop</Typography>
                )}
                <InputFileUpload
                  text="Upload a Cover Picture for the workshop"
                  onChange={handleCoverPictureUpload}
                  startIcon={<CloudUploadIcon />}
                  accept="image/*"
                />
              </Box>
            </Box>
            <CustomDivider
              style={{
                height: "2px",
                width: "100%",
                backgroundColor: theme.palette.backgroundColor.main
              }}
            />
            <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center" gap="10px">
              <TSCButton onClick={resetFormState}>Reset Form</TSCButton>
              <TSCButton type="submit">{editMode ? "Confirm Selection" : "Create Workshop"}</TSCButton>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </>
  );
});
