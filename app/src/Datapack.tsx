import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { ColumnContainer,TSCCheckbox, InputFileUpload } from "./components";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

export const Datapack = observer(function Datapack() {
  const theme = useTheme();

  // dummy datapacks data
  const datapacks = [
    { id: 1, name: "British Isles", description: "British Isles regional formations with map interface. Approximately two dozen sub-regions, with each formation linked to the BGS lexicon; compiled in coordination with British Geological Survey, BGS." },
    { id: 2, name: "Belgium", description: "Belgium regional formations with map interface. Detailed Table of contents and references at Belgium_LithostratContents.pdf. Compiled by Jane Block in coordination with Belgium Stratigraphic Commission (Noel Vandenberghe, Hance Luc, et al.)." },
    { id: 3, name: "Australia", description: "Data for Australia" },
  ];

  const [selectedDatapacks, setSelectedDatapacks] = useState<number[]>([]);

  const handleCheckboxChange = (id: number) => {
    const isSelected = selectedDatapacks.includes(id);
    if (isSelected) {
      setSelectedDatapacks(selectedDatapacks.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedDatapacks([...selectedDatapacks, id]);
    }
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        minHeight: "100vh",
        background: theme.palette.settings.light,
      }}
    >
      <h1 style={{ margin: "20px" }}>TimeScale Creator Datapacks</h1>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={2}
        border={1}
        borderRadius={4}
        borderColor="gray"
        maxWidth="600px"
        margin="0 auto"
        marginTop="20px"
        style={{
          width: "100%",
          backgroundColor: theme.palette.settings.light,
        }}
      >
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {datapacks.map((datapack) => (
              <tr key={datapack.id}>
                <td style={{ padding: "8px" }}>
                  <TSCCheckbox
                    checked={selectedDatapacks.includes(datapack.id)}
                    onChange={() => handleCheckboxChange(datapack.id)}
                  />
                </td>
                <td style={{ padding: "8px", textAlign: "left" }}>
                  <Tooltip title={datapack.description} arrow>
                    <Typography>{datapack.name}</Typography>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      <InputFileUpload
        startIcon={<CloudUploadIcon />}
        text="Upload Datapack"
        onChange={() => {}}
        multiple
        style={{ marginTop: "20px" }}
      />
    </div>
  );
});