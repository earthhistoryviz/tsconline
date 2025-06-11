import { Box, Dialog, Typography, TextField, Select, MenuItem, Avatar, useTheme } from "@mui/material";
import { SharedWorkshop, reservedInstructionsFileName, reservedPresentationFileName } from "@tsconline/shared";
import dayjs, { Dayjs } from "dayjs";
import { observer } from "mobx-react-lite";
import { TSCPopup, TSCDialogLoader, InputFileUpload, CustomDivider, TSCButton } from "../components";
import { getWorkshopCoverImage } from "../state/non-action-util";
import { DateTimePicker, renderTimeViewClock } from "@mui/x-date-pickers";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useWorkshopCreateEditForm } from "./admin-workshop-create-edit-hook";

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
  hasExistingPrsentationFile: boolean;
  hasExistingInstructionsFile: boolean;
};
const AddWorkshopFiles: React.FC<AddWorkshopFilesProps> = ({
  presentationFile,
  instructionsFile,
  otherFiles,
  onPresentationFileChange,
  onInstructionsFileChange = () => {},
  onOtherFilesChange,
  hasExistingPrsentationFile,
  hasExistingInstructionsFile
}) => {
  return (
    <>
      <Typography variant="h5" mb="5px">
        Add Presentation
      </Typography>
      {hasExistingPrsentationFile && (
        <Typography variant="body2" color="warning.main" mb={1}>
          A presentation file already exists. Uploading a new file will replace the existing one.
        </Typography>
      )}
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
      {hasExistingInstructionsFile && (
        <Typography variant="body2" color="warning.main" mb={1}>
          An instructions file already exists. Uploading a new file will replace the existing one.
        </Typography>
      )}
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

type WorkshopCreateEditForm = {
  editMode: boolean;
  currentWorkshop: SharedWorkshop | null;
  onClose: () => void;
};
export const WorkshopCreateEditForm: React.FC<WorkshopCreateEditForm> = observer(function WorkshopForm({
  editMode,
  currentWorkshop,
  onClose
}) {
  const theme = useTheme();
  const { state, setters, handlers } = useWorkshopCreateEditForm(currentWorkshop, editMode, onClose);
  const prevCoverPic = currentWorkshop ? getWorkshopCoverImage(currentWorkshop.workshopId) : null;

  return (
    <>
      <TSCPopup
        open={!!state.invalidEmails}
        title="Please fix the following emails:"
        message={state.invalidEmails}
        onClose={() => setters.setInvalidEmails("")}
        maxWidth="xs"
      />
      <Dialog open={true} onClose={onClose}>
        {state.loading && (
          <TSCDialogLoader open={state.loading} headerText={editMode ? "Editing Workshop" : "Creating Workshop"} />
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
            onSubmit={handlers.handleFormSubmit}>
            <TextField
              label="Workshop Title"
              name="workshopTitle"
              placeholder="Enter a title for the workshop"
              fullWidth
              size="small"
              required
              value={state.workshopTitle}
              onChange={(event) => setters.setWorkshopTitle(event.target.value)}
            />
            <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center" gap={5}>
              <CustomDateTimePicker
                label="Start Date"
                name="startDate"
                value={state.startDate}
                onChange={(newValue) => setters.setStartDate(newValue)}
                minDateTime={dayjs(state.workshop?.start).isBefore(dayjs()) ? dayjs(state.workshop?.start) : dayjs()}
                disablePast={!editMode}
              />
              <CustomDateTimePicker
                label="End Date"
                name="endDate"
                value={state.endDate}
                onChange={(newValue) => setters.setEndDate(newValue)}
                disablePast
              />
            </Box>
            <TextField
              label="Workshop Registration Link"
              name="WorkshopRegLink"
              placeholder="Enter a registration link for the workshop"
              fullWidth
              size="small"
              value={state.regLink || ""}
              onChange={(event) => setters.setRegLink(event.target.value)}
            />
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography mr={4}>Open for public registration?</Typography>
              <Select
                value={state.regRestrict ? "No" : "Yes"}
                sx={{ height: "30px" }}
                onChange={(e) => setters.setRegRestrict(e.target.value === "No")}>
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
                onChange={(event) => setters.setEmails(event.target.value)}
                value={state.emails}
              />
              <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center" mt={2}>
                <InputFileUpload
                  text="Upload Excel File of Emails"
                  onChange={handlers.handleEmailFileUpload}
                  accept=".xls,.xlsx"
                  startIcon={<CloudUploadIcon />}
                />
                <Typography ml="10px">{state.emailFile?.name || "No file selected"}</Typography>
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
                presentationFile={state.presentationFile}
                instructionsFile={state.instructionsFile}
                otherFiles={state.otherFiles}
                onPresentationFileChange={handlers.handlePresentationFileUpload}
                onInstructionsFileChange={handlers.handleInstructionsFileUpload}
                onOtherFilesChange={handlers.handleOtherFilesUpload}
                hasExistingPrsentationFile={!!currentWorkshop?.files?.includes(reservedPresentationFileName)}
                hasExistingInstructionsFile={!!currentWorkshop?.files?.includes(reservedInstructionsFileName)}
              />
              <Typography variant="h5" mb="5px" mt="15px">
                {prevCoverPic ? "Change Cover Picture" : "Add Cover Picture"}
              </Typography>
              <Box gap="20px" display="flex" flexDirection="column" alignItems="center">
                {state.coverPicture ? (
                  <Avatar
                    variant="square"
                    src={URL.createObjectURL(state.coverPicture)}
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
                  onChange={handlers.handleCoverPictureUpload}
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
              <TSCButton onClick={setters.resetFormState}>Reset Form</TSCButton>
              <TSCButton type="submit">{editMode ? "Confirm Selection" : "Create Workshop"}</TSCButton>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </>
  );
});
