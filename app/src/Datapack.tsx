import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { InputFileUpload } from "./components";

export const Datapack = observer(function Datapack() {
  const theme = useTheme();

  // Sample datapacks data
  const datapacks = [
    { id: 1, name: "British Isles", description: "Data for the British Isles" },
    { id: 2, name: "Belgium", description: "Data for Belgium" },
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
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        minHeight: "100vh",
        background: theme.palette.settings.light,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {datapacks.map((datapack) => (
          <div
            key={datapack.id}
            style={{
              display: "flex",
              alignItems: "center",
              margin: "10px",
              cursor: "pointer",
              background: selectedDatapacks.includes(datapack.id) ? "#e6f7ff" : "transparent",
              padding: "8px",
              borderRadius: "4px",
            }}
            onClick={() => handleCheckboxChange(datapack.id)}
          >
            <input
              type="checkbox"
              checked={selectedDatapacks.includes(datapack.id)}
              onChange={() => {}}
            />
            <div style={{ marginLeft: "10px" }}>{datapack.name}</div>
          </div>
        ))}
      </div>
      <InputFileUpload
        startIcon={<CloudUploadIcon />}
        text="Upload Datapack"
        onChange={() => {}}
        multiple
      />
    </div>
  );
});

