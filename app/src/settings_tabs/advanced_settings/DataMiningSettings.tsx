import {
  ColumnInfo,
  assertEventSettings,
  assertPointSettings,
  isEventFrequency,
  isDataMiningPointDataType,
  assertDataMiningSettings,
  assertChronSettings,
  isDataMiningChronDataType,
  DataMiningPointDataType,
  EventFrequency
} from "@tsconline/shared";
import { CustomDivider, GenericTextField, StyledScrollbar } from "../../components";
import { Box, Button, Dialog, Typography } from "@mui/material";
import { useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import "./DataMiningSettings.css";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";
import { context } from "../../state";
import { useTranslation } from "react-i18next";

type DataMiningSettingsProps = {
  column: ColumnInfo;
  onDataMiningTypeChange: (event: EventFrequency | DataMiningPointDataType) => void;
};
export const DataMiningModal: React.FC<DataMiningSettingsProps> = observer(({ column, onDataMiningTypeChange }) => {
  const [openMenu, setOpenMenu] = useState(false);
  const { t } = useTranslation();
  if (column.columnDisplayType !== "Event" && column.columnDisplayType !== "Point") return;
  return (
    <div>
      <Button onClick={() => setOpenMenu(true)} variant="contained">
        {t("settings.column.datamining-menu.title")}
      </Button>
      <Dialog open={openMenu} onClose={() => setOpenMenu(false)}>
        <DataMiningSettings column={column} onDataMiningTypeChange={onDataMiningTypeChange} />
      </Dialog>
    </div>
  );
});

export const DataMiningSettings: React.FC<DataMiningSettingsProps> = observer(({ column, onDataMiningTypeChange }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  const dataMiningSettings = column.columnSpecificSettings;
  if (!dataMiningSettings) return;
  assertDataMiningSettings(dataMiningSettings);
  return (
    <StyledScrollbar>
      <Box className="data-mining-settings-container">
        <Typography className="advanced-settings-header" variant="h6">
          {t("settings.column.datamining-menu.title")}
        </Typography>
        <CustomDivider className="settings-header-divider" />
        <div className="data-mining-settings-content">
          <GenericTextField
            inputs={[
              {
                helperText: t("settings.column.datamining-menu.window-size"),
                id: "windowSize",
                value: dataMiningSettings.windowSize,
                onValueChange: (value) => {
                  actions.setDataMiningSettings(dataMiningSettings, { windowSize: value });
                }
              },
              {
                helperText: t("settings.column.datamining-menu.step-size"),
                id: "stepSize",
                value: dataMiningSettings.stepSize,
                onValueChange: (value) => {
                  actions.setDataMiningSettings(dataMiningSettings, { stepSize: value });
                }
              }
            ]}
          />
          <EventDataMiningOptions column={column} onDataMiningTypeChange={onDataMiningTypeChange} />
          <PointDataMiningOptions column={column} onDataMiningTypeChange={onDataMiningTypeChange} />
          <ChronDataMiningOptions column={column} onDataMiningTypeChange={onDataMiningTypeChange} />
        </div>
      </Box>
    </StyledScrollbar>
  );
});
export const ChronDataMiningOptions: React.FC<DataMiningSettingsProps> = observer(
  ({ column, onDataMiningTypeChange }) => {
    const { actions } = useContext(context);
    const { t } = useTranslation();
    if (column.columnDisplayType !== "Chron") return;
    const chronSettings = column.columnSpecificSettings;
    assertChronSettings(chronSettings);
    const handleFrequencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isDataMiningChronDataType(event.target.value)) return;
      if (chronSettings.dataMiningChronDataType !== null) {
        actions.removeDataMiningColumn(column, chronSettings.dataMiningChronDataType);
      }
      actions.setChronColumnSettings(chronSettings, { dataMiningChronDataType: event.target.value });
      onDataMiningTypeChange(event.target.value);
    };
    return (
      <Box className="data-mining-type-container">
        <TSCRadioGroup
          onChange={handleFrequencyChange}
          name={t("settings.column.datamining-menu.options-title.chron")}
          value={chronSettings.dataMiningChronDataType}
          radioArray={[{ value: "Frequency", label: t("settings.column.datamining-menu.options.frequency") }]}
        />
      </Box>
    );
  }
);
export const EventDataMiningOptions: React.FC<DataMiningSettingsProps> = observer(
  ({ column, onDataMiningTypeChange }) => {
    const { actions } = useContext(context);
    const { t } = useTranslation();
    if (column.columnDisplayType !== "Event") return;
    const eventSettings = column.columnSpecificSettings;
    assertEventSettings(eventSettings);
    const handleFrequencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isEventFrequency(event.target.value)) return;
      if (eventSettings.frequency !== null) actions.removeDataMiningColumn(column, eventSettings.frequency);
      actions.setEventColumnSettings(eventSettings, { frequency: event.target.value });
      onDataMiningTypeChange(event.target.value);
    };
    return (
      <Box className="data-mining-type-container">
        <TSCRadioGroup
          onChange={handleFrequencyChange}
          name={t("settings.column.datamining-menu.options-title.event")}
          value={eventSettings.frequency}
          radioArray={[
            { value: "FAD", label: t("settings.column.datamining-menu.options.freq-of-FAD") },
            { value: "LAD", label: t("settings.column.datamining-menu.options.freq-of-LAD") },
            { value: "Combined Events", label: t("settings.column.datamining-menu.options.combined-events") }
          ]}
        />
      </Box>
    );
  }
);

export const PointDataMiningOptions: React.FC<DataMiningSettingsProps> = observer(
  ({ column, onDataMiningTypeChange }) => {
    const { actions } = useContext(context);
    const { t } = useTranslation();
    if (column.columnDisplayType !== "Point") return;
    const pointSettings = column.columnSpecificSettings;
    assertPointSettings(pointSettings);
    const handleDataTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isDataMiningPointDataType(event.target.value)) return;
      if (pointSettings.dataMiningPointDataType !== null)
        actions.removeDataMiningColumn(column, pointSettings.dataMiningPointDataType);
      actions.setPointColumnSettings(pointSettings, { dataMiningPointDataType: event.target.value });
      onDataMiningTypeChange(event.target.value);
    };
    return (
      <Box className="data-mining-type-container">
        <TSCRadioGroup
          onChange={handleDataTypeChange}
          name={t("settings.column.datamining-menu.options-title.plot")}
          value={pointSettings.dataMiningPointDataType}
          radioArray={[
            { value: "Frequency", label: t("settings.column.datamining-menu.options.frequency") },
            { value: "Maximum Value", label: t("settings.column.datamining-menu.options.max-val") },
            { value: "Minimum Value", label: t("settings.column.datamining-menu.options.min-val") },
            { value: "Average Value", label: t("settings.column.datamining-menu.options.avg-val") },
            { value: "Rate of Change", label: t("settings.column.datamining-menu.options.roc") }
          ]}
        />
      </Box>
    );
  }
);
