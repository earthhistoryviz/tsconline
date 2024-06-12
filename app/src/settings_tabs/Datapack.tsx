import { useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import { TSCDatapackUploadForm, TSCButton } from "../components";
import { context, state } from "../state";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/Download";
import { Menu, MenuItem } from "@szhsin/react-menu";
import styles from "./Datapack.module.css";
import { Dialog, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { ErrorCodes } from "../util/error-codes";
import { TSCDatapackCard } from "../components/datapack_display/TSCDatapackCard";
import TableRowsIcon from "@mui/icons-material/TableRows";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { TSCDatapackRow } from "../components/datapack_display/TSCDatapackRow";

export const Datapacks = observer(function Datapacks() {
  const theme = useTheme();
  const { actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);

  const handleCheckboxChange = (name: string) => {
    if (state.config.datapacks.includes(name)) {
      actions.setDatapackConfig(
        state.config.datapacks.filter((datapack) => datapack !== name),
        ""
      );
    } else {
      actions.setDatapackConfig([...state.config.datapacks, name], "");
    }
  };
  const download = (name: string) => {
    return (
      state.datapackIndex[name].isUserDatapack && (
        <Menu menuButton={<DownloadIcon className="download-icon" />} transition>
          <MenuItem onClick={() => handleDownload(true, name)}>
            <Typography>Encrypted Download</Typography>
          </MenuItem>
          <MenuItem onClick={() => handleDownload(false, name)}>
            <Typography>Retrieve Original File</Typography>
          </MenuItem>
        </Menu>
      )
    );
  };
  async function getFileURL(needEncryption: boolean, fileName: string) {
    const fileBlob = await actions.requestDownload(fileName, needEncryption);
    if (fileBlob) {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(fileBlob);
        await new Promise((resolve, reject) => {
          reader.onloadend = resolve;
          reader.onerror = reject;
        });
        return reader.result;
      } catch (error) {
        actions.pushError(ErrorCodes.INVALID_PATH);
        return "";
      }
    }
  }

  const handleDownload = async (needEncryption: boolean, fileName: string) => {
    const fileURL = await getFileURL(needEncryption, fileName);
    if (fileURL && typeof fileURL === "string") {
      const aTag = document.createElement("a");
      aTag.href = fileURL;

      aTag.setAttribute("download", fileName);

      document.body.appendChild(aTag);
      aTag.click();
      aTag.remove();
    }
  };

  return (
    <div style={{ background: theme.palette.settings.light }}>
      <div className={styles.dc}>
        <Typography variant="h3" className="header">
          TimeScale Creator Datapacks
        </Typography>
        <Typography>Add a datapack by clicking the checkbox</Typography>
        <ToggleButtonGroup
          value={state.settingsTabs.datapackDisplayType}
          onChange={() => {
            actions.setDatapackDisplayType(state.settingsTabs.datapackDisplayType === "rows" ? "cards" : "rows");
          }}
          exclusive>
          <ToggleButton disableRipple value="rows">
            {" "}
            <TableRowsIcon />{" "}
          </ToggleButton>
          <ToggleButton disableRipple value="cards">
            {" "}
            <DashboardIcon />{" "}
          </ToggleButton>
        </ToggleButtonGroup>
        <Box className={styles.container}>
          {Object.keys(state.datapackIndex).map((datapack) => {
            return state.settingsTabs.datapackDisplayType === "rows" ? (
              <TSCDatapackRow key={datapack} name={datapack} datapack={state.datapackIndex[datapack]} />
            ) : (
              <TSCDatapackCard key={datapack} name={datapack} datapack={state.datapackIndex[datapack]} />
            );
          })}
        </Box>
        <TSCButton
          onClick={() => {
            setFormOpen(!formOpen);
          }}>
          Upload Datapack
        </TSCButton>

        <Dialog classes={{ paper: styles.dd }} open={formOpen} onClose={() => setFormOpen(false)}>
          <TSCDatapackUploadForm close={() => setFormOpen(false)} />
        </Dialog>
      </div>
    </div>
  );
});
