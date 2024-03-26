import { useState, useContext } from "react";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { TSCCheckbox, InputFileUpload } from "../components";
import { context } from "../state";
import Box from "@mui/material/Box";
import InfoIcon from "@mui/icons-material/Info";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import "./Datapack.css";

export const Datapacks = observer(function Datapacks() {
  const theme = useTheme();
  const { actions } = useContext(context);

  // dummy datapacks data
  //DatapackParsingPack in shared for the real datapacks
  const datapacks = [
    {
      name: "British Isles",
      description:
        "British Isles regional formations with map interface. Approximately two dozen sub-regions, with each formation linked to the BGS lexicon; compiled in coordination with British Geological Survey, BGS."
    },
    {
      name: "Belgium",
      description:
        "Belgium regional formations with map interface. Detailed Table of contents and references at Belgium_LithostratContents.pdf. Compiled by Jane Block in coordination with Belgium Stratigraphic Commission (Noel Vandenberghe, Hance Luc, et al.)."
    },
    { name: "Australia", description: "Data for Australia" },
    {
      name: "Very Long Datapack Name _________________ Example_______________________",
      description: "Data for Longname"
    }
  ];

  const [selectedDatapacks, setSelectedDatapacks] = useState<string[]>([]);

  const handleCheckboxChange = (name: string) => {
    const isSelected = selectedDatapacks.includes(name);
    if (isSelected) {
      setSelectedDatapacks(selectedDatapacks.filter((selectedName) => selectedName !== name));
    } else {
      setSelectedDatapacks([...selectedDatapacks, name]);
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
              {datapacks.map((datapack) => (
                <tr key={datapack.name}>
                  <td className="checkbox-cell">
                    <TSCCheckbox
                      checked={selectedDatapacks.includes(datapack.name)}
                      onChange={() => handleCheckboxChange(datapack.name)}
                    />
                  </td>
                  <td>
                    <div className="name-cell">
                      <Typography>{datapack.name}</Typography>
                    </div>
                  </td>
                  <td className="info-cell">
                    <div>
                      <Tooltip title={datapack.description} arrow placement="right">
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
            actions.uploadDatapack(file, "username");
          }}
        />
      </div>
    </div>
  );
});
