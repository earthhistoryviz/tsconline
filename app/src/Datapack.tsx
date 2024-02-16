import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { ColumnContainer,TSCCheckbox, InputFileUpload } from "./components";
import Box from "@mui/material/Box";
import InfoIcon from "@mui/icons-material/Info";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { TSCButton } from "./components";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

import "./Datapack.css";

export const Datapack = observer(function Datapack() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [checkedNotApplied, setCheckedNotApplied] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const handleApply = () =>{
    //add logic here to actually add the datapacks
    setOpen(false);
  }

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [checkedNotApplied]);

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (checkedNotApplied) {
      event.preventDefault();
    }
  };

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
    setCheckedNotApplied(true);
  };

  return (
    <div className="container">
      <Typography variant="h2" className="heading">
        TimeScale Creator Datapacks
      </Typography>
      <Typography style={{ fontSize: 18, marginTop: "1em", marginBottom: "3vh"}}>
        Add a datapack by clicking the checkbox
      </Typography>
      <Box className="box-container">
        <table className="data-table">
          <tbody>
            {datapacks.map((datapack) => (
              <tr key={datapack.id}>
                <td className="checkbox-cell">
                  <TSCCheckbox
                    checked={selectedDatapacks.includes(datapack.id)}
                    onChange={() => handleCheckboxChange(datapack.id)}
                  />
                </td>
                <td className="name-cell">
                  <div style = {{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                    <Typography>{datapack.name}</Typography>
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
      <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to apply the selected changes?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <TSCButton onClick={handleClose}>Cancel</TSCButton>
          <TSCButton onClick={handleApply}>Apply</TSCButton>
        </DialogActions>
      </Dialog>
      
      <InputFileUpload
        startIcon={<CloudUploadIcon />}
        text="Upload Datapack"
        onChange={() => {}}
        multiple
        className="upload-button"
      />
    </div>
  );
});