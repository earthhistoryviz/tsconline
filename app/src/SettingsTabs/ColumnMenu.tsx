import { observer } from "mobx-react-lite";
import { useContext, useRef, useState } from "react";
import { context } from "../state";
import { Button, TextField, ToggleButton, Typography } from "@mui/material";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import "./ColumnMenu.css";
import { FontMenu } from "./FontMenu";

const EditNameField = observer(() => {
  const { state, actions } = useContext(context);
  const editName = useRef("");
  const name =
    state.settingsTabs.columnSelected === null
      ? ""
      : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.editName;
  return (
    <div>
      <Typography style={{ padding: "5px" }}>Edit Title</Typography>
      <div style={{ display: "flex", flexDirection: "row" }}>
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
            }}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
});

interface ColorResult {
    hex: string;
    rgb: RGBColor;
    hsl: HSLColor;
}

const ChangeColor: React.FC<{}> = observer(({}) => {
    const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000'); // State to keep track of selected color
  const [currentColor, setCurrentColor] = useState('#000');

  const styleColor = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 500,
    bgcolor: "lightgray",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
    alignItems: "center",
    justifyContent: "center"
};
  
  const handleColorChange = (color: ColorResult) => {
    setSelectedColor(color.hex);
  };
  const handleCurrentChange = (color: string) => {
    setCurrentColor(color)
  }
    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };


    const handleCancel = () => {
        setOpen(false);
        setSelectedColor(currentColor);
    }
    const styles = {
        default: {
          picker: {
            backgroundColor: 'lightgray',
            boxShadow: 'none',
          },
        },
      };

    return (
        <div>
            <FormLabel id="color-label" className="bg-label">Background Color:   </FormLabel>
            <Button color="secondary" variant="contained" onClick={handleOpen} className="color-button" style = {{backgroundColor: currentColor}}></Button>

            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box className="style-color">
                    <div className="picker-box">
                        <Grid 
                            container rowSpacing={2} columnSpacing={5} 
                            justifyContent="center" alignItems="center"
                        >
                            <Grid item xs={12} className="color-picker">
                                {
                                    <div>
                                        <PhotoshopPicker color={selectedColor} onChange={handleColorChange}
                                            className="photoshop-picker" onAccept={() => {handleCurrentChange(selectedColor); handleClose();}} 
                                            onCancel={() => {handleCancel()} } />
                                    </div>
                                
                                }
                            </Grid>
                        </Grid>
                    </div>  
                </Box>
            </Modal>
        </div>
    );
})

export const ColumnMenu = observer(() => {
  const { state } = useContext(context);
  const [openMenu, setOpenMenu] = useState(false);

  function showMenu() {
    const menu = document.getElementById("ColumnMenuContent");
    const label = document.getElementById("ColumnMenuLabel");
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
      <div style={{ display: "flex", flexDirection: "row", width: "300px" }}>
        <div style={{ backgroundColor: "lightgray" }}>
          <ToggleButton
            value="check"
            selected={openMenu}
            onChange={() => {
              showMenu();
            }}
            size="small">
            <SettingsSharpIcon />
          </ToggleButton>
        </div>
        <div id="ColumnMenuLabel" className="column-menu-label">
          <Typography>Settings</Typography>
        </div>
      </div>
      <div
        id="ColumnMenuContent"
        className="column-menu-content"
        //style={{ display: "flex", flexDirection: "column" }}
      >
        {state.settingsTabs.columnSelected && <>
                                                        <ChangeColor/>
                                                        <FontMenu/>
                                                        <EditNameField/>
                                                      </>
                }
      </div>
    </div>
  );
});
