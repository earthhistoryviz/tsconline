import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useContext, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { InputFileUpload } from "../TSCFileUpload";
import { context } from "../../state";
import "./TSCDatapackUploadForm.css";
import { TSCButton } from "../TSCButton";
import { ErrorCodes } from "../../util/error-codes";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { CustomDivider, StyledScrollbar } from "../TSCComponents";
import { DatapackMetadata } from "@tsconline/shared";
import { AddCircleOutline, ArrowForwardIosSharp, ExpandMore } from "@mui/icons-material";
import { Reference } from "../../types";

type TSCDatapackUploadFormProps = {
  close: () => void;
  upload: (file: File, metadata: DatapackMetadata) => Promise<void>;
};
export const TSCDatapackUploadForm: React.FC<TSCDatapackUploadFormProps> = ({ close, upload }) => {
  const { state, actions } = useContext(context);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [currentId, setCurrentId] = useState(0);
  const [authoredBy, setAuthoredBy] = useState(state.user.username);
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const metadata: DatapackMetadata = {
    file: file?.name || "",
    description,
    title,
    authoredBy,
    references: references.map((reference) => reference.reference),
    tags,
    size: "0", // placeholder, this will get set after the file is uploaded
    ...(contact && { contact }),
    ...(notes && { notes }),
    ...(date && { date })
  };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      actions.pushError(ErrorCodes.INVALID_FORM);
      return;
    }
    if (!file) {
      actions.pushError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
      return;
    }
    actions.removeError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
    actions.removeError(ErrorCodes.UNFINISHED_DATAPACK_UPLOAD_FORM);
    upload(file, metadata);
    setFile(null);
    setTitle("");
    setDescription("");
  };
  const addReference = () => {
    if (references[0] && references[references.length - 1].reference === "") {
      return;
    }
    setReferences([...references, { id: currentId, reference: "" }]);
    setCurrentId(currentId + 1);
  };
  const changeReference = (index: number, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newReferences = [...references];
    newReferences[index].reference = event.target.value;
    setReferences(newReferences);
  };
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
      <form onSubmit={handleSubmit}>
        <StyledScrollbar className="datapack-upload-form-container">
          <Box className="file-upload">
            <InputFileUpload
              startIcon={<CloudUploadIcon />}
              text="Upload Datapack"
              variant="contained"
              onChange={(event) => {
                const file = event.target.files![0];
                if (!file) {
                  return;
                }
                if (file.name.length > 50) {
                  actions.pushError(ErrorCodes.DATAPACK_FILE_NAME_TOO_LONG);
                  return;
                }
                const ext = file.name.split(".").pop();
                // either an unencoded file (text file) or an encoded file that we have no type for
                if (file.type !== "text/plain" && file.type !== "") {
                  actions.pushError(ErrorCodes.UNRECOGNIZED_DATAPACK_FILE);
                  return;
                }
                if (!ext || !/^(dpk|mdpk|txt|map)$/.test(ext)) {
                  actions.pushError(ErrorCodes.UNRECOGNIZED_DATAPACK_EXTENSION);
                  return;
                }
                if (state.datapackIndex[file.name]) {
                  actions.pushError(ErrorCodes.DATAPACK_ALREADY_EXISTS);
                  return;
                }
                actions.removeAllErrors();
                setFile(file);
              }}
            />
            <Typography className="file-upload-text" variant="body2">
              {file ? file.name : "No file selected"}
            </Typography>
            {file && (
              <IconButton className="icon" onClick={() => setFile(null)}>
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
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <TextField
              label="Authored By"
              sx={{ flexGrow: 1 }}
              placeholder="Credited to..."
              required
              InputLabelProps={{ shrink: true }}
              value={authoredBy}
              onChange={(event) => setAuthoredBy(event.target.value)}
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
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Autocomplete
            className="tag-autocomplete"
            multiple
            value={tags}
            onChange={(_, value) => setTags(value)}
            options={[]}
            freeSolo
            renderInput={(params) => <TextField {...params} label="Tags" />}
          />
          <Stack spacing={2} flexShrink={0} alignSelf="center" width="100%">
            {references.map((reference, index) => (
              <Box key={reference.id} display="flex" alignItems="center">
                <TextField
                  label={`Reference ${index + 1}`}
                  variant="outlined"
                  value={reference.reference}
                  onChange={(event) => changeReference(index, event)}
                  fullWidth
                />
                <IconButton onClick={() => setReferences(references.filter((ref) => ref.id !== reference.id))}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
            ))}
          </Stack>
          <Button
            color="icon"
            fullWidth
            className="add-reference-button"
            onClick={addReference}
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
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                />
                <TextField
                  label="Notes"
                  placeholder="Enter notes for the datapack here"
                  helperText="(OPTIONAL) Generally notes are settings recommendations/How to use your datapack most efficiently"
                  sx={{ flexGrow: 1 }}
                  InputLabelProps={{ shrink: true }}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </StyledScrollbar>
        <Box display="flex" gap="20px" justifyContent="center">
          <TSCButton
            onClick={() => {
              setFile(null);
              setTitle("");
              setDescription("");
            }}>
            Start Over
          </TSCButton>
          <TSCButton type="submit">Finish & Upload</TSCButton>
        </Box>
      </form>
    </Box>
  );
};
