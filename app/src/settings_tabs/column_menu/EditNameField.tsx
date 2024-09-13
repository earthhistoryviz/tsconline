import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { TextField, Typography } from "@mui/material";
import "./ColumnMenu.css";
import { ColumnInfo } from "@tsconline/shared";

export const EditNameField: React.FC<{
  column: ColumnInfo;
  text: string;
}> = observer(({ column, text }) => {
  const { actions } = useContext(context);
  return (
    <div>
      <Typography id="edit-name-text">{text}</Typography>
      <TextField
        hiddenLabel
        fullWidth
        id="editNameTextField"
        value={column.editName}
        onChange={(event) => {
          actions.setEditName(event.target.value, column);
        }}
        variant="outlined"
        size="small"
      />
    </div>
  );
});
