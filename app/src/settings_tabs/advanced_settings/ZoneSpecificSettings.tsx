import { ColumnInfo, assertZoneSettings } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";
import { useTranslation } from "react-i18next";

type ZoneSpecificSettingsProps = {
  column: ColumnInfo;
  titleText: string;
  horizontalText: string;
  verticalText: string;
};

export const ZoneSpecificSettings: React.FC<ZoneSpecificSettingsProps> = observer(({ column, titleText, horizontalText, verticalText }) => {
  const { actions } = useContext(context);
  if (column.columnDisplayType !== "Zone") return null;
  assertZoneSettings(column.columnSpecificSettings);
  function changeZoneColumnOrientation(event: React.ChangeEvent<HTMLInputElement>) {
    const newOrientation = event.target.value === "vertical" ? "vertical" : "normal";
    actions.changeZoneColumnOrientation(column, newOrientation);
  }
  return (
    <TSCRadioGroup
      onChange={changeZoneColumnOrientation}
      name={titleText}
      value={column.columnSpecificSettings.orientation}
      radioArray={[
        { value: "normal", label: horizontalText },
        { value: "vertical", label: verticalText }
      ]}
    />
  );
});
