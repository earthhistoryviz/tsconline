import { useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import { TSCCheckbox, TSCDatapackUploadForm, TSCButton } from "../components";
import { context, state } from "../state";
import Box from "@mui/material/Box";
import InfoIcon from "@mui/icons-material/Info";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import "./Datapack.css";
import { Dialog } from "@mui/material";

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
