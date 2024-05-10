import { useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import { TSCCheckbox, TSCDatapackUploadForm, TSCButton } from "../components";
import { context, state } from "../state";
import Box from "@mui/material/Box";
import InfoIcon from "@mui/icons-material/Info";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/Download";
import { Menu, MenuItem } from "@szhsin/react-menu";
import "./Datapack.css";
import { Dialog } from "@mui/material";
import { ErrorCodes } from "../util/error-codes";

export const Datapacks = observer(function Datapacks() {
  const theme = useTheme();
  const { actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);
  const numberOfDatapackIndexes = Object.keys(state.datapackIndex).length;
  const defaultDownloadButton = Array(numberOfDatapackIndexes).fill(false);
  const [downloadButton, setDownloadButton] = useState(defaultDownloadButton);

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
  const download = (name: string, key: number) => {
    checkActiveDatapacks(name, key);
    return (
      downloadButton[key] && (
        <div>
          <Menu menuButton={<DownloadIcon className="download-icon" />} transition>
            <MenuItem onClick={() => handleDownload(true, name)}>
              <Typography>encrypted download</Typography>
            </MenuItem>
            <MenuItem onClick={() => handleDownload(false, name)}>
              <Typography>download</Typography>
            </MenuItem>
          </Menu>
        </div>
      )
    );
  };
  async function getFileURL(needEncryption: boolean, fileName: string) {
    let fileBlob;
    if (needEncryption) {
      fileBlob = await actions.requestDownload(true, fileName);
    } else {
      fileBlob = await actions.requestDownload(false, fileName);
    }
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

  const handleDownload = async (needEncryption: boolean, fileName: string) => {
    const fileURL = await getFileURL(needEncryption, fileName);
    const aTag = document.createElement("a");
    if (typeof fileURL === "string") {
      aTag.href = fileURL;

      aTag.setAttribute("download", fileName);

      document.body.appendChild(aTag);
      aTag.click();
      aTag.remove();
    }
  };

  async function checkActiveDatapacks(name: string, key: number) {
    const activeDatapacks = await actions.loadActiveDatapacks();
    const isSystemDatapack = activeDatapacks.includes(name);
    if (!isSystemDatapack) {
      const newButtonState = [...downloadButton];
      newButtonState[key] = true;
      setDownloadButton(newButtonState);
    }
  }

  return (
    <div style={{ background: theme.palette.settings.light }}>
      <div className="container">
        <Typography variant="h3" className="heading">
          TimeScale Creator Datapacks
        </Typography>
        <Typography>Add a datapack by clicking the checkbox</Typography>
        <Box className="box-container">
          <table className="data-table">
            <tbody>
              {Object.keys(state.datapackIndex).map((datapack, index) => (
                <tr key={index}>
                  <td className="checkbox-cell">
                    <TSCCheckbox
                      checked={state.config.datapacks.includes(datapack)}
                      onChange={() => handleCheckboxChange(datapack)}
                    />
                  </td>
                  <td>
                    <div className="name-cell">
                      <Typography>{datapack}</Typography>
                    </div>
                  </td>
                  <td className="download-cell">{download(datapack, index)}</td>

                  <td className="info-cell">
                    <div>
                      <Tooltip title="Description" arrow placement="right">
                        <InfoIcon className="info-icon" />
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
        <TSCButton
          onClick={() => {
            setFormOpen(!formOpen);
          }}>
          Upload Datapack
        </TSCButton>

        <Dialog classes={{ paper: "datapack-dialog" }} open={formOpen} onClose={() => setFormOpen(false)}>
          <TSCDatapackUploadForm close={() => setFormOpen(false)} />
        </Dialog>
      </div>
    </div>
  );
});
