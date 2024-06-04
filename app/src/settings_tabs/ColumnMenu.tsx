import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import { context } from "../state";
import { FormControlLabel, Typography } from "@mui/material";
import "./ColumnMenu.css";
import { FontMenu } from "./FontMenu";
import { ChangeBackgroundColor } from "./BackgroundColor";
import { ColumnInfo } from "@tsconline/shared";
import { CustomDivider, TSCCheckbox } from "../components";
import { InfoBox } from "./InfoBox";
import { EditWidthField } from "./EditWidthField";
import { EventSpecificSettings } from "./advanced_settings/EventSpecificSettings";
import { PointSettingsPopup } from "./advanced_settings/PointSettingsPopup";
import { EditNameField } from "./EditNameField";
import { DataMiningModal } from "./advanced_settings/DataMiningSettings";
import AccordionPositionControls from "./AccordionPositionControls";
import { CustomTabs } from "../components/TSCCustomTabs";

export const ColumnMenu = observer(() => {
  const { state } = useContext(context);
  const [tabs, setTabs] = useState<string[]>(["General", "Font"]);
  const [tabValue, setTabValue] = useState(0);
  const selectedColumn = state.settingsTabs.columnSelected;
  const column = selectedColumn ? state.settingsTabs.columnHashMap.get(selectedColumn!) : undefined;
  useEffect(() => {
    if (column && (column.columnDisplayType === "Event" || column.columnDisplayType === "Point")) {
      setTabs(["General", "Font", "Curve Drawing", "Data Mining"]);
    } else setTabs(["General", "Font"]);
  }, [column]);
  return (
    <div className="column-menu">
      <div className="column-menu-header">
        <div id="ColumnMenuLabel" className="column-menu-label">
          <Typography component="h1" variant="h5" whiteSpace={"nowrap"}>
            Column Customization
          </Typography>
        </div>
      </div>
      <CustomDivider className="settings-header-divider" />
      <div className="column-menu-content-container">
        <CustomTabs
          className="column-menu-custom-tabs"
          tabIndicatorLength={29}
          value={tabValue}
          onChange={(index) => setTabValue(index)}
          orientation="vertical-right"
          width={90}
          tabs={tabs}
        />
        <div className="column-menu-content">
          {column && <ColumnContent tab={tabs[tabValue]} column={column} />}
          {/* {column && (
            <>
              <EditNameField column={column} />
              <FontMenu column={column} />
              {column.children.length === 0 && <ChangeBackgroundColor column={column} />}
              {column.width !== undefined && column.columnDisplayType !== "Ruler" && (
                <EditWidthField key={column.name} column={column} />
              )}
              <div className="column-advanced-controls">
                <PointSettingsPopup column={column} />
                <DataMiningModal column={column} />
                <AccordionPositionControls column={column} />
              </div>
              <ShowTitles column={column} />
              <EventSpecificSettings column={column} />
              {!!column.popup && <InfoBox info={column.popup} />}
            </>
          )} */}
        </div>
      </div>
    </div>
  );
});

type ColumnContentProps = {
  tab: string;
  column: ColumnInfo;
};
const ColumnContent: React.FC<ColumnContentProps> = observer(({ tab, column }) => {
  switch (tab) {
    case "General":
      return (
        <>
          <EditNameField column={column} />
          {column.children.length === 0 && <ChangeBackgroundColor column={column} />}
          {column.width !== undefined && column.columnDisplayType !== "Ruler" && (
            <EditWidthField key={column.name} column={column} />
          )}
          <div className="column-advanced-controls">
            <PointSettingsPopup column={column} />
            <DataMiningModal column={column} />
            <AccordionPositionControls column={column} />
          </div>
          <ShowTitles column={column} />
          <EventSpecificSettings column={column} />
          {!!column.popup && <InfoBox info={column.popup} />}
        </>
      );
    case "Font":
      return <FontMenu column={column} />;
    case "Data Mining":
      return <DataMiningModal column={column} />;
    default:
      return null;
  }
});

const ShowTitles = observer(({ column }: { column: ColumnInfo }) => {
  const { actions } = useContext(context);
  return (
    <div className="ShowTitlesContainer">
      <FormControlLabel
        name="enableTitle"
        label="Enable Title"
        control={
          <TSCCheckbox
            outlineColor="gray"
            checked={column.enableTitle}
            onChange={() => {
              actions.setEnableTitle(!column.enableTitle, column);
            }}
          />
        }
      />
      {column.showAgeLabels !== undefined && (
        <FormControlLabel
          name="showAgeLabel"
          label="Show Age Label"
          control={
            <TSCCheckbox
              outlineColor="gray"
              checked={column.showAgeLabels}
              onChange={() => {
                actions.setShowAgeLabels(!column.showAgeLabels, column);
              }}
            />
          }
        />
      )}
      {column.showUncertaintyLabels !== undefined && (
        <FormControlLabel
          name="showUncertaintyLabels"
          label="Show Uncertainty Labels"
          control={
            <TSCCheckbox
              outlineColor="gray"
              checked={column.showUncertaintyLabels}
              onChange={() => {
                actions.setShowUncertaintyLabels(!column.showUncertaintyLabels, column);
              }}
            />
          }
        />
      )}
    </div>
  );
});
