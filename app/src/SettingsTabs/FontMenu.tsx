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
import { MuiColorInput } from "mui-color-input";
import CloseIcon from "@mui/icons-material/Close";
import "./FontMenu.css";
import { ColumnInfo, ValidFontOptions } from "@tsconline/shared";

const FontMenuRow: React.FC<{
  target: ValidFontOptions;
}> = observer(({ target }) => {
  const { state, actions } = useContext(context);
  const [fontTarget, setFontTarget] = useState(false);
  const [font, setFont] = useState("Arial");
  const [formats, setFormats] = useState([""]);
  const fontOpts = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected as string)!.fontsInfo[target];
  const handleFontChange = (event: SelectChangeEvent) => {
    if (!/^(Arial|Courier|Verdana)$/.test(event.target.value)) return;
    actions.setFontFace(target, event.target.value as "Arial" | "Courier" | "Verdana");
    setFont(event.target.value as string);
  };
  const handleFormat = (_event: React.MouseEvent<HTMLElement>, newFormats: string[]) => {
    setFormats(newFormats);
    if (newFormats.includes("bold")) actions.setBold(target, true);
    else actions.setBold(target, false);

    if (newFormats.includes("italic")) actions.setItalic(target, true);
    else actions.setItalic(target, false);
  };

  const handleColor = (newColor: React.SetStateAction<string>) => {
    actions.setColor(target, newColor);
  };

  return (
    <div>
      <div id="FontRowContainer">
        <FormControlLabel
          control={
            <Checkbox
              checked={fontTarget}
              onChange={() => setFontTarget(!fontTarget)}
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
                actions.setInheritable(target, !fontOpts.inheritable);
              }}
              inputProps={{ "aria-label": "controlled" }}
              disabled={!fontTarget}
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
            disabled={!fontTarget}
            displayEmpty>
            <MenuItem value={"Arial"}>Arial</MenuItem>
            <MenuItem value={"Courier"}>Courier</MenuItem>
            <MenuItem value={"Verdana"}>Verdana</MenuItem>
          </Select>
        </FormControl>
        <TextField
          className="FontSizeContainer"
          label="Size"
          variant="outlined"
          value={fontOpts.size}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            actions.setFontSize(target, Number(event.target.value));
          }}
          disabled={!fontTarget}
        />
        <ToggleButtonGroup
          value={formats}
          onChange={handleFormat}
          aria-label="text formatting"
          sx={{ marginRight: "10px" }}
          disabled={!fontTarget}>
          <ToggleButton value="bold" aria-label="bold" color="info">
            <FormatBoldIcon />
          </ToggleButton>
          <ToggleButton value="italic" aria-label="italic" color="info">
            <FormatItalicIcon />
          </ToggleButton>
        </ToggleButtonGroup>
        <div id="ColorInputContainer">
          <MuiColorInput
            value={fontOpts.color}
            size="small"
            label="Color"
            format="rgb"
            onChange={handleColor}
            disabled={!fontTarget}
          />
        </div>
        <Typography
          sx={{
            fontWeight: fontOpts.bold ? "bold" : "",
            fontStyle: fontOpts.italic ? "italic" : "",
            fontSize: fontOpts.size,
            color: fontOpts.color
          }}
          id={font}>
          Sample Text
        </Typography>
      </div>
    </div>
  );
});

export const FontMenu: React.FC<object> = observer(() => {
  const { state } = useContext(context);
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (!state.settingsTabs.columnSelected || !state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected))
    return null;
  const column = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!;
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

type FontMenuProps = {
  column: ColumnInfo;
};
const MetaColumnFontMenu: React.FC<FontMenuProps> = observer(({ column }) => {
  return (
    <Grid container rowSpacing={2} columnSpacing={0}>
      <Grid item xs={12}>
        <Typography id="Bold">Change Font</Typography>
        <FontMenuRow target="Column Header" />
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
            <FontMenuRow target={target} />
          </Grid>
        );
      })}
    </Grid>
  );
});

const LeafColumnFontMenu: React.FC<FontMenuProps> = observer(({ column }) => {
  return (
    <Grid container rowSpacing={2} columnSpacing={0}>
      <Grid item xs={12}>
        <Typography id="Bold">Change Font</Typography>
        {Array.from(column.fontOptions).map((target) => (
          <Grid item xs={12} key={target}>
            <FontMenuRow target={target} />
          </Grid>
        ))}
      </Grid>
    </Grid>
  );
});
