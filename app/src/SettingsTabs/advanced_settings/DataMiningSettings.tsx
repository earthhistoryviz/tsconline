import { ColumnInfo, assertEventSettings, assertPointSettings, isEventFrequency, isDataMiningDataType } from "@tsconline/shared";
import { GenericTextField } from "../../components";
import { Box, Button, Dialog, Typography } from "@mui/material";
import { useState } from "react";
import { observer } from "mobx-react-lite";
import "./DataMiningSettings.css";
import { setEventColumnSettings, setPointColumnSettings } from "../../state/actions";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";

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
      <Dialog open={openMenu} onClose={() => setOpenMenu(false)}>
        <DataMiningSettings column={column} />
      </Dialog>
    </div>
  );
});

export const DataMiningSettings: React.FC<DataMiningSettingsProps> = ({ column }) => {
  return (
    <Box className="data-mining-settings-container">
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
export const EventDataMiningOptions: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  if (column.columnDisplayType !== "Event") return;
  const eventSettings = column.columnSpecificSettings;
  assertEventSettings(eventSettings)
  const handleFrequencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEventFrequency(event.target.value)) return;
    setEventColumnSettings(eventSettings, { frequency: event.target.value });
  }
  return (
    <Box className="data-mining-type-container">
      <TSCRadioGroup
        onChange={handleFrequencyChange}
        name="Event Type"
        value={eventSettings.frequency}
        radioArray={[
          { value: "FAD", label: "Frequency of FAD" },
          { value: "LAD", label: "Frequency of LAD" },
          { value: "Combined", label: "Combined Events"}
        ]}
        />
    </Box>
  );
});

export const PointDataMiningOptions: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  if (column.columnDisplayType !== "Point") return;
  const pointSettings = column.columnSpecificSettings;
  assertPointSettings(pointSettings);
  const handleDataTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDataMiningDataType(event.target.value)) return;
    setPointColumnSettings(pointSettings, { dataMiningDataType: event.target.value });
  }
  return (
    <Box className="data-mining-type-container">
      <TSCRadioGroup
        onChange={handleDataTypeChange}
        name="Data Type to Plot"
        value={pointSettings.dataMiningDataType}
        radioArray={[
          { value: "Frequency", label: "Frequency" },
          { value: "MaximumValue", label: "Maximum Value" },
          { value: "MinimumValue", label: "Minimum Value" },
          { value: "AverageValue", label: "Average Value" },
          { value: "RateChange", label: "Rate of Change" }
        ]}/>
    </Box>
  );
});
