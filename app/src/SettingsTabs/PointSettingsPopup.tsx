import { Box, Button, FormControlLabel, IconButton, Modal, Typography } from "@mui/material";
import { ColumnInfo, PointSettings, assertPointSettings, isPointShape } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { context } from "../state";
import "./PointSettingsPopup.css";
import { RGBModifier, TSCButton, TSCCheckbox } from "../components";
import { GenericTextField } from "../components";
import { TSCRadioGroup } from "../components/TSCRadioGroup";
import CloseIcon from "@mui/icons-material/Close";

type PointSettingsPopupProps = {
  column: ColumnInfo;
};

export const PointSettingsPopup: React.FC<PointSettingsPopupProps> = observer(({ column }) => {
  const [openMenu, setOpenMenu] = useState(false);
  if (column.columnDisplayType !== "Point") return;
  assertPointSettings(column.columnSpecificSettings);
  const pointSettings = column.columnSpecificSettings;
  return (
    <div>
      <Button onClick={() => setOpenMenu(true)} variant="contained">
        Point Settings
      </Button>
      <Modal open={openMenu} onClose={() => setOpenMenu(false)}>
        <PointSettingsContainer pointSettings={pointSettings} setOpenMenu={setOpenMenu} />
      </Modal>
    </div>
  );
});
type PointSettingsContainerProps = {
  pointSettings: PointSettings;
  setOpenMenu: (value: boolean) => void;
};

const PointSettingsContainer: React.FC<PointSettingsContainerProps> = observer(({ pointSettings, setOpenMenu }) => {
  const { actions } = useContext(context);
  return (
    <Box id="PointSettingsPopupContainer">
      <IconButton onClick={() => setOpenMenu(false)} className="exit-button-point-settings">
        <CloseIcon className="exit-button-icon-point-settings" />
      </IconButton>
      <Typography variant="h6" className="point-settings-header">
        Point Settings
      </Typography>
      <GenericTextField
        header="Range"
        key="range"
        inputs={[
          {
            helperText: "Lower Range",
            value: pointSettings.lowerRange,
            onValueChange: (value) => {
              actions.setPointColumnSettings(pointSettings, { lowerRange: value });
            }
          },
          {
            helperText: "Upper Range",
            value: pointSettings.upperRange,
            onValueChange: (value) => {
              actions.setPointColumnSettings(pointSettings, { upperRange: value });
            }
          }
        ]}
      />
      <div className="point-settings-adjustment-buttons">
        <TSCButton>Auto</TSCButton>
        <TSCButton>Flip</TSCButton>
      </div>
      <GenericTextField
        header="Scale"
        key="scale"
        inputs={[
          {
            helperText: "Start",
            value: pointSettings.scaleStart,
            onValueChange: (value) => {
              actions.setPointColumnSettings(pointSettings, { scaleStart: value });
            }
          },
          {
            helperText: "Step",
            value: pointSettings.scaleStep,
            onValueChange: (value) => {
              actions.setPointColumnSettings(pointSettings, { scaleStep: value });
            }
          }
        ]}
      />
      <FormControlLabel
        name="drawPoints"
        label="Draw Points"
        className="point-shape-checkbox"
        control={
          <TSCCheckbox
            checked={pointSettings.pointShape !== "nopoints"}
            onChange={(event) =>
              actions.setPointColumnSettings(pointSettings, { pointShape: event.target.checked ? "rect" : "nopoints" })
            }
          />
        }
      />
      <div className="point-shape-radio-group">
        <TSCRadioGroup
          name="Point Type"
          value={pointSettings.pointShape}
          onChange={(event) => {
            if (isPointShape(event.target.value)) {
              actions.setPointColumnSettings(pointSettings, { pointShape: event.target.value });
            }
          }}
          disabled={pointSettings.pointShape === "nopoints"}
          radioArray={[
            { value: "rect", label: "Rectangle" },
            { value: "circle", label: "Circle" },
            { value: "cross", label: "Cross" }
          ]}
          direction="horizontal"
        />
      </div>
      <div className="point-settings-adjustment-buttons">
        <FormControlLabel
          name="drawScale"
          label="Draw Scale"
          control={
            <TSCCheckbox
              checked={pointSettings.drawScale}
              onChange={(value) => actions.setPointColumnSettings(pointSettings, { drawScale: value.target.checked })}
            />
          }
        />
        <FormControlLabel
          name="flipScale"
          label="Flipped"
          control={
            <TSCCheckbox
              checked={pointSettings.flipScale}
              onChange={(value) => actions.setPointColumnSettings(pointSettings, { flipScale: value.target.checked })}
            />
          }
        />
      </div>
      <div className="point-settings-adjustment-buttons">
        <RGBModifier
          label="Line"
          checked={pointSettings.drawLine}
          onCheckedChange={(value) => actions.setPointColumnSettings(pointSettings, { drawLine: value })}
          rgbInputs={[
            {
              rgb: pointSettings.lineColor,
              onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { lineColor: value })
            }
          ]}
        />
        <RGBModifier
          label="Fill"
          checked={pointSettings.drawFill}
          onCheckedChange={(value) => actions.setPointColumnSettings(pointSettings, { drawFill: value })}
          rgbInputs={[
            {
              rgb: pointSettings.fill,
              onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { fill: value })
            }
          ]}
        />
      </div>
      <div className="point-settings-gradient-buttons">
        <RGBModifier
          label="Background Gradient"
          checked={pointSettings.drawBackgroundGradient}
          onCheckedChange={(value) => actions.setPointColumnSettings(pointSettings, { drawBackgroundGradient: value })}
          rgbInputs={[
            {
              rgb: pointSettings.backgroundGradientStart,
              onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { backgroundGradientStart: value }),
              label: "Start"
            },
            {
              rgb: pointSettings.backgroundGradientEnd,
              onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { backgroundGradientEnd: value }),
              label: "End"
            }
          ]}
        />
      </div>
      <div className="point-settings-gradient-buttons">
        <RGBModifier
          label="Curve Gradient"
          checked={pointSettings.drawCurveGradient}
          onCheckedChange={(value) => actions.setPointColumnSettings(pointSettings, { drawCurveGradient: value })}
          rgbInputs={[
            {
              rgb: pointSettings.curveGradientStart,
              onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { curveGradientStart: value }),
              label: "Start"
            },
            {
              rgb: pointSettings.curveGradientEnd,
              onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { curveGradientEnd: value }),
              label: "End"
            }
          ]}
        />
      </div>
    </Box>
  );
});
