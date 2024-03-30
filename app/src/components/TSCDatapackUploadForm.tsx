import { TextField, Typography } from "@mui/material";
import { useContext, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { InputFileUpload } from "./TSCFileUpload";
import { context } from "../state";
import "./TSCDatapackUploadForm.css";

export const TSCDatapackUploadForm = ({}) => {
  const { actions } = useContext(context);
  const [datapackName, setDatapackName] = useState("");
  const [datapackDescription, setDatapackDescription] = useState("");
  return (
    <div className="datapack-upload-form">
      <Typography className="upload-datapack-header" variant="h4">Upload a Datapack</Typography>
      <TextField
        label="Datapack Name"
        className="datapack-name-input"
        value={datapackName}
        onChange={(event) => setDatapackName(event.target.value)}
      />
      <TextField
        multiline
        rows={10}
        maxRows={10}
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
            actions.uploadDatapack(file, "username");
          }}
        />
      </div>
    </div>
  );
};
