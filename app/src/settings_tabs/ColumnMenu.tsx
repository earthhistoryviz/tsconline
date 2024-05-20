import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { context } from "../state";
import { FormControlLabel, ToggleButton, Typography } from "@mui/material";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import "./ColumnMenu.css";
import { FontMenu } from "./FontMenu";
import { ChangeBackgroundColor } from "./BackgroundColor";
import { ColumnInfo } from "@tsconline/shared";
import { TSCCheckbox } from "../components";
import { InfoBox } from "./InfoBox";
import { EditWidthField } from "./EditWidthField";
import { EventSpecificSettings } from "./advanced_settings/EventSpecificSettings";
import { PointSettingsPopup } from "./advanced_settings/PointSettingsPopup";
import { EditNameField } from "./EditNameField";
import { DataMiningModal } from "./advanced_settings/DataMiningSettings";
import IconButton from "@mui/material/IconButton";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

export const ColumnMenu = observer(() => {
  const { state, actions } = useContext(context);
  const [openMenu, setOpenMenu] = useState(false);
  const selectedColumn = state.settingsTabs.columnSelected;
  const column = selectedColumn ? state.settingsTabs.columnHashMap.get(selectedColumn!) : undefined;
  function showMenu() {
    const menu = document.getElementById("ColumnMenuContent");
    const label = document.getElementById("ColumnMenuLabel");
    if (menu !== null && label !== null) {
      if (!openMenu) {
        menu.style.display = "flex";
        label.style.display = "flex";
        setOpenMenu(true);
      } else {
        menu.style.display = "none";
        label.style.display = "none";
        setOpenMenu(false);
      }
    }
  }

  // Handle increment and decrement of accordion position
  const incrementPosition = () => {
    if (column) {
      actions.incrementColumnPosition(column);
    }
  };

  const decrementPosition = () => {
    if (column) {
      actions.decrementColumnPosition(column);
    }
  };

  return (
    <div className={openMenu ? "column-menu" : ""}>
      <div className="column-menu-header">
        <div className="column-settings-cog">
          <ToggleButton
            value="check"
            selected={openMenu}
            onChange={() => {
              showMenu();
            }}
            size="small">
            <SettingsSharpIcon />
          </ToggleButton>
        </div>
        <div id="ColumnMenuLabel" className="column-menu-label">
          <Typography>Settings</Typography>
        </div>
      </div>
      <div id="ColumnMenuContent" className="column-menu-content">
        {column && (
          <>
            <EditNameField column={column} />
            {column.children.length === 0 && <ChangeBackgroundColor column={column} />}
            <FontMenu column={column} />
            <ShowTitles column={column} />
            {column.width !== undefined && column.columnDisplayType !== "Ruler" && (
              <EditWidthField key={column.name} column={column} />
            )}
            <EventSpecificSettings column={column} />
            <PointSettingsPopup column={column} />
            <DataMiningModal column={column} />
            {!!column.popup && <InfoBox info={column.popup} />}
            <PointSettingsPopup column={column} />

            {/* Buttons to change order of accordion items */}
            <div className="accordion-position-controls">
              <IconButton onClick={incrementPosition}>
                <ArrowUpwardIcon />
              </IconButton>
              <IconButton onClick={decrementPosition}>
                <ArrowDownwardIcon />
              </IconButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
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
