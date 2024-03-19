import { observer } from "mobx-react-lite";
import { useContext, useRef, useState } from "react";
import { context } from "../state";
import { Button, TextField, ToggleButton, Typography } from "@mui/material";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import "./ColumnMenu.css";
import { FontMenu } from "./FontMenu";

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

  const toggleMenu = () => {
    setOpenMenu(!openMenu);
  };

  return (
    <div className={`column-menu ${openMenu ? "open" : ""}`}>
      <div className="column-menu-header">
        <ToggleButton
          value="check"
          selected={openMenu}
          onChange={toggleMenu}
          size="small">
          <SettingsSharpIcon />
        </ToggleButton>
        <Typography>Settings</Typography>
      </div>
      <div id="ColumnMenuContent" className="column-menu-content">
        {state.settingsTabs.columnSelected && <EditNameField />}
        {state.settingsTabs.columnSelected && <FontMenu />}
      </div>
    </div>
  );
});
