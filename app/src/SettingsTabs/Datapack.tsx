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
import { action } from "mobx";

export const Datapacks = observer(function Datapacks() {
  const theme = useTheme();
  const { actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);
  const [downloadButton, setDownloadButton] = useState([]);

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
  const download = async (name: string) => {

    let systemDp = await checkActiveDatapacks(name);
    return (systemDp &&


      <div>
        <Menu menuButton={<DownloadIcon className="download-icon" />} transition>
          <MenuItem onClick={(e) => handleDownload(true)}><Typography>encrypted download</Typography></MenuItem>
          <MenuItem onClick={(e) => handleDownload(false)}><Typography>download</Typography></MenuItem>
        </Menu>

      </div>
    )
  }

  function handleDownload(needEncryption: boolean) {
    if (needEncryption) {
      console.log("encrypted download");
      actions.requestDownload(true);
    } else {
      console.log("download");
      actions.requestDownload(false);
    }
  }

  const checkActiveDatapacks = async (name: string) => {
    const activeDatapacks = await actions.loadActiveDatapacks();
    return activeDatapacks!.includes(name) || false;

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
                  <td className="download-cell" >{download(datapack)}</td>

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
