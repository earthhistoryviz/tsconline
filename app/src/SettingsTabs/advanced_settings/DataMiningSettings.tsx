import {
  ColumnInfo,
  assertEventSettings,
  assertPointSettings,
  isEventFrequency,
  isDataMiningPointDataType,
  assertDataMiningSettings
} from "@tsconline/shared";
import { GenericTextField } from "../../components";
import { Box, Button, Dialog, Typography } from "@mui/material";
import { useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import "./DataMiningSettings.css";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";
import { context } from "../../state";

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

export const DataMiningSettings: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  const dataMiningSettings = column.columnSpecificSettings;
  assertDataMiningSettings(dataMiningSettings);
  return (
    <Box className="data-mining-settings-container">
      <Typography className="advanced-settings-header">Data Mining Settings</Typography>
      <GenericTextField
        inputs={[
          {
            helperText: "Window Size",
            value: dataMiningSettings.windowSize,
            onValueChange: (value) => {
              actions.setDataMiningSettings(dataMiningSettings, { windowSize: value });
            }
          },
          {
            helperText: "Step Size",
            value: dataMiningSettings.stepSize,
            onValueChange: (value) => {
              actions.setDataMiningSettings(dataMiningSettings, { stepSize: value });
            }
          }
        ]}
      />
      <EventDataMiningOptions column={column} />
      <PointDataMiningOptions column={column} />
    </Box>
  );
});
export const EventDataMiningOptions: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  if (column.columnDisplayType !== "Event") return;
  const eventSettings = column.columnSpecificSettings;
  assertEventSettings(eventSettings);
  const handleFrequencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEventFrequency(event.target.value)) return;
    actions.setEventColumnSettings(eventSettings, { frequency: event.target.value });
  };
  return (
    <Box className="data-mining-type-container">
      <TSCRadioGroup
        onChange={handleFrequencyChange}
        onClear={() => actions.setEventColumnSettings(eventSettings, { frequency: null })}
        name="Event Type"
        value={eventSettings.frequency}
        radioArray={[
          { value: "FAD", label: "Frequency of FAD" },
          { value: "LAD", label: "Frequency of LAD" },
          { value: "Combined", label: "Combined Events" }
        ]}
      />
    </Box>
  );
});

export const PointDataMiningOptions: React.FC<DataMiningSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  if (column.columnDisplayType !== "Point") return;
  const pointSettings = column.columnSpecificSettings;
  assertPointSettings(pointSettings);
  const handleDataTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDataMiningPointDataType(event.target.value)) return;
    actions.setPointColumnSettings(pointSettings, { dataMiningPointDataType: event.target.value });
    console.log(JSON.stringify(pointSettings, null, 2))
  };
  return (
    <Box className="data-mining-type-container">
      <TSCRadioGroup
        onChange={handleDataTypeChange}
        onClear={() => actions.setPointColumnSettings(pointSettings, { dataMiningPointDataType: null })}
        name="Data Type to Plot"
        value={pointSettings.dataMiningPointDataType}
        radioArray={[
          { value: "Frequency", label: "Frequency" },
          { value: "Maximum Value", label: "Maximum Value" },
          { value: "Minimum Value", label: "Minimum Value" },
          { value: "Average Value", label: "Average Value" },
          { value: "Rate of Change", label: "Rate of Change" }
        ]}
      />
    </Box>
  );
});
