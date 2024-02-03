import { observer } from "mobx-react-lite";
import { useContext, useRef, useState } from "react";
import { context } from "../state";
import { Button, TextField, ToggleButton, Typography } from "@mui/material";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";

const EditNameField: React.FC<{}> = observer(({}) => {
  const { state, actions } = useContext(context);
  let editName = useRef("");
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
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
});

export const ColumnMenu: React.FC<{}> = observer(() => {
  const { state, actions } = useContext(context);
  const [openMenu, setOpenMenu] = useState(false);
  function showMenu() {
    let menu = document.getElementById("ColumnMenu");
    let label = document.getElementById("ColumnMenuLabel");
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
            size="small"
          >
            <SettingsSharpIcon />
          </ToggleButton>
        </div>
        <div id="ColumnMenuLabel" className="column-menu-label">
          <Typography>Settings</Typography>
        </div>
      </div>
      <div id="ColumnMenu" style={{ display: "none" }}>
        {state.settingsTabs.columnSelected && <EditNameField />}
      </div>
    </div>
  );
});
