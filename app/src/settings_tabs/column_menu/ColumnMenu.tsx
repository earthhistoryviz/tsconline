import { observer } from "mobx-react-lite";
import { useContext, useEffect } from "react";
import { context } from "../../state";
import { Box, Typography } from "@mui/material";
import "./ColumnMenu.css";
import { FontMenu } from "../FontMenu";
import { ChangeBackgroundColor } from "./BackgroundColor";
import { ColumnInfo, RangeSettings, assertRangeSettings } from "@tsconline/shared";
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
import { setColumnMenuTabValue } from "../../state/actions";
import { useTranslation } from "react-i18next";

export const ColumnMenu = observer(() => {
  const { state } = useContext(context);
  const selectedColumn = state.columnMenu.columnSelected;
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
  const { t } = useTranslation();
  return (
    <div className="column-menu">
      <div className="column-menu-header">
        <div className="column-menu-label">
          <Typography component="h1" variant="h5" whiteSpace={"nowrap"}>
            {t("settings.column.titles.column-menu-title")}
          </Typography>
        </div>
      </div>
      <CustomDivider className="settings-header-divider" />
      <div className="column-menu-content-container">
        <CustomTabs
          id="ColumnMenuCustomTabs"
          className="column-menu-custom-tabs"
          tabIndicatorLength={25}
          value={state.columnMenu.tabValue}
          verticalCenter
          onChange={(index) => setColumnMenuTabValue(index)}
          orientation="vertical-right"
          width={90}
          tabs={state.columnMenu.tabs.map((val) => ({ id: val, tab: val }))}
        />
        <Box border={1} borderColor="divider" className="column-menu-content" bgcolor="secondaryBackground.main">
          {column && <ColumnContent tab={state.columnMenu.tabs[state.columnMenu.tabValue]} column={column} />}
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
  const { t } = useTranslation(); //pass translation to components to avoid hook bugs
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
            <EditNameField column={column} text={t("settings.column.menu.edit-name")} />
            {column.children.length === 0 && <ChangeBackgroundColor column={column} text={t("settings.column.menu.background-color")} />}
            {column.width !== undefined && column.columnDisplayType !== "Ruler" && (
              <GenericTextField
                orientation="start"
                helperOrientation="start"
                inputs={[
                  {
                    helperText: t("settings.column.menu.width"),
                    id: "width",
                    value: column.width,
                    onValueChange: (value: number) => {
                      actions.setWidth(value, column);
                    }
                  },
                  ...addRangeFields(column, actions.setRangeColumnSettings)
                ]}
              />
            )}
            <div className="column-advanced-controls">
              <AccordionPositionControls column={column} text={t("settings.column.menu.shift-row")} />
            </div>
            <ShowTitles column={column} showTitleText={t("settings.column.menu.enable-title")} showAgeText={t("settings.column.menu.show-age-label")} showUncertaintyText={t("settings.column.menu.show-uncertainty")} />
            <EventSpecificSettings column={column} eventsText={t("settings.column.menu.events")} rangesText={t("settings.column.menu.ranges")} firstOccurrenceText={t("settings.column.menu.first-occurrence")} lastOccurrenceText={t("settings.column.menu.last-occurrence")} alphabeticalText={t("settings.column.menu.alphabetical")} />
            <RangeSpecificSettings column={column} firstOccurrenceText={t("settings.column.menu.first-occurrence")} lastOccurrenceText={t("settings.column.menu.last-occurrence")} alphabeticalText={t("settings.column.menu.alphabetical")} />
            <AgeRulerSpecificSettings column={column} titleText={t("settings.column.menu.ruler.title")} leftText={t("settings.column.menu.ruler.left")} rightText={t("settings.column.menu.ruler.right")} />
            <ZoneSpecificSettings column={column} titleText={t("settings.column.menu.orientation.title")} horizontalText={t("settings.column.menu.orientation.horizontal")} verticalText={t("settings.column.menu.orientation.vertical")} />
            {column.children.length != 0 && (
              <Box className="add-blank-or-age-button-container">
                <TSCButton className="add-blank-or-age-button" onClick={addBlankColumn}>
                  <Typography>{t("settings.column.menu.add-blank-column")}</Typography>
                </TSCButton>
                <TSCButton className="add-blank-or-age-button" onClick={addAgeColumn}>
                  <Typography>{t("settings.column.menu.add-age-column")}</Typography>
                </TSCButton>
              </Box>
            )}
            {!!column.popup && <InfoBox info={column.popup} titleText={t("settings.column.menu.info-box")} />}
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
function addRangeFields(
  column: ColumnInfo,
  setRangeColumnSettings: (r: RangeSettings, n: Partial<RangeSettings>) => void
) {
  if (!column.columnSpecificSettings || column.columnDisplayType !== "Range") return [];
  assertRangeSettings(column.columnSpecificSettings);
  return [
    {
      helperText: "Margin",
      id: "margin",
      value: column.columnSpecificSettings.margin,
      onValueChange: (value: number) => {
        assertRangeSettings(column.columnSpecificSettings);
        setRangeColumnSettings(column.columnSpecificSettings, { margin: value });
      }
    },
    {
      helperText: "Age Pad",
      id: "agePad",
      value: column.columnSpecificSettings.agePad,
      onValueChange: (value: number) => {
        assertRangeSettings(column.columnSpecificSettings);
        setRangeColumnSettings(column.columnSpecificSettings, { agePad: value });
      }
    }
  ];
}

const ShowTitles = observer(({ column, showTitleText, showAgeText, showUncertaintyText }: { column: ColumnInfo, showTitleText: string, showAgeText: string, showUncertaintyText: string }) => {
  const { actions } = useContext(context);
  return (
    <div className="show-titles-container">
      <CustomFormControlLabel
        name="enableTitle"
        label={showTitleText}
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
          label={showAgeText}
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
          label={showUncertaintyText}
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
