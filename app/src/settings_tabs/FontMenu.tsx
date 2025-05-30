import { observer } from "mobx-react-lite";
import React, { useContext } from "react";
import { context } from "../state";
import { Box, TextField, TextFieldProps, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
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
import { convertHexToRGB } from "../util/util";
import { CustomDivider, CustomFormControlLabel, StyledScrollbar, TSCCheckbox } from "../components";
import { useTranslation } from "react-i18next";
import { RenderColumnInfo } from "../types";
const FontSizeTextField = ({ ...props }: TextFieldProps) => (
  <TextField {...props} className="font-size-container" label="Size" size="small" variant="outlined" />
);

const FontMenuRow: React.FC<{
  target: ValidFontOptions;
  column: RenderColumnInfo;
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
      <CustomFormControlLabel
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
      />
      <CustomFormControlLabel
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
          if (values.floatValue === undefined || values.floatValue === null || isNaN(values.floatValue)) {
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
        className="toggle-button-font-menu-group"
        disabled={!fontOpts.on}>
        <ToggleButton disableRipple value="bold" aria-label="bold" color="info" className="text-format-toggle-button">
          <FormatBoldIcon className="text-format-icon-svg" />
        </ToggleButton>
        <ToggleButton
          disableRipple
          value="italic"
          aria-label="italic"
          color="info"
          className="text-format-toggle-button">
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
          color: fontOpts.color,
          bgcolor: "backgroundColor.light",
          padding: "10px"
        }}
        id={fontOpts.fontFace}>
        Sample Text
      </Typography>
    </div>
  );
});

type FontMenuProps = {
  column: RenderColumnInfo;
};

export const FontMenu: React.FC<FontMenuProps> = observer(({ column }) => {
  const metaColumn = column.children.length > 0;
  const { t } = useTranslation();
  const name = column.name; //can't pass it directly to the translator
  return (
    <Box id="FontMenuContainer">
      <StyledScrollbar>
        <Typography variant="h6" className="font-menu-header">
          {/* Font Options for {`"${column.name}"`} */}
          {t("settings.column.titles.font-option-title", { name })}
        </Typography>
        <CustomDivider className="settings-header-divider" />
        {metaColumn ? <MetaColumnFontMenu column={column} /> : <LeafColumnFontMenu column={column} />}
      </StyledScrollbar>
    </Box>
  );
});

const MetaColumnFontMenu: React.FC<FontMenuProps> = observer(({ column }) => {
  const { t } = useTranslation();
  return (
    <Box display="flex" flexDirection="column" gap="5px">
      <Typography className="change-font-header">{t("settings.column.font-menu.change")}</Typography>
      <FontMenuRow column={column} target="Column Header" />
      <Typography className="change-font-header">{t("settings.column.font-menu.additional")}</Typography>
      {Array.from(column.fontOptions).map((target) => {
        if (target === "Column Header") return null;
        return (
          <Box key={target}>
            <FontMenuRow column={column} target={target} />
          </Box>
        );
      })}
    </Box>
  );
});

type LeafColumnFontMenuProps = {
  className?: string;
} & FontMenuProps;
export const LeafColumnFontMenu: React.FC<LeafColumnFontMenuProps> = observer(({ className, column }) => {
  const { t } = useTranslation();
  return (
    <Box className={`leaf-column-font-menu ${className}`}>
      <Typography className="change-font-header">{t("settings.column.font-menu.change")}</Typography>
      {Array.from(column.fontOptions).map((target) => (
        <Box key={target}>
          <FontMenuRow column={column} target={target} />
        </Box>
      ))}
    </Box>
  );
});
