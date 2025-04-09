import {
  Dialog,
  DialogContent,
  DialogProps,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputAdornment,
  OutlinedInput,
  TextField
} from "@mui/material";
import { SaveAction } from "./CrossPlotChart";

type CrossPlotFileNameModalProps = {
  title: string;
  setTitle: (title: string) => void;
  saveAction: SaveAction;
} & DialogProps;
export const CrossPlotFileNameModal: React.FC<CrossPlotFileNameModalProps> = ({
  title,
  setTitle,
  saveAction,
  ...props
}) => {
  return (
    <Dialog {...props}>
      <DialogTitle>Converted Datapack Name</DialogTitle>
      <DialogContent>
        <FormControl sx={{ m: 1, width: "25ch" }} variant="outlined">
          <OutlinedInput
            endAdornment={<InputAdornment position="end">{saveAction === "download" ? ".txt" : ""}</InputAdornment>}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputProps={{
              "aria-label": "weight"
            }}
          />
          <FormHelperText id="outlined-weight-helper-text">Weight</FormHelperText>
        </FormControl>
      </DialogContent>
    </Dialog>
  );
};
