import { ColumnInfo, assertZoneSettings } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";
import { useTranslation } from "react-i18next";

type ZoneSpecificSettingsProps = {
  column: ColumnInfo;
};

export const ZoneSpecificSettings: React.FC<ZoneSpecificSettingsProps> = observer(
  ({ column }) => {
    const { actions } = useContext(context);
    const { t } = useTranslation();
    if (column.columnDisplayType !== "Zone") return null;
    assertZoneSettings(column.columnSpecificSettings);
    function changeZoneColumnOrientation(event: React.ChangeEvent<HTMLInputElement>) {
      const newOrientation = event.target.value === "vertical" ? "vertical" : "normal";
      actions.changeZoneColumnOrientation(column, newOrientation);
    }
    return (
      <TSCRadioGroup
        onChange={changeZoneColumnOrientation}
        name={t("settings.column.menu.orientation.title")}
        value={column.columnSpecificSettings.orientation}
        radioArray={[
          { value: "normal", label: t("settings.column.menu.orientation.horizontal") },
          { value: "vertical", label: t("settings.column.menu.orientation.vertical") }
        ]}
      />
    );
  }
);
