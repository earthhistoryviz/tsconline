import React, { useState, useContext, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { TSCCheckbox, InputFileUpload } from "./components";
import { context, state } from "./state";
import Box from "@mui/material/Box";
import InfoIcon from "@mui/icons-material/Info";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import "./Datapack.css";

export const Datapack = observer(function Datapack() {
  const theme = useTheme();
  const { actions } = useContext(context);
  const [selectedDatapacks, setSelectedDatapacks] = useState<string[]>(() => {
    const storedSelectedDatapacks = localStorage.getItem("selectedDatapacks");
    return storedSelectedDatapacks ? JSON.parse(storedSelectedDatapacks) : [];
  });
  const datapackIndex = state.datapackIndex;

  useEffect(() => {localStorage.setItem("selectedDatapacks", JSON.stringify(selectedDatapacks));
  actions.setDatapackConfig(selectedDatapacks, state.config.settingsPath);
  }, [selectedDatapacks, actions, state.config.settingsPath]);

  const handleCheckboxChange = (name: string) => {
    setSelectedDatapacks(prevSelectedDatapacks => {
      if (prevSelectedDatapacks.includes(name)) {
        return prevSelectedDatapacks.filter(selectedName => selectedName !== name);
      } else {
        return [...prevSelectedDatapacks, name];
      }
    });
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
              {Object.keys(datapackIndex).map((datapack, index) => (
                <tr key={index}>
                  <td className="checkbox-cell">
                    <TSCCheckbox
                      checked={selectedDatapacks.includes(datapack)}
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

        <InputFileUpload
          startIcon={<CloudUploadIcon />}
          text="Upload Datapack"
          onChange={(event) => {
            const file = event.target.files![0];
            actions.uploadDatapack(file);
          }}
        />

      </div>
    </div>
  );
});
