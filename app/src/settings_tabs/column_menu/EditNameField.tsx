import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { TextField, Typography } from "@mui/material";
import "./ColumnMenu.css";
import { ColumnInfo } from "@tsconline/shared";
import { useTranslation } from "react-i18next";

export const EditNameField: React.FC<{
  column: ColumnInfo;
}> = observer(({ column }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  return (
    <div>
      <Typography id="edit-name-text">{t("settings.column.menu.edit-name")}</Typography>
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
