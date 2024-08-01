import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { InputFileUpload } from "../TSCFileUpload";
import "./DatapackUploadForm.css";
import { TSCButton } from "../TSCButton";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { CustomDivider, StyledScrollbar } from "../TSCComponents";
import { DatapackMetadata } from "@tsconline/shared";
import { AddCircleOutline, ExpandMore } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import useDatapackUploadForm from "./datapack-upload-form-hook";

type DatapackUploadFormProps = {
  close: () => void;
  upload: (file: File, metadata: DatapackMetadata) => Promise<void>;
};
export const DatapackUploadForm: React.FC<DatapackUploadFormProps> = ({ close, upload }) => {
  const { state, setters, handlers } = useDatapackUploadForm({ upload });
  return (
    <Box margin="20px" justifyContent="center" textAlign="center" maxWidth="70vw">
      <div className="close-upload-form">
        <IconButton className="icon" onClick={close} size="large">
          <CloseIcon className="close-icon" />
        </IconButton>
      </div>
      <Typography className="upload-datapack-header" variant="h4">
        Upload Your Own Datapack
      </Typography>
      <CustomDivider />
      <form onSubmit={handlers.handleSubmit}>
        <StyledScrollbar className="datapack-upload-form-container">
          <Box className="file-upload">
            <InputFileUpload
              startIcon={<CloudUploadIcon />}
              text="Upload Datapack"
              variant="contained"
              onChange={handlers.handleFileUpload}
            />
            <Typography className="file-upload-text" variant="body2">
              {state.file ? state.file.name : "No file selected"}
            </Typography>
            {state.file && (
              <IconButton className="icon" onClick={() => setters.setFile(null)}>
                <DeleteOutlineIcon className="close-icon" />
              </IconButton>
            )}
          </Box>
          <Box gap="10px" display="flex">
            <TextField
              label="Datapack Name"
              required
              sx={{ flexGrow: 0.5 }}
              placeholder="Enter a name for your datapack."
              InputLabelProps={{ shrink: true }}
              value={state.title}
              onChange={(event) => setters.setTitle(event.target.value)}
            />
            <TextField
              label="Authored By"
              sx={{ flexGrow: 1 }}
              placeholder="Credited to..."
              required
              InputLabelProps={{ shrink: true }}
              value={state.authoredBy}
              onChange={(event) => setters.setAuthoredBy(event.target.value)}
            />
          </Box>
          <TextField
            multiline
            required
            rows={5}
            label="Datapack Description"
            placeholder="Enter a description for your datapack."
            inputProps={{ className: "datapack-description-input-text" }}
            InputLabelProps={{ shrink: true }}
            value={state.description}
            onChange={(event) => setters.setDescription(event.target.value)}
          />
          <Box display="flex" flexDirection="column">
            <DatePicker
              className="datapack-date-picker"
              value={state.date}
              maxDate={dayjs()}
              slotProps={{
                field: { clearable: true, onClear: () => setters.setDate(null) },
                textField: { helperText: state.dateError },
                popper: { className: "datapack-date-picker" }
              }}
              onChange={handlers.handleDateChange}
            />
          </Box>
          <Autocomplete
            className="tag-autocomplete"
            multiple
            value={state.tags}
            onChange={(_, value) => setters.setTags(value)}
            options={[]}
            freeSolo
            renderInput={(params) => <TextField {...params} label="Tags" />}
          />
          <Stack spacing={2} flexShrink={0} alignSelf="center" width="100%">
            {state.references.map((reference, index) => (
              <Box key={reference.id} display="flex" alignItems="center">
                <TextField
                  label={`Reference ${index + 1}`}
                  variant="outlined"
                  value={reference.reference}
                  onChange={(event) => handlers.changeReference(index, event)}
                  fullWidth
                />
                <IconButton
                  onClick={() => setters.setReferences(state.references.filter((ref) => ref.id !== reference.id))}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
            ))}
          </Stack>
          <Button
            color="icon"
            fullWidth
            className="add-reference-button"
            onClick={handlers.addReference}
            startIcon={<AddCircleOutline className="add-reference-plus-button" />}>
            Add reference
          </Button>
          <Accordion className="additional-options-upload-form" disableGutters>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="body2" alignSelf="flex-start">
                More Options
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box gap="10px" display="flex">
                <TextField
                  label="Contact"
                  placeholder="Enter your contact information"
                  sx={{ flexGrow: 0.5 }}
                  helperText="(OPTIONAL) If you would like others to contact you about this datapack"
                  InputLabelProps={{ shrink: true }}
                  value={state.contact}
                  onChange={(event) => setters.setContact(event.target.value)}
                />
                <TextField
                  label="Notes"
                  placeholder="Enter notes for the datapack here"
                  helperText="(OPTIONAL) Generally notes are settings recommendations/How to use your datapack most efficiently"
                  sx={{ flexGrow: 1 }}
                  InputLabelProps={{ shrink: true }}
                  value={state.notes}
                  onChange={(event) => setters.setNotes(event.target.value)}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </StyledScrollbar>
        <Box display="flex" gap="20px" justifyContent="center">
          <TSCButton onClick={handlers.resetForm}>Start Over</TSCButton>
          <TSCButton type="submit">Finish & Upload</TSCButton>
        </Box>
      </form>
    </Box>
  );
};
