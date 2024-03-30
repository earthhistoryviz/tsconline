import { TextField, Typography } from "@mui/material";
import { useContext, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { InputFileUpload } from "./TSCFileUpload";
import { context } from "../state";
import "./TSCDatapackUploadForm.css";
import { TSCButton } from "./TSCButton";
import { ErrorCodes } from "../util/error-codes";

export const TSCDatapackUploadForm = ({}) => {
  const { actions } = useContext(context);
  const [datapackName, setDatapackName] = useState("");
  const [datapackDescription, setDatapackDescription] = useState("");
  const [datapackFile, setDatapackFile] = useState<File | null>(null);
  return (
    <div className="datapack-upload-form">
      <Typography className="upload-datapack-header" variant="h4">
        Upload a Datapack
      </Typography>
      <TextField
        label="Datapack Name"
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
      <div className="file-upload">
        <InputFileUpload
          startIcon={<CloudUploadIcon />}
          text="Upload Datapack"
          onChange={(event) => {
            const file = event.target.files![0];
            if (!file) {
              actions.pushError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
              return;
            }
            if (file.name.length > 50) {
              actions.pushError(ErrorCodes.DATAPACK_FILE_NAME_TOO_LONG);
              return;
            }
            setDatapackFile(file);
          }}
        />
        <Typography className="file-upload-text" variant="body2">
          {datapackFile ? datapackFile.name : "No file selected"}
        </Typography>
      </div>
      <div className="file-upload-button">
        <TSCButton
          onClick={() => {
            if (!datapackFile) {
              actions.pushError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
              return;
            }
            actions.uploadDatapack(datapackFile!, "username");
          }}>
          Upload
        </TSCButton>
      </div>
    </div>
  );
};
