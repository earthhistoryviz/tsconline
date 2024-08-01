import { Box, Chip, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useContext, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { InputFileUpload } from "../TSCFileUpload";
import { context } from "../../state";
import "./TSCDatapackUploadForm.css";
import { TSCButton } from "../TSCButton";
import { ErrorCodes } from "../../util/error-codes";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { CustomDivider } from "../TSCComponents";
import { DatapackMetadata } from "@tsconline/shared";

type TSCDatapackUploadFormProps = {
  close: () => void;
  upload: (file: File, metadata: DatapackMetadata) => Promise<void>;
};
export const TSCDatapackUploadForm: React.FC<TSCDatapackUploadFormProps> = ({ close, upload }) => {
  const { state, actions } = useContext(context);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [references, setReferences] = useState<string[]>([]);
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
    references,
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
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && tagInput.trim()) {
      event.preventDefault();
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  return (
    <Box margin="20px" justifyContent="center" textAlign="center">
      <div className="close-upload-form">
        <IconButton className="icon" onClick={close} size="large">
          <CloseIcon className="close-icon" />
        </IconButton>
      </div>
      <Typography className="upload-datapack-header" variant="h4">
        Upload Your Own Datapack
      </Typography>
      <CustomDivider />
      <form className="datapack-upload-form" onSubmit={handleSubmit}>
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
        <Box gap="10px" display="flex">
          <TextField
            label="Contact"
            placeholder="Enter your contact information"
            sx={{ flexGrow: 0.5 }}
            helperText="(OPTIONAL) If you would like others to contact you about this datapack"
            InputLabelProps={{ shrink: true }}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <TextField
            label="Notes"
            placeholder="Enter notes for the datapack here"
            helperText="(OPTIONAL) Generally notes are settings recommendations/How to use your datapack most efficiently"
            sx={{ flexGrow: 1 }}
            InputLabelProps={{ shrink: true }}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Box>
        <Box display="flex" flexDirection="column" gap="10px">
          <Stack direction="row" spacing={1} flexWrap="wrap" gap="10px 0px">
            {tags.map((tag, index) => (
              <Chip key={tag + index} label={tag} onDelete={() => setTags(tags.filter((_, i) => i !== index))} />
            ))}
          </Stack>
          <TextField
            label="Tags"
            placeholder="Enter tags for your datapack"
            helperText="Separate tags with commas"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            InputLabelProps={{ shrink: true }}
            onKeyDown={handleKeyDown}
          />
        </Box>
        <div className="file-upload-button">
          <TSCButton
            onClick={() => {
              setFile(null);
              setTitle("");
              setDescription("");
            }}>
            Start Over
          </TSCButton>
          <TSCButton type="submit">Finish & Upload</TSCButton>
        </div>
      </form>
    </Box>
  );
};
