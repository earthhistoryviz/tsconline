import { ColumnInfo, assertRulerSettings, assertZoneSettings } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";

type AgeRulerSpecificSettingsProps = {
  column: ColumnInfo;
};

export const AgeRulerSpecificSettings: React.FC<AgeRulerSpecificSettingsProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  if (column.columnDisplayType !== "Ruler" || !/^Age \d+ for .+$/.test(column.name)) return null;
  assertRulerSettings(column.columnSpecificSettings);
  function changeAgeColumnJustification(event: React.ChangeEvent<HTMLInputElement>) {
    const newJustification = event.target.value === "right" ? "right" : "left";
    actions.changeAgeColumnJustification(column, newJustification);
  }
  assertZoneSettings(column.columnSpecificSettings);
  return (
    <TSCRadioGroup
      onChange={changeAgeColumnJustification}
      name={"Age Ruler Justification"}
      value={column.columnSpecificSettings.justification}
      radioArray={[
        { value: "left", label: "Left" },
        { value: "right", label: "Right" }
      ]}
    />
  );
});
