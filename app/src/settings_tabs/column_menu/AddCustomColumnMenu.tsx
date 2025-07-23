import { useTheme, Theme, styled } from "@mui/material/styles";
import {
  Radio,
  Dialog,
  DialogContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  FormHelperText,
  Box
} from "@mui/material";
import { EventFrequency, DataMiningPointDataType } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { StyledScrollbar, TSCButton } from "../../components";
import { createGradient, getChildRenderColumns } from "../../util/util";
import { DataMiningSettings } from "../advanced_settings/DataMiningSettings";
import { OverlayColumnAccordion } from "../advanced_settings/OverlaySettings";
import { context } from "../../state";
import BarChartIcon from "@mui/icons-material/BarChart";
import SpokeRoundedIcon from "@mui/icons-material/SpokeRounded";
import SettingsIcon from "@mui/icons-material/Settings";
import "./AddCustomColumnMenu.css";
import { useTranslation } from "react-i18next";
import { RenderColumnInfo } from "../../types";
import { ColumnContext } from "../Column";

type AddCustomColumnMenuProps = {
  column: RenderColumnInfo | undefined;
  onClose: () => void;
};

const CustomColumnPanel = styled(Box)(({ theme }: { theme: Theme }) => ({
  backgroundColor: theme.palette.secondaryBackground.main,
  flex: 1,
  border: "1px solid black",
  minWidth: 0
}));
const CustomRadioButton = styled(Radio)(({ theme }: { theme: Theme }) => ({
  color: theme.palette.button.main,
  "&.Mui-checked": {
    color: theme.palette.button.main
  }
}));

export const AddCustomColumnMenu: React.FC<AddCustomColumnMenuProps> = observer(({ column, onClose }) => {
  if (!column) return null;
  const { state, actions } = useContext(context);
  const { state: chartState } = useContext(ColumnContext);
  const theme = useTheme();
  const { t } = useTranslation();
  const icons = [BarChartIcon, SpokeRoundedIcon, SettingsIcon];
  const gradient = createGradient(theme.palette.mainGradientLeft.main, theme.palette.mainGradientRight.main);
  const [columnType, setColumnType] = useState<"Data Mining" | "Overlay">(() => {
    const tab = state.columnMenu.tabs[state.columnMenu.tabValue];
    if (tab === "Data Mining" || tab === "Overlay") {
      return tab;
    }
    return "Data Mining";
  });
  const columnSelected = state.columnMenu.columnSelected
    ? state.settingsTabs.columnHashMap.get(state.columnMenu.columnSelected) ?? null
    : null;
  const [baseColumn, setBaseColumn] = useState<RenderColumnInfo | null>(
    columnSelected?.columnDisplayType === "Point" || columnSelected?.columnDisplayType === "Event"
      ? columnSelected
      : null
  );
  const [overlayColumn, setOverlayColumn] = useState<RenderColumnInfo | null>(null);
  const [dataMiningEventType, setInternalDataMiningEventType] = useState<
    EventFrequency | DataMiningPointDataType | null
  >(null);
  const setDataMiningEventType = (value: EventFrequency | DataMiningPointDataType) => {
    setInternalDataMiningEventType(value);
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{ className: "add-custom-column-menu-paper" }}>
      <StyledScrollbar className="custom-columns-menu-scrollbar">
        <DialogContent
          sx={{ backgroundColor: theme.palette.backgroundColor.main, overflow: "hidden" }}
          className="add-custom-column-menu-content">
          <Box display="grid" height="100%">
            <Box gridRow="1" gridColumn="1" display="flex" alignItems="center" justifyContent="center">
              <Box className="add-custom-column-menu-black-line" />
            </Box>
            <Box display="flex" justifyContent="space-between" gridRow="1" gridColumn="1">
              {icons.map((Icon, index) => (
                <Box
                  key={index}
                  className="custom-columns-menu-icon"
                  sx={{
                    background: gradient.main
                  }}>
                  <Icon
                    sx={{
                      "& path": {
                        fill: "none",
                        stroke: "black",
                        strokeWidth: 1.0
                      },
                      fontSize: 30
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" textAlign="center" flex={1}>
              {t("settings.column.add-custom-column-menu.base-column-header")}
            </Typography>
            <Typography variant="h6" textAlign="center" flex={1}>
              {t("settings.column.add-custom-column-menu.type-column-header")}
            </Typography>
            <Typography variant="h6" textAlign="center" flex={1}>
              {t("settings.column.add-custom-column-menu.customize-column-header")}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" height="70vh" gap={3}>
            <CustomColumnPanel p={2}>
              <StyledScrollbar>
                {getChildRenderColumns(column, chartState.columnHashMap).map((column) => (
                  <OverlayColumnAccordion key={column.name} column={column} onColumnClick={setBaseColumn} />
                ))}
              </StyledScrollbar>
            </CustomColumnPanel>
            <CustomColumnPanel height="fit-content">
              <RadioGroup
                value={columnType}
                sx={{ m: 2 }}
                onChange={(e) => setColumnType(e.target.value as typeof columnType)}>
                <FormControlLabel
                  value="Data Mining"
                  control={<CustomRadioButton size="small" />}
                  label="Data Mining"
                />
                <FormHelperText sx={{ ml: 3.5, mt: -1 }}>
                  {t("settings.column.add-custom-column-menu.data-mining-description")}
                </FormHelperText>
                <FormControlLabel
                  value="Overlay"
                  control={<CustomRadioButton size="small" />}
                  label="Dual Column Comparison"
                />
                <FormHelperText sx={{ ml: 3.5, mt: -1 }}>
                  {t("settings.column.add-custom-column-menu.dual-column-comparison-description")}
                </FormHelperText>
              </RadioGroup>
            </CustomColumnPanel>
            <CustomColumnPanel p={2}>
              {!baseColumn ? (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <Typography variant="h4" textAlign="center">
                    {t("settings.column.add-custom-column-menu.select-base-column")}
                  </Typography>
                </Box>
              ) : columnType === "Data Mining" ? (
                <DataMiningSettings column={baseColumn} onDataMiningTypeChange={setDataMiningEventType} />
              ) : (
                <StyledScrollbar>
                  {getChildRenderColumns(column, chartState.columnHashMap).map((column) => (
                    <OverlayColumnAccordion key={column.name} column={column} onColumnClick={setOverlayColumn} />
                  ))}
                </StyledScrollbar>
              )}
            </CustomColumnPanel>
          </Box>
          <Box display="flex" justifyContent="flex-end">
            <Typography variant="caption" className="dcc-accordion-caption">
              {t("settings.column.overlay-menu.overlay-accordion-caption")}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="flex-end" gap={3} mt={1}>
            <TSCButton variant="outlined" onClick={onClose}>
              {t("general-actions.cancel")}
            </TSCButton>
            <TSCButton
              disabled={
                !baseColumn ||
                (columnType === "Data Mining" && !dataMiningEventType) ||
                (columnType === "Overlay" && !overlayColumn)
              }
              onClick={() => {
                if (!baseColumn) return;
                let newColumnName: string | undefined;
                if (columnType === "Data Mining") {
                  if (!dataMiningEventType) return;
                  newColumnName = actions.addDataMiningColumn(baseColumn, dataMiningEventType);
                } else if (columnType === "Overlay") {
                  if (!overlayColumn) return;
                  actions.setDrawDualColCompColumn(baseColumn, overlayColumn);
                  newColumnName = actions.addDualColCompColumn(baseColumn);
                }
                if (newColumnName) {
                  const newColumn = state.settingsTabs.columnHashMap.get(newColumnName);
                  if (!newColumn) return;
                  actions.setColumnOn(false, newColumn);
                  actions.toggleSettingsTabColumn(newColumn, { expand: true });
                  actions.setColumnSelected(newColumnName);
                }
                onClose();
              }}>
              {t("settings.column.add-custom-column-menu.create-column")}
            </TSCButton>
          </Box>
        </DialogContent>
      </StyledScrollbar>
    </Dialog>
  );
});
