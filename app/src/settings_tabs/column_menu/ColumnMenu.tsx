import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import { context } from "../../state";
import { Box, Typography } from "@mui/material";
import "./ColumnMenu.css";
import { FontMenu } from "../FontMenu";
import { ChangeBackgroundColor } from "./BackgroundColor";
import { ColumnInfo, assertRangeSettings } from "@tsconline/shared";
import {
  CustomDivider,
  CustomFormControlLabel,
  GenericTextField,
  StyledScrollbar,
  TSCButton,
  TSCCheckbox
} from "../../components";
import { InfoBox } from "./InfoBox";
import { EventSpecificSettings } from "../advanced_settings/EventSpecificSettings";
import { PointSettingsDisplay } from "../advanced_settings/PointSettingsPopup";
import { EditNameField } from "./EditNameField";
import { DataMiningSettings } from "../advanced_settings/DataMiningSettings";
import AccordionPositionControls from "./AccordionPositionControls";
import { CustomTabs } from "../../components/TSCCustomTabs";
import { RangeSpecificSettings } from "../advanced_settings/RangeSpecificSettings";
import { ZoneSpecificSettings } from "../advanced_settings/ZoneSpecificSettings";
import { AgeRulerSpecificSettings } from "../advanced_settings/AgeRulerSpecificSettings";

export const ColumnMenu = observer(() => {
  const { state } = useContext(context);
  const [tabs, setTabs] = useState<string[]>(["General", "Font"]);
  const [tabValue, setTabValue] = useState(0);
  const selectedColumn = state.settingsTabs.columnSelected;
  const column = selectedColumn ? state.settingsTabs.columnHashMap.get(selectedColumn!) : undefined;

  // Resize the column menu tabs based on the width of the column menu
  const columnAccordionWrapper = document.getElementById("ResizableColumnAccordionWrapper");
  const columnMenuTabs = document.getElementById("ColumnMenuCustomTabs");
  useEffect(() => {
    if (!columnAccordionWrapper || !columnMenuTabs) return;
    function resizeColumnMenuTabs() {
      const width = columnAccordionWrapper?.clientWidth;
      const viewPortWidth = window.innerWidth;
      if (columnAccordionWrapper && width !== undefined && width / viewPortWidth > 0.5) {
        columnMenuTabs?.classList.add("column-menu-tabs-small");
      } else {
        columnMenuTabs?.classList.remove("column-menu-tabs-small");
      }
    }
    const resizeObserver = new ResizeObserver(resizeColumnMenuTabs);
    resizeObserver.observe(columnAccordionWrapper);
    return () => {
      resizeObserver.unobserve(columnAccordionWrapper);
      resizeObserver.disconnect();
    };
  }, []);
  // Set the tabs based on the column type
  useEffect(() => {
    setTabValue(0);
    if (column && (column.columnDisplayType === "Event" || column.columnDisplayType === "Chron")) {
      setTabs(["General", "Font", "Data Mining"]);
    } else if (column && column.columnDisplayType === "Point") {
      setTabs(["General", "Font", "Curve Drawing", "Data Mining"]);
    } else setTabs(["General", "Font"]);
  }, [column]);
  return (
    <div className="column-menu">
      <div className="column-menu-header">
        <div className="column-menu-label">
          <Typography component="h1" variant="h5" whiteSpace={"nowrap"}>
            Column Customization
          </Typography>
        </div>
      </div>
      <CustomDivider className="settings-header-divider" />
      <div className="column-menu-content-container">
        <CustomTabs
          id="ColumnMenuCustomTabs"
          className="column-menu-custom-tabs"
          tabIndicatorLength={25}
          value={tabValue}
          verticalCenter
          onChange={(index) => setTabValue(index)}
          orientation="vertical-right"
          width={90}
          tabs={tabs.map((val) => ({ id: val, tab: val }))}
        />
        <Box border={1} borderColor="divider" className="column-menu-content" bgcolor="secondaryBackground.main">
          {column && <ColumnContent tab={tabs[tabValue]} column={column} />}
        </Box>
      </div>
    </div>
  );
});

type ColumnContentProps = {
  tab: string;
  column: ColumnInfo;
};
const ColumnContent: React.FC<ColumnContentProps> = observer(({ tab, column }) => {
  const { actions } = useContext(context);
  function addBlankColumn() {
    actions.addBlankColumn(column);
  }
  function addAgeColumn() {
    actions.addAgeColumn(column);
  }
  switch (tab) {
    case "General":
      return (
        <StyledScrollbar>
          <Box display="flex" flexDirection="column" gap="10px">
            <EditNameField column={column} />
            {column.children.length === 0 && <ChangeBackgroundColor column={column} />}
            {column.width !== undefined && column.columnDisplayType !== "Ruler" && (
              <GenericTextField
                orientation="start"
                helperOrientation="start"
                inputs={[
                  {
                    helperText: "Width",
                    id: "width",
                    value: column.width,
                    onValueChange: (value: number) => {
                      actions.setWidth(value, column);
                    }
                  },
                  ...addRangeFields(column)
                ]}
              />
            )}
            <div className="column-advanced-controls">
              <AccordionPositionControls column={column} />
            </div>
            <ShowTitles column={column} />
            <EventSpecificSettings column={column} />
            <RangeSpecificSettings column={column} />
            <AgeRulerSpecificSettings column={column} />
            <ZoneSpecificSettings column={column} />
            {column.children.length != 0 && (
              <Box className="add-blank-or-age-button-container">
                <TSCButton className="add-blank-or-age-button" onClick={addBlankColumn}>
                  <Typography>Add Blank Column</Typography>
                </TSCButton>
                <TSCButton className="add-blank-or-age-button" onClick={addAgeColumn}>
                  <Typography>Add Age Column</Typography>
                </TSCButton>
              </Box>
            )}
            {!!column.popup && <InfoBox info={column.popup} />}
          </Box>
        </StyledScrollbar>
      );
    case "Font":
      return <FontMenu column={column} />;
    case "Data Mining":
      return <DataMiningSettings column={column} />;
    case "Curve Drawing":
      return <PointSettingsDisplay column={column} />;
    default:
      return null;
  }
});

/**
 * For generic text field, add range fields if the column is a range column
 * This is done so that the range fields can be displayed in the column menu
 * next to the width field and for flex box to work properly
 * @param column
 * @returns
 */
function addRangeFields(column: ColumnInfo) {
  const { actions } = useContext(context);
  if (!column.columnSpecificSettings || column.columnDisplayType !== "Range") return [];
  assertRangeSettings(column.columnSpecificSettings);
  return [
    {
      helperText: "Margin",
      id: "margin",
      value: column.columnSpecificSettings.margin,
      onValueChange: (value: number) => {
        assertRangeSettings(column.columnSpecificSettings);
        actions.setRangeColumnSettings(column.columnSpecificSettings, { margin: value });
      }
    },
    {
      helperText: "Age Pad",
      id: "agePad",
      value: column.columnSpecificSettings.agePad,
      onValueChange: (value: number) => {
        assertRangeSettings(column.columnSpecificSettings);
        actions.setRangeColumnSettings(column.columnSpecificSettings, { agePad: value });
      }
    }
  ];
}

const ShowTitles = observer(({ column }: { column: ColumnInfo }) => {
  const { actions } = useContext(context);
  return (
    <div className="show-titles-container">
      <CustomFormControlLabel
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
        <CustomFormControlLabel
          width={130}
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
        <CustomFormControlLabel
          width={175}
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
