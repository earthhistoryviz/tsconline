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

const FontMenuRow: React.FC<{
  target:
    | "Column Header"
    | "Age Label"
    | "Uncertainty Label"
    | "Zone Column Label"
    | "Event Column Label"
    | "Range Label";
}> = observer(({ target }) => {
  const { state, actions } = useContext(context);
  const [fontTarget, setFontTarget] = useState(false);
  const [font, setFont] = useState("Arial");
  const [formats, setFormats] = useState(["bold", "italic"]);

  const fontOpts = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected as string)!.fontsInfo[target];
  const handleChange = (event: SelectChangeEvent) => {
    if (/Arial|Courier|Verdana/.test(event.target.value)) return;
    actions.setFontFace(
      target,
      event.target.value as "Arial" | "Courier" | "Verdana"
    );
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
            onChange={handleChange}
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
            format="hex"
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

export const FontMenu = observer(() => {
  const { state } = useContext(context);
  const theme = useTheme();
  const name =
    state.settingsTabs.columnSelected === null
      ? ""
      : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.editName;
  const [open, setOpen] = useState(false);
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
            <Typography id="FontOptionsTitle">
              Font Options for {`"${name}"`}
            </Typography>
            <div onClick={handleClose}>
              <CloseIcon sx={{ color: theme.palette.primary.main }} />
            </div>
          </div>
          <Grid container rowSpacing={2} columnSpacing={0}>
            <Grid item xs={12}>
              <Typography id="Bold">Change Font</Typography>
              <FontMenuRow target="Column Header" />
            </Grid>
            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Typography id="AdditionalFontsText">Additional fonts for child columns</Typography>
              <FontMenuRow target="Age Label" />
            </Grid>
            <Grid item xs={12}>
              <FontMenuRow target="Zone Column Label" />
            </Grid>
            <Grid item xs={12}>
              <FontMenuRow target="Uncertainty Label" />
            </Grid>
            <Grid item xs={12}>
              <FontMenuRow target="Event Column Label" />
            </Grid>
            <Grid item xs={12}>
              <FontMenuRow target="Range Label" />
            </Grid>
          </Grid>
        </Box>
      </Modal>
    </div>
  );
});
