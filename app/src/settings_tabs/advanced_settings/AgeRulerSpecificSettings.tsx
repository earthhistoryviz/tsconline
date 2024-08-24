import { ColumnInfo, assertRulerSettings } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";
import { title } from "process";

type AgeRulerSpecificSettingsProps = {
  column: ColumnInfo;
  titleText: string;
  leftText: string;
  rightText: string;
};

export const AgeRulerSpecificSettings: React.FC<AgeRulerSpecificSettingsProps> = observer(({ column, titleText, leftText, rightText }) => {
  const { actions } = useContext(context);
  if (column.columnDisplayType !== "Ruler" || !/^Age \d+ for .+$/.test(column.name)) return null;
  assertRulerSettings(column.columnSpecificSettings);
  function changeAgeColumnJustification(event: React.ChangeEvent<HTMLInputElement>) {
    const newJustification = event.target.value === "right" ? "right" : "left";
    actions.changeAgeColumnJustification(column, newJustification);
  }

  return (
    <TSCRadioGroup
      onChange={changeAgeColumnJustification}
      name={titleText}
      value={column.columnSpecificSettings.justification}
      radioArray={[
        { value: "left", label: leftText },
        { value: "right", label: rightText }
      ]}
    />
  );
});
