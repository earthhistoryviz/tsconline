import {observer} from "mobx-react-lite";
import React, {useState} from "react";
import { HSLColor, RGBColor, PhotoshopPicker } from 'react-color';
import {
    Box,
    Button,
    FormLabel,
    Grid,
} from "@mui/material";
import Modal from "@mui/material/Modal";
import './ChangeColorMenu.css'

interface ColorResult {
    hex: string;
    rgb: RGBColor;
    hsl: HSLColor;
}

const ChangeColor: React.FC<{}> = observer(({}) => {
    const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000'); // State to keep track of selected color
  const [currentColor, setCurrentColor] = useState('#000');
  
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
                                        {/* @ts-expect-error Server Component */}
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

export default ChangeColor