import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { Box, Button, Typography } from "@mui/material";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import "./ColumnMenu.css";
import { FontMenu } from "../FontMenu";
import { ChangeBackgroundColor } from "./BackgroundColor";
import { RangeSettings, assertRangeSettings } from "@tsconline/shared";
import { CustomFormControlLabel, GenericTextField, StyledScrollbar, TSCButton, TSCCheckbox } from "../../components";
import { InfoBox } from "./InfoBox";
import { EventSpecificSettings } from "../advanced_settings/EventSpecificSettings";
import { PointSettingsDisplay } from "../advanced_settings/PointSettingsPopup";
import { EditNameField } from "./EditNameField";
import AccordionPositionControls from "./AccordionPositionControls";
import { RangeSpecificSettings } from "../advanced_settings/RangeSpecificSettings";
import { ZoneSpecificSettings } from "../advanced_settings/ZoneSpecificSettings";
import { AgeRulerSpecificSettings } from "../advanced_settings/AgeRulerSpecificSettings";
import { setColumnMenuTabValue } from "../../state/actions";
import { useTranslation } from "react-i18next";
import { RenderColumnInfo } from "../../types";
import Color from "color";
import { useTheme } from "@mui/material/styles";

export const ColumnMenu = observer(() => {
  const { state, actions } = useContext(context);
  const selectedColumn = state.columnMenu.columnSelected;
  const column = selectedColumn ? state.settingsTabs.columnHashMap.get(selectedColumn) : undefined;
  const { t } = useTranslation();

  if (!column) {
    return (
      <div className="column-detail column-detail-empty">
        <ViewColumnOutlinedIcon className="column-detail-empty-icon" />
        <Typography variant="subtitle1" fontWeight={600}>
          {t("settings.column.empty-state.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" className="column-detail-empty-text">
          {t("settings.column.empty-state.description")}
        </Typography>
      </div>
    );
  }

  return (
    <div className="column-detail">
      <div className="column-detail-header">
        <Typography variant="h6" fontWeight={600} noWrap className="column-detail-name">
          {column.editName}
        </Typography>
        <ColumnDetailTabs
          tabs={state.columnMenu.tabs}
          value={state.columnMenu.tabValue}
          onChange={(index) => {
            const tab = state.columnMenu.tabs[index];
            if (tab === "Data Mining" || tab === "Overlay") {
              actions.setCustomColumnMenuOpen(true, tab);
              return;
            }
            setColumnMenuTabValue(index);
          }}
        />
      </div>
      <Box className="column-detail-body" sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ColumnContent tab={state.columnMenu.tabs[state.columnMenu.tabValue]} column={column} />
      </Box>
    </div>
  );
});

type ColumnDetailTabsProps = {
  tabs: string[];
  value: number;
  onChange: (index: number) => void;
};

const ColumnDetailTabs: React.FC<ColumnDetailTabsProps> = observer(({ tabs, value, onChange }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <div
      className="column-detail-tabs"
      style={{ backgroundColor: Color(theme.palette.button.main).alpha(0.12).string() }}>
      {tabs.map((tab, index) => (
        <Button
          key={tab}
          setting-tour={`setting-tour-${tab}-tab`}
          className={`column-detail-tab ${index === value ? "column-detail-tab-active" : ""}`}
          style={
            index === value
              ? { backgroundColor: theme.palette.button.main, color: theme.palette.button.contrastText }
              : undefined
          }
          onClick={() => onChange(index)}>
          {t(`settingsTabs.${tab}`)}
        </Button>
      ))}
    </div>
  );
});

type ColumnContentProps = {
  tab: string;
  column: RenderColumnInfo;
};
const ColumnContent: React.FC<ColumnContentProps> = observer(({ tab, column }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  function addBlankColumn() {
    actions.addBlankColumn(column);
  }
  function addAgeColumn() {
    actions.addAgeColumn(column);
  }

  switch (tab) {
    case "General":
      return (
        <StyledScrollbar style={{ flex: 1, minHeight: 0 }}>
          <Box display="flex" flexDirection="column" gap="12px">
            <EditNameField column={column} />
            {column.children.length === 0 && <ChangeBackgroundColor column={column} />}
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
                  <Typography>{t("settings.column.menu.add-blank-column")}</Typography>
                </TSCButton>
                <TSCButton className="add-blank-or-age-button" onClick={addAgeColumn}>
                  <Typography>{t("settings.column.menu.add-age-column")}</Typography>
                </TSCButton>
              </Box>
            )}
            {!!column.popup && <InfoBox info={column.popup} />}
          </Box>
        </StyledScrollbar>
      );
    case "Font":
      return <FontMenu column={column} />;
    case "Curve Drawing":
      return <PointSettingsDisplay column={column} />;
    default:
      return null;
  }
});

function addRangeFields(
  column: RenderColumnInfo,
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

const ShowTitles = observer(({ column }: { column: RenderColumnInfo }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  return (
    <div className="show-titles-container">
      <CustomFormControlLabel
        name="enableTitle"
        label={t("settings.column.menu.enable-title")}
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
          label={t("settings.column.menu.show-age-label")}
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
          label={t("settings.column.menu.show-uncertainty")}
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
