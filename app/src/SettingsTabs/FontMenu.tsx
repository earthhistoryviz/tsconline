import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { context } from "../state";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  TextField,
  TextFieldProps,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme
} from "@mui/material";
import Modal from "@mui/material/Modal";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import CloseIcon from "@mui/icons-material/Close";
import "./FontMenu.css";
import { ValidFontOptions } from "@tsconline/shared";
import TSCColorPicker from "../components/TSCColorPicker";
import { NumericFormat } from "react-number-format";
const FontSizeTextField = ({ ...props }: TextFieldProps) => (
  <TextField {...props} className="FontSizeContainer" label="Size" variant="outlined" />
);
function hexToRgb(hex: string): string {
  // Ensure the input is a valid hex color code
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
      throw new Error("Invalid hexadecimal color code");
  }

  // Remove the "#" character
  hex = hex.slice(1);

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
  }

  // Parse the red, green, and blue values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Return the RGB representation
  return `rgb(${r}, ${g}, ${b})`;
}

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
    actions.setColor(target, newColor, column);
  };

  const handleColor = (newColor: string) => {
    const rgb = hexToRgb(newColor);
    actions.setColor(target, rgb);
  }

  return (
    <div>
      <div id="FontRowContainer">
        <FormControlLabel
          control={
            <Checkbox
              checked={fontOpts.on}
              onChange={() => {
                actions.setFontOptionOn(target, !fontOpts.on, column);
              }}
              inputProps={{ "aria-label": "controlled" }}
            />
          }
          label={target}
          id="TargetInput"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={fontOpts.inheritable}
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
          aria-label="text formatting"
          sx={{ marginRight: "10px" }}
          disabled={!fontOpts.on}>
          <ToggleButton value="bold" aria-label="bold" color="info">
            <FormatBoldIcon />
          </ToggleButton>
          <ToggleButton value="italic" aria-label="italic" color="info">
            <FormatItalicIcon />
          </ToggleButton>
        </ToggleButtonGroup>
        <div id="ColorInputContainer">
          <TSCColorPicker color={fontOpts.color} onColorChange={handleColor} />
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
    </div>
  );
});

type FontMenuProps = {
  column: ColumnInfo;
};

export const FontMenu: React.FC<FontMenuProps> = observer(({ column }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const metaColumn = column.children.length > 0;
  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <Button onClick={handleOpen} variant="contained">
        Fonts
      </Button>
      <Modal open={open} onClose={handleClose}>
        <Box id="FontMenuContainer">
          <div id="HeadingContainer">
            <Typography id="FontOptionsTitle">Font Options for {`"${column.name}"`}</Typography>
            <div onClick={handleClose}>
              <CloseIcon sx={{ color: theme.palette.primary.main }} />
            </div>
          </div>
          {metaColumn ? <MetaColumnFontMenu column={column} /> : <LeafColumnFontMenu column={column} />}
        </Box>
      </Modal>
    </div>
  );
});

const MetaColumnFontMenu: React.FC<FontMenuProps> = observer(({ column }) => {
  return (
    <Grid container rowSpacing={2} columnSpacing={0}>
      <Grid item xs={12}>
        <Typography id="Bold">Change Font</Typography>
        <FontMenuRow column={column} target="Column Header" />
      </Grid>
      <Grid item xs={12}>
        <Divider />
      </Grid>
      <Grid item xs={12} style={{ marginBottom: "-16px" }}>
        <Typography id="AdditionalFontsText">Additional fonts for child columns</Typography>
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

export const LeafColumnFontMenu: React.FC<FontMenuProps> = observer(({ column }) => {
  return (
    <Grid container rowSpacing={2} columnSpacing={0}>
      <Grid item xs={12}>
        <Typography id="Bold">Change Font</Typography>
        {Array.from(column.fontOptions).map((target) => (
          <Grid item xs={12} key={target}>
            <FontMenuRow column={column} target={target} />
          </Grid>
        ))}
      </Grid>
    </Grid>
  );
});
