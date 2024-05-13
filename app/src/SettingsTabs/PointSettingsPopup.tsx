import { Box, Button, Modal, TextField, TextFieldProps, Typography } from "@mui/material";
import { ColumnInfo, PointSettings, assertPointSettings } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { context } from "../state";
import { NumericFormat } from "react-number-format";
import "./PointSettingsPopup.css";

type PointSettingsPopupProps = {
  column: ColumnInfo;
};

type PointSubSettingProps = {
  pointSettings: PointSettings;
};

export const PointSettingsPopup: React.FC<PointSettingsPopupProps> = observer(({ column }) => {
  const [openMenu, setOpenMenu] = useState(false);
  if (column.columnDisplayType !== "Point") return;
  assertPointSettings(column.columnSpecificSettings);
  return (
    <>
      <Button onClick={() => setOpenMenu(true)} variant="contained">
        Point Settings
      </Button>
      <Modal open={openMenu} onClose={() => setOpenMenu(false)}>
        <RangeForm pointSettings={column.columnSpecificSettings as PointSettings} />
      </Modal>
    </>
  );
});

const RangeForm: React.FC<PointSubSettingProps> = observer(({ pointSettings }) => {
  const { actions } = useContext(context);
  const RangeTextField = ({ ...props }: TextFieldProps) => (
    <TextField {...props} className="range-text-field-point-settings" />
  );
  return (
    <Box id="RangeFormContainer">
      <Typography>Range:</Typography>
      <NumericFormat
        value={pointSettings.lowerRange}
        customInput={RangeTextField}
        onValueChange={(values) => {
          const floatValue = values.floatValue;
          if (!floatValue) {
            return;
          }
          actions.setPointColumnSettings(pointSettings, { lowerRange: floatValue });
        }}
      />
      <NumericFormat
        value={pointSettings.upperRange}
        customInput={RangeTextField}
        onValueChange={(values) => {
          const floatValue = values.floatValue;
          if (!floatValue) {
            return;
          }
          actions.setPointColumnSettings(pointSettings, { upperRange: floatValue });
        }}
      />
    </Box>
  );
});
