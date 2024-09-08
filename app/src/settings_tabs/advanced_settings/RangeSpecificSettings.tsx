import { ColumnInfo, assertRangeSettings, isRangeSort } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";
import { useTranslation } from "react-i18next";

type RangeSpecificSettingsProps = {
  column: ColumnInfo;
};
export const RangeSpecificSettings: React.FC<RangeSpecificSettingsProps> = observer(
  ({ column }) => {
    const { actions } = useContext(context);
    const { t } = useTranslation();
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
          { value: "first occurrence", label: t("settings.column.menu.first-occurrence") },
          { value: "last occurrence", label: t("settings.column.menu.last-occurrence") },
          { value: "alphabetical", label: t("settings.column.menu.alphabetical") }
        ]}
      />
    );
  }
);
