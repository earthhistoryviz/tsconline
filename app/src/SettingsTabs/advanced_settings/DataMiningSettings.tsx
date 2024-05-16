import { ColumnInfo } from "@tsconline/shared";
import { GenericTextField, TSCCheckbox } from "../../components";
import { Box, Button, FormControlLabel, Modal, Typography } from "@mui/material";
import { useState } from "react";
import { observer } from "mobx-react-lite";
import "./DataMiningSettings.css";

type DataMiningSettingsProps = {
  column: ColumnInfo;
};
export const DataMiningModal: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  const [openMenu, setOpenMenu] = useState(false);
  if (column.columnDisplayType !== "Event" && column.columnDisplayType !== "Point") return;
  return (
    <div>
      <Button onClick={() => setOpenMenu(true)} variant="contained">
        Data Mining Settings
      </Button>
      <Modal open={openMenu} onClose={() => setOpenMenu(false)}>
        <DataMiningSettings column={column} />
      </Modal>
    </div>
  );
});

export const DataMiningSettings: React.FC<DataMiningSettingsProps> = ({ column }) => {
  return (
    <Box className="popup-modal">
      <Typography className="advanced-settings-header">Data Mining Settings</Typography>
      <GenericTextField
        inputs={[
          {
            helperText: "Window Size",
            value: 0,
            onValueChange: () => {}
          },
          {
            helperText: "Step Size",
            value: 0,
            onValueChange: () => {}
          }
        ]}
      />
      <EventDataMiningOptions column={column} />
      <PointDataMiningOptions column={column} />
    </Box>
  );
};
export const EventDataMiningOptions: React.FC<DataMiningSettingsProps> = ({ column }) => {
  if (column.columnDisplayType !== "Event") return;
  return (
    <Box className="data-mining-type-container">
      <FormControlLabel
        name="FAD"
        label="Frequency of FAD"
        control={<TSCCheckbox checked={false} onChange={() => {}} />}
      />
      <FormControlLabel
        name="LAD"
        label="Frequency of LAD"
        control={<TSCCheckbox checked={false} onChange={() => {}} />}
      />
      <FormControlLabel
        name="CombinedEvents"
        label="Combined Events"
        control={<TSCCheckbox checked={false} onChange={() => {}} />}
      />
    </Box>
  );
};

export const PointDataMiningOptions: React.FC<DataMiningSettingsProps> = ({ column }) => {
  if (column.columnDisplayType !== "Point") return;
  return (
    <Box className="data-mining-type-container">
      <FormControlLabel
        name="frequencry"
        label="Frequency"
        control={<TSCCheckbox checked={false} onChange={() => {}} />}
      />
      <FormControlLabel
        name="MaximumValue"
        label="Maximum Value"
        control={<TSCCheckbox checked={false} onChange={() => {}} />}
      />
      <FormControlLabel
        name="MinimumValue"
        label="Minimum Value"
        control={<TSCCheckbox checked={false} onChange={() => {}} />}
      />
      <FormControlLabel
        name="AverageValue"
        label="Average Value"
        control={<TSCCheckbox checked={false} onChange={() => {}} />}
      />
      <FormControlLabel
        name="RateChange"
        label="Rate of Change"
        control={<TSCCheckbox checked={false} onChange={() => {}} />}
      />
    </Box>
  );
};
