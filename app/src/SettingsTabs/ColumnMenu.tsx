import {observer} from "mobx-react-lite";
import React, {useContext, useRef, useState} from "react";
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
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import Modal from "@mui/material/Modal";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, {SelectChangeEvent} from "@mui/material/Select";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import ColorPicker from 'material-ui-color-picker'

const EditNameField: React.FC<{}> = observer(({}) => {
    const {state, actions} = useContext(context);
    let editName = useRef("");
    const name =
        state.settingsTabs.columnSelected === null
            ? ""
            : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.editName;
    return (
        <div>
            <Typography style={{padding: "5px"}}>Edit Title</Typography>
            <div style={{display: "flex", flexDirection: "row"}}>
                <TextField
                    hiddenLabel
                    id="editNameTextField"
                    defaultValue={name}
                    key={name}
                    onChange={(event) => {
                        editName.current = event.target.value;
                    }}
                    variant="filled"
                    size="small"
                />
                <div className="edit-title-button">
                    <Button
                        color="secondary"
                        variant="contained"
                        onClick={() => {
                            actions.updateEditName(editName.current);
                        }}
                    >
                        Confirm
                    </Button>
                </div>
            </div>
        </div>
    );
});

const style = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 800,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
};

const FontMenuRow: React.FC<{ target: string, defaultFontSize: number }> = observer(({target, defaultFontSize}) => {
    const [fontTarget, setFontTarget] = useState(false);
    const [inheritable, setInheritable] = useState(false);
    const [font, setFont] = useState("Arial");
    const [size, setSize] = useState(defaultFontSize);
    const [formats, setFormats] = useState(["bold", "italic"]);
    const handleChange = (event: SelectChangeEvent) => {
        setFont(event.target.value as string);
    };
    const handleFormat = (
        _event: React.MouseEvent<HTMLElement>,
        newFormats: string[],
    ) => {
        setFormats(newFormats);
    };
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
                            checked={inheritable}
                            onChange={() => setInheritable(!inheritable)}
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
                        value={font}
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
                           value={size}
                           onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                               setSize(Number(event.target.value));
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
                <Button variant="contained" sx={{marginRight: "10px"}} disabled={!fontTarget}>Color</Button>
                <Typography sx={{
                    fontWeight: formats[0] == "bold" || formats[1] == "bold" ? "bold" : "",
                    fontStyle: formats[0] == "italic" || formats[1] == "italic" ? "italic" : "",
                    fontSize: size
                }}>Sample Text</Typography>
            </div>
        </div>
    );
});

const FontMenu: React.FC<{}> = observer(({}) => {
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

    const handleSave = () => {
        console.log("Saved")
    }

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
                        for {name}</Typography>
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
                            <ColorPicker
                                name='color'
                                defaultValue='#000'
                                // value={this.state.color} - for controlled component
                                onChange={color => console.log(color)}

                            />
                        </Grid>
                        <Grid item xs={5}/>
                        <Grid item xs={2}>
                            <Button variant="contained" onClick={handleSave}>Save</Button>
                        </Grid>
                        <Grid item xs={5}/>
                    </Grid>
                </Box>
            </Modal>
        </div>
    );
});

export const ColumnMenu: React.FC<{}> = observer(() => {
    const {state, actions} = useContext(context);
    const [openMenu, setOpenMenu] = useState(false);

    function showMenu() {
        let menu = document.getElementById("ColumnMenu");
        let label = document.getElementById("ColumnMenuLabel");
        if (menu !== null && label !== null) {
            if (!openMenu) {
                menu.style.display = "flex";
                label.style.display = "flex";
                setOpenMenu(true);
            } else {
                menu.style.display = "none";
                label.style.display = "none";
                setOpenMenu(false);
            }
        }
    }

    return (
        <div className={openMenu ? "column-menu" : ""}>
            <div style={{display: "flex", flexDirection: "row", width: "300px"}}>
                <div style={{backgroundColor: "lightgray"}}>
                    <ToggleButton
                        value="check"
                        selected={openMenu}
                        onChange={() => {
                            showMenu();
                        }}
                        size="small"
                    >
                        <SettingsSharpIcon/>
                    </ToggleButton>

                </div>
                <div id="ColumnMenuLabel" className="column-menu-label">
                    <Typography>Settings</Typography>
                </div>
            </div>
            <div id="ColumnMenu" style={{display: "flex", flexDirection: "column"}}>
                {state.settingsTabs.columnSelected && <EditNameField/>}
                {state.settingsTabs.columnSelected && <FontMenu/>}
            </div>
        </div>
    );
});
