import { ColumnInfo, assertZoneSettings } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";

type ZoneSpecificSettingsProps = {
  column: ColumnInfo;
};

export const ZoneSpecificSettings: React.FC<ZoneSpecificSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  if (column.columnDisplayType !== "Zone") return null;
  function changeZoneColumnOrientation(event: React.ChangeEvent<HTMLInputElement>) {
    const newOrientation = event.target.value === "vertical" ? "vertical" : "normal";
    actions.changeZoneColumnOrientation(column, newOrientation);
  }
  assertZoneSettings(column.columnSpecificSettings);
  return (
    <TSCRadioGroup
      onChange={changeZoneColumnOrientation}
      name={"Label Orientation"}
      value={column.columnSpecificSettings.orientation}
      radioArray={[
        { value: "normal", label: "Horizontal" },
        { value: "vertical", label: "Vertical" }
      ]}
    />
  );
});
