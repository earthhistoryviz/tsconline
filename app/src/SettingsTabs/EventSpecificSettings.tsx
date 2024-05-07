import { ColumnInfo, assertEventSettings, isEventType, isRangeSort } from "@tsconline/shared";
import { TSCRadioGroup } from "../components/TSCRadioGroup";
import EventLogo from "../assets/settings_icons/col_icon_event.png";
import RangeLogo from "../assets/settings_icons/col_icon_range.png";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../state";
import "./EventSpecificSettings.css";

type EventSpecificSettingsProps = {
  column: ColumnInfo;
};
export const EventSpecificSettings: React.FC<EventSpecificSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  if (column.columnDisplayType !== "Event" || !column.columnSpecificSettings) return null;
  assertEventSettings(column.columnSpecificSettings);
  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!isEventType(value) || !column.columnSpecificSettings) {
      actions.pushSnackbar("This feature is not yet implemented for value " + value + ".", "warning");
      return;
    }
    actions.setEventColumnSettings(column.columnSpecificSettings, { type: value });
  };
  const handleRangeSortChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!isRangeSort(value) || !column.columnSpecificSettings) {
      actions.pushSnackbar("This feature is not yet implemented for value " + value + ".", "warning");
      return;
    }
    actions.setEventColumnSettings(column.columnSpecificSettings, { rangeSort: value });
  };
  return (
    <>
      <TSCRadioGroup
        onChange={handleTypeChange}
        value={column.columnSpecificSettings.type}
        name={""}
        radioArray={[
          { value: "events", label: "Events", imageSrc: EventLogo },
          { value: "ranges", label: "Ranges", imageSrc: RangeLogo }
        ]}
      />
      <TSCRadioGroup
        className="range-sort-sub-radio-group"
        disabled={column.columnSpecificSettings.type === "events"}
        onChange={handleRangeSortChange}
        value={column.columnSpecificSettings.rangeSort}
        name={""}
        radioArray={[
          { value: "first occurrence", label: "First Occurrence" },
          { value: "last occurrence", label: "Last Occurrence" },
          { value: "alphabetical", label: "Alphabetical" }
        ]}
      />
    </>
  );
});
