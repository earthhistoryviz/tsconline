import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { InputFileUpload } from "./components";
import { context } from "./state";
import { useContext } from "react";
export const Datapack = observer(function Datapack() {
  const { actions } = useContext(context);
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        minHeight: "100vh",
        background: theme.palette.settings.light
      }}>
      <InputFileUpload
        startIcon={<CloudUploadIcon />}
        text="Upload Datapack"
        onChange={(event) => {
          const file = event.target.files![0];
          actions.uploadDatapack(file);
        }}
      />
    </div>
  );
});
