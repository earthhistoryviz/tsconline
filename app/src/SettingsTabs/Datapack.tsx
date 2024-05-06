import { useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import { TSCCheckbox, TSCDatapackUploadForm, TSCButton } from "../components";
import { context, state } from "../state";
import Box from "@mui/material/Box";
import InfoIcon from "@mui/icons-material/Info";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DownloadIcon from '@mui/icons-material/Download';
import { Menu, MenuItem } from '@szhsin/react-menu';
import "./Datapack.css";
import { Dialog } from "@mui/material";
import { action, set } from "mobx";
import { ErrorCodes } from "../util/error-codes";

export const Datapacks = observer(function Datapacks() {
  const theme = useTheme();
  const { actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);
  const numberOfDatapackIndexes = Object.keys(state.datapackIndex).length;
  const defaultDownloadButton = Array(numberOfDatapackIndexes).fill(false);
  const [downloadButton, setDownloadButton] = useState(defaultDownloadButton);
  //let i = 0;

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
    // i++;
    //console.log(i);
    checkActiveDatapacks(name, key);
    return (downloadButton[key] &&


      <div>
        <Menu menuButton={<DownloadIcon className="download-icon" />} transition>
          <MenuItem onClick={() => handleDownload(true, name)}><Typography>encrypted download</Typography></MenuItem>
          <MenuItem onClick={() => handleDownload(false, name)}><Typography>download</Typography></MenuItem>
        </Menu>

      </div>
    )
  }
  async function getFileURL(needEncryption: boolean, filePath: string, fileDir: string) {
    let fileBlob;
    if (needEncryption) {
      console.log("encrypted download");
      fileBlob = await actions.requestDownload(true, filePath, fileDir);
    } else {
      console.log("download");
      fileBlob = await actions.requestDownload(false, filePath, fileDir);
    }
    try {
      const reader = new FileReader();
      reader.readAsDataURL(fileBlob);
      await new Promise((resolve, reject) => {
        reader.onloadend = resolve;
        reader.onerror = reject;
      });
      console.log("reader.result: " + reader.result);
      return reader.result;
    } catch (error) {
      actions.pushError(ErrorCodes.INVALID_PATH);
      return "";
    }
  }

  const handleDownload = async (needEncryption: boolean, fileName: string) => {
    //TODO: find a way to pass the real file path and datapack directory to requestDownload. Might need to know the username
    //      probably need to implement a search route/function. The file path will be used for download.

    const fileURL = await getFileURL(needEncryption, fileName, "username");
    console.log(fileURL);
    console.log(fileName);
    const aTag = document.createElement('a');
    if (typeof fileURL === "string") {
      aTag.href = fileURL;
      //const fileName = fileURL.split('/').pop();
      if (1) {
        aTag.setAttribute('download', fileName);
      }
      document.body.appendChild(aTag);
      aTag.click();
      aTag.remove();
    }



  }


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
                  <td className="download-cell" >{download(datapack, index)}</td>

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
