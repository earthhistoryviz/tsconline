import {observer} from "mobx-react-lite";
import React, {useContext, useState} from "react";
import {context} from "../state";
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Grid,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from "@mui/material";
import Modal from "@mui/material/Modal";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, {SelectChangeEvent} from "@mui/material/Select";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import {MuiColorInput} from "mui-color-input";
import "./FontMenu.css"

const FontMenuRow: React.FC<{
    target: "Column Header" | "Age Label" | "Uncertainty Label" | "Zone Column Label" | "Event Column Label" | "Range Label",
    defaultFontSize: number
}> = observer(({target, defaultFontSize}) => {

    const {state, actions} = useContext(context);
    const [fontTarget, setFontTarget] = useState(false);
    const [font, setFont] = useState("Arial");
    const [formats, setFormats] = useState(["bold", "italic"]);

    const fontOpts = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected as string)!.fontsInfo[target]
    const handleChange = (event: SelectChangeEvent) => {
        actions.setFontFace(target, event.target.value as string)
        setFont(event.target.value as string)
    };
    const handleFormat = (
        _event: React.MouseEvent<HTMLElement>,
        newFormats: string[],
    ) => {
        setFormats(newFormats);
        if (newFormats.includes('bold'))
            actions.setBold(target, true)
        else
            actions.setBold(target, false)

        if (newFormats.includes('italic'))
            actions.setItalic(target, true)
        else
            actions.setItalic(target, false)
    };

    const handleColor = (newColor: React.SetStateAction<string>) => {
        actions.setColor(target, newColor)
    }

    return (
        <div>
            <div style={{display: "flex", alignItems: "center"}}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={fontTarget}
                            onChange={() => setFontTarget(!fontTarget)}
                            inputProps={{"aria-label": "controlled"}}
                        />
                    }
                    label={target}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={fontOpts.inheritable}
                            onChange={() => {
                                actions.setInheritable(target, !fontOpts.inheritable)
                            }}
                            inputProps={{"aria-label": "controlled"}}
                            disabled={!fontTarget}
                        />
                    }
                    label="Inheritable"
                />
                <FormControl sx={{width: "150px", marginRight: "10px"}}>
                    <InputLabel id="demo-simple-select-label">Font Face</InputLabel>
                    <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={fontOpts.fontFace}
                        label="Font Face"
                        onChange={handleChange}
                        disabled={!fontTarget}
                        displayEmpty
                    >
                        <MenuItem value={"Arial"}>Arial</MenuItem>
                        <MenuItem value={"Courier"}>Courier</MenuItem>
                        <MenuItem value={"Verdana"}>Verdana</MenuItem>
                    </Select>
                </FormControl>
                <TextField sx={{width: "60px", marginRight: "10px"}} label="Size" variant="outlined"
                           value={fontOpts.size}
                           onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                               actions.setFontSize(target, Number(event.target.value))
                           }}
                           disabled={!fontTarget}/>
                <ToggleButtonGroup
                    value={formats}
                    onChange={handleFormat}
                    aria-label="text formatting"
                    sx={{marginRight: "10px"}}
                    disabled={!fontTarget}
                >
                    <ToggleButton value="bold" aria-label="bold" color="info">
                        <FormatBoldIcon/>
                    </ToggleButton>
                    <ToggleButton value="italic" aria-label="italic" color="info">
                        <FormatItalicIcon/>
                    </ToggleButton>
                </ToggleButtonGroup>
                <div style={{width: "150px", marginRight: "10px"}}>
                    <MuiColorInput value={fontOpts.color} size="small" label="Color" format="hex" onChange={handleColor}
                                   disabled={!fontTarget}/>
                </div>
                <Typography sx={{
                    fontWeight: fontOpts.bold ? "bold" : "",
                    fontStyle: fontOpts.italic ? "italic" : "",
                    fontSize: fontOpts.size,
                    color: fontOpts.color
                }} id={font}>Sample Text</Typography>
            </div>
        </div>
    );
});


const style = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 870,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
};

export const FontMenu: React.FC<{}> = observer(({}) => {
    const {state, actions} = useContext(context);
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
            <Button onClick={handleOpen} variant="contained">Fonts</Button>
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <Typography style={{marginBottom: "20px", fontWeight: "bold", fontSize: 18}}>Font Options
                        for "{name}"</Typography>
                    <Grid container rowSpacing={2} columnSpacing={0}>
                        <Grid item xs={12}>
                            <Typography style={{fontWeight: "bold"}}>Change Font</Typography>
                            <FontMenuRow target="Column Header" defaultFontSize={14}/>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography style={{marginBottom: "20px", fontWeight: "bold"}}>Additional fonts for child
                                columns</Typography>
                            <FontMenuRow target="Age Label" defaultFontSize={6}/>
                        </Grid>
                        <Grid item xs={12}>
                            <FontMenuRow target="Zone Column Label" defaultFontSize={12}/>
                        </Grid>
                        <Grid item xs={12}>
                            <FontMenuRow target="Uncertainty Label" defaultFontSize={5}/>
                        </Grid>
                        <Grid item xs={12}>
                            <FontMenuRow target="Event Column Label" defaultFontSize={11}/>
                        </Grid>
                        <Grid item xs={12}>
                            <FontMenuRow target="Range Label" defaultFontSize={12}/>
                        </Grid>
                        <Grid item xs={12}>
                            <div style={{display: 'flex', justifyContent: 'center', marginTop: "10px"}}>
                                <Button variant="contained" onClick={handleClose}>Close</Button>
                            </div>
                        </Grid>
                    </Grid>
                </Box>
            </Modal>
        </div>
    );
});
