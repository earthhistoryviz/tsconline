import { ColumnInfo, assertRangeSettings, isRangeSort } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";

type RangeSpecificSettingsProps = {
  column: ColumnInfo;
  firstOccurrenceText: string;
  lastOccurrenceText: string;
  alphabeticalText: string;
};
export const RangeSpecificSettings: React.FC<RangeSpecificSettingsProps> = observer(({ column, firstOccurrenceText,
  lastOccurrenceText, alphabeticalText }) => {
  const { actions } = useContext(context);
  if (column.columnDisplayType !== "Range" || !column.columnSpecificSettings) return null;
  assertRangeSettings(column.columnSpecificSettings);
  const handleRangeSortChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    assertRangeSettings(column.columnSpecificSettings);
    const value = event.target.value;
    if (!isRangeSort(value) || !column.columnSpecificSettings) {
      actions.pushSnackbar("This feature is not yet implemented for value " + value + ".", "warning");
      return;
    }
    actions.setRangeColumnSettings(column.columnSpecificSettings, { rangeSort: value });
  };
  return (
    <TSCRadioGroup
      onChange={handleRangeSortChange}
      value={column.columnSpecificSettings.rangeSort}
      name={""}
      radioArray={[
        { value: "first occurrence", label: firstOccurrenceText },
        { value: "last occurrence", label: lastOccurrenceText },
        { value: "alphabetical", label: alphabeticalText }
      ]}
    />
  );
});
