import { observer } from "mobx-react-lite";
import React, { useContext } from "react";
import { context } from "../state";
import {
  Box,
  Divider,
  FormControlLabel,
  Grid,
  TextField,
  TextFieldProps,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import "./FontMenu.css";
import { ValidFontOptions } from "@tsconline/shared";
import TSCColorPicker from "../components/TSCColorPicker";
import { NumericFormat } from "react-number-format";
import { ColumnInfo } from "@tsconline/shared";
import { convertHexToRGB } from "../util/util";
import { CustomDivider, StyledScrollbar, TSCCheckbox } from "../components";
const FontSizeTextField = ({ ...props }: TextFieldProps) => (
  <TextField {...props} className="font-size-container" label="Size" size="small" variant="outlined" />
);

const FontMenuRow: React.FC<{
  target: ValidFontOptions;
  column: ColumnInfo;
}> = observer(({ target, column }) => {
  const { actions } = useContext(context);
  const fontOpts = column.fontsInfo[target];
  const handleFontChange = (event: SelectChangeEvent) => {
    if (!/^(Arial|Courier|Verdana)$/.test(event.target.value)) return;
    actions.setFontFace(target, event.target.value as "Arial" | "Courier" | "Verdana", column);
  };
  const handleFormat = (_event: React.MouseEvent<HTMLElement>, newFormats: string[]) => {
    actions.setBold(target, newFormats.includes("bold"), column);
    actions.setItalic(target, newFormats.includes("italic"), column);
  };

  const handleColor = (newColor: string) => {
    const rgb = convertHexToRGB(newColor, true);
    actions.setColor(target, rgb, column);
  };

  return (
    <div className="font-row-container">
      <FormControlLabel
        control={
          <TSCCheckbox
            focusRipple={false}
            checked={fontOpts.on}
            size="small"
            onChange={() => {
              actions.setFontOptionOn(target, !fontOpts.on, column);
            }}
            inputProps={{ "aria-label": "controlled" }}
          />
        }
        label={target}
        className="font-checkbox-form"
      />
      <FormControlLabel
        control={
          <TSCCheckbox
            focusRipple={false}
            checked={fontOpts.inheritable}
            size="small"
            onChange={() => {
              actions.setInheritable(target, !fontOpts.inheritable, column);
            }}
            inputProps={{ "aria-label": "controlled" }}
            disabled={!fontOpts.on || column.name === "Chart Root"}
          />
        }
        className="font-checkbox-form"
        label="Inheritable"
      />
      <FormControl id="FontFaceForm">
        <InputLabel>Font Face</InputLabel>
        <Select
          value={fontOpts.fontFace}
          label="Font Face"
          onChange={handleFontChange}
          className="font-family-select"
          size="small"
          disabled={!fontOpts.on}
          displayEmpty>
          <MenuItem value={"Arial"}>Arial</MenuItem>
          <MenuItem value={"Courier"}>Courier</MenuItem>
          <MenuItem value={"Verdana"}>Verdana</MenuItem>
        </Select>
      </FormControl>
      <NumericFormat
        customInput={FontSizeTextField}
        value={fontOpts.size}
        onValueChange={(values) => {
          if (!values.floatValue) {
            return;
          }
          actions.setFontSize(target, values.floatValue, column);
        }}
        disabled={!fontOpts.on}
      />
      <ToggleButtonGroup
        value={[fontOpts.bold ? "bold" : "", fontOpts.italic ? "italic" : ""]}
        onChange={handleFormat}
        size="small"
        aria-label="text formatting"
        sx={{ marginRight: "10px" }}
        disabled={!fontOpts.on}>
        <ToggleButton value="bold" aria-label="bold" color="info" className="text-format-toggle-button">
          <FormatBoldIcon className="text-format-icon-svg" />
        </ToggleButton>
        <ToggleButton value="italic" aria-label="italic" color="info" className="text-format-toggle-button">
          <FormatItalicIcon className="text-format-icon-svg" />
        </ToggleButton>
      </ToggleButtonGroup>
      <div id="ColorInputContainer">
        <TSCColorPicker
          key={column.name}
          color={fontOpts.color}
          onColorChange={handleColor}
          disabled={!fontOpts.on}
          portal
        />
      </div>
      <Typography
        sx={{
          fontWeight: fontOpts.bold ? "bold" : "",
          fontStyle: fontOpts.italic ? "italic" : "",
          fontSize: fontOpts.size,
          color: fontOpts.color
        }}
        id={fontOpts.fontFace}>
        Sample Text
      </Typography>
    </div>
  );
});

type FontMenuProps = {
  column: ColumnInfo;
};

export const FontMenu: React.FC<FontMenuProps> = observer(({ column }) => {
  const metaColumn = column.children.length > 0;
  return (
    <Box id="FontMenuContainer">
      <StyledScrollbar>
        <Typography variant="h6" className="font-menu-header">
          Font Options for {`"${column.name}"`}
        </Typography>
        <CustomDivider className="settings-header-divider" />
        {metaColumn ? <MetaColumnFontMenu column={column} /> : <LeafColumnFontMenu column={column} />}
      </StyledScrollbar>
    </Box>
  );
});

const MetaColumnFontMenu: React.FC<FontMenuProps> = observer(({ column }) => {
  return (
    <Grid container rowSpacing={2} columnSpacing={0}>
      <Grid item xs={12}>
        <Typography className="change-font-header">Change Font</Typography>
        <FontMenuRow column={column} target="Column Header" />
      </Grid>
      <Grid item xs={12}>
        <CustomDivider className="settings-header-divider" />
      </Grid>
      <Grid item xs={12} style={{ marginBottom: "-16px" }}>
        <Typography className="change-font-header">Additional fonts for child columns</Typography>
      </Grid>
      {Array.from(column.fontOptions).map((target) => {
        if (target === "Column Header") return null;
        return (
          <Grid item xs={12} key={target}>
            <FontMenuRow column={column} target={target} />
          </Grid>
        );
      })}
    </Grid>
  );
});

type LeafColumnFontMenuProps = {
  className?: string;
} & FontMenuProps;
export const LeafColumnFontMenu: React.FC<LeafColumnFontMenuProps> = observer(({ className, column }) => {
  return (
    <Grid className={`leaf-column-font-menu ${className}`} container rowSpacing={2} columnSpacing={0}>
      <Grid item xs={12}>
        <Typography className="change-font-header">Change Font</Typography>
      </Grid>
      {Array.from(column.fontOptions).map((target) => (
        <Grid item xs={12} key={target}>
          <FontMenuRow column={column} target={target} />
        </Grid>
      ))}
    </Grid>
  );
});
