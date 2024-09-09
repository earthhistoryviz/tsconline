import { ColumnInfo, assertRulerSettings } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";
import { useTranslation } from "react-i18next";

type AgeRulerSpecificSettingsProps = {
  column: ColumnInfo;
};

export const AgeRulerSpecificSettings: React.FC<AgeRulerSpecificSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  if (column.columnDisplayType !== "Ruler" || !/^Age \d+ for .+$/.test(column.name)) return null;
  assertRulerSettings(column.columnSpecificSettings);
  function changeAgeColumnJustification(event: React.ChangeEvent<HTMLInputElement>) {
    const newJustification = event.target.value === "right" ? "right" : "left";
    actions.changeAgeColumnJustification(column, newJustification);
  }

  return (
    <TSCRadioGroup
      onChange={changeAgeColumnJustification}
      name={t("settings.column.menu.ruler.title")}
      value={column.columnSpecificSettings.justification}
      radioArray={[
        { value: "left", label: t("settings.column.menu.ruler.left") },
        { value: "right", label: t("settings.column.menu.ruler.right") }
      ]}
    />
  );
});
