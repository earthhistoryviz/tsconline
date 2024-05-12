import { observer } from "mobx-react-lite";
import { useContext, useRef } from "react";
import { context } from "../state";
import { Button, TextField, Typography } from "@mui/material";
import "./ColumnMenu.css";
import { ColumnInfo } from "@tsconline/shared";

export const EditNameField: React.FC<{
  column: ColumnInfo;
}> = observer(({ column }) => {
  const { actions } = useContext(context);
  const editName = useRef("");
  const name = column.editName;
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
              actions.setEditName(editName.current, column);
            }}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
});
