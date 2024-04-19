import { observer } from "mobx-react-lite";
import { useContext, useRef, useState } from "react";
import { context } from "../state";
import { Button, FormControlLabel, TextField, ToggleButton, Typography } from "@mui/material";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import "./ColumnMenu.css";
import { FontMenu } from "./FontMenu";
import { ChangeBackgroundColor } from "./BackgroundColor";
import { Padding } from "@mui/icons-material";
import { ColumnInfo } from "@tsconline/shared";
import { TSCCheckbox } from "../components";
import { InfoBox } from "./InfoBox";

const EditNameField = observer(() => {
  const { state, actions } = useContext(context);
  const editName = useRef("");
  const name =
    state.settingsTabs.columnSelected === null
      ? ""
      : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.editName;
  return (
    <div>
      <Typography style={{ padding: "5px" }}>Edit Title</Typography>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <TextField
          hiddenLabel
          id="editNameTextField"
          defaultValue={name}
          key={name}
          onChange={(event) => {
            editName.current = event.target.value;
          }}
          variant="filled"
          size="small"
        />
        <div className="edit-title-button">
          <Button
            color="secondary"
            variant="contained"
            onClick={() => {
              actions.updateEditName(editName.current);
            }}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
});

export const ColumnMenu = observer(() => {
  const { state } = useContext(context);
  const [openMenu, setOpenMenu] = useState(false);
  const selectedColumn = state.settingsTabs.columnSelected;
  const column = selectedColumn ? state.settingsTabs.columnHashMap.get(selectedColumn!) : undefined;
  const info =
    state.settingsTabs.columnSelected === null
      ? ""
      : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)?.popup;
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
  return (
    <div className={openMenu ? "column-menu" : ""}>
      <div style={{ display: "flex", flexDirection: "row", width: "300px" }}>
        <div style={{ backgroundColor: "lightgray" }}>
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
        {column && <EditNameField />}
        {column && <ChangeBackgroundColor column={column}/>}
        {column && <FontMenu column={column} />}
        {column && <ShowTitles column={column} />}
        {!!info && <InfoBox info={info} />}
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
    </div>
  );
});
