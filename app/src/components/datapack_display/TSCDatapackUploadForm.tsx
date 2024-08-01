import { IconButton, TextField, Typography } from "@mui/material";
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
  const [references, setReferences] = useState<string[]>([]);
  const [authoredBy, setAuthoredBy] = useState("");
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
  return (
    <>
      <div className="close-upload-form">
        <IconButton className="icon" onClick={close} size="large">
          <CloseIcon className="close-icon" />
        </IconButton>
      </div>
      <div className="datapack-upload-form">
        <Typography className="upload-datapack-header" variant="h4">
          Upload Your Own Datapack
        </Typography>
        <CustomDivider />
        <div className="file-upload">
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
        </div>
        <TextField
          label="Datapack Name"
          placeholder="Enter a name for your datapack."
          InputLabelProps={{ shrink: true }}
          className="datapack-name-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <TextField
          multiline
          rows={10}
          label="Datapack Description"
          placeholder="Enter a description for your datapack."
          className="datapack-description-input"
          inputProps={{ className: "datapack-description-input-text" }}
          InputLabelProps={{ shrink: true }}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="file-upload-button">
          <TSCButton
            onClick={() => {
              setFile(null);
              setTitle("");
              setDescription("");
            }}>
            Start Over
          </TSCButton>
          <TSCButton
            onClick={() => {
              if (!file) {
                actions.pushError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
                return;
              }
              if (!title || !description) {
                actions.pushError(ErrorCodes.UNFINISHED_DATAPACK_UPLOAD_FORM);
                return;
              }
              actions.removeError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
              actions.removeError(ErrorCodes.UNFINISHED_DATAPACK_UPLOAD_FORM);
              upload(file, metadata);
              setFile(null);
              setTitle("");
              setDescription("");
            }}>
            Finish & Upload
          </TSCButton>
        </div>
      </div>
    </>
  );
};
