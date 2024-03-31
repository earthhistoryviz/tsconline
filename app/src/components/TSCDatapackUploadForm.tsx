import { IconButton, TextField, Typography } from "@mui/material";
import { useContext, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { InputFileUpload } from "./TSCFileUpload";
import { context } from "../state";
import "./TSCDatapackUploadForm.css";
import { TSCButton } from "./TSCButton";
import { ErrorCodes } from "../util/error-codes";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { CustomDivider } from "./TSCComponents";

type TSCDatapackUploadFormProps = {
  close: () => void;
};
export const TSCDatapackUploadForm: React.FC<TSCDatapackUploadFormProps> = ({ close }) => {
  const { actions } = useContext(context);
  const [datapackName, setDatapackName] = useState("");
  const [datapackDescription, setDatapackDescription] = useState("");
  const [datapackFile, setDatapackFile] = useState<File | null>(null);
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
            onChange={(event) => {
              const file = event.target.files![0];
              if (!file) {
                return;
              }
              if (file.name.length > 50) {
                actions.pushError(ErrorCodes.DATAPACK_FILE_NAME_TOO_LONG);
                return;
              }
              const ext = file.name.split(".").pop()
              // either an unencoded file (text file) or an encoded file that we have no type for
              if (file.type !== "text/plain" && file.type !== "") {
                actions.pushError(ErrorCodes.UNRECOGNIZED_DATAPACK_FILE);
                return;
              }
              if (!ext || !/^(dpk|mdpk|txt|map)$/.test(ext)) {
                actions.pushError(ErrorCodes.UNRECOGNIZED_DATAPACK_EXTENSION);
                return;
              }
              actions.removeError(ErrorCodes.UNRECOGNIZED_DATAPACK_FILE)
              actions.removeError(ErrorCodes.UNRECOGNIZED_DATAPACK_EXTENSION);
              actions.removeError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
              actions.removeError(ErrorCodes.DATAPACK_FILE_NAME_TOO_LONG);
              setDatapackFile(file);
            }}
          />
          <Typography className="file-upload-text" variant="body2">
            {datapackFile ? datapackFile.name : "No file selected"}
          </Typography>
          {datapackFile && 
          <IconButton className="icon" onClick={() => setDatapackFile(null)}>
            <DeleteOutlineIcon className="close-icon"/>
          </IconButton>
          }
        </div>
        <TextField
          label="Datapack Name"
          placeholder="Enter a name for your datapack."
          InputLabelProps={{ shrink: true }}
          className="datapack-name-input"
          value={datapackName}
          onChange={(event) => setDatapackName(event.target.value)}
        />
        <TextField
          multiline
          rows={10}
          label="Datapack Description"
          placeholder="Enter a description for your datapack."
          className="datapack-description-input"
          inputProps={{ className: "datapack-description-input-text" }}
          InputLabelProps={{ shrink: true }}
          value={datapackDescription}
          onChange={(event) => setDatapackDescription(event.target.value)}
        />
        <div className="file-upload-button">
          <TSCButton
            onClick={() => {
              if (!datapackFile) {
                actions.pushError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
                return;
              }
              if (!datapackName || !datapackDescription) {
                actions.pushError(ErrorCodes.UNFINISHED_DATAPACK_UPLOAD_FORM);
                return;
              }
              actions.removeError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
              actions.removeError(ErrorCodes.UNFINISHED_DATAPACK_UPLOAD_FORM);
              actions.uploadDatapack(datapackFile!, "username");
            }}>
            Finish & Upload
          </TSCButton>
        </div>
      </div>
    </>
  );
};
