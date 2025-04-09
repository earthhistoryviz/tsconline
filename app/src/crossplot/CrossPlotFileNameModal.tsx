import {
    Button,
  Dialog,
  DialogActions,
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
import { TSCButton } from "../components";

type CrossPlotFileNameModalProps = {
  title: string;
  setTitle: (title: string) => void;
  saveAction: SaveAction;
  setOpen: (open: boolean) => void;
} & DialogProps;
export const CrossPlotFileNameModal: React.FC<CrossPlotFileNameModalProps> = ({
  title,
  setTitle,
  saveAction,
  setOpen,
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
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={(e) => setOpen(false)}>
            Exit
        </Button>
        <TSCButton type="submit">
            Save
        </TSCButton>
      </DialogActions>
    </Dialog>
  );
};
