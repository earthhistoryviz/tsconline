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
  fileName: string;
  setFileName: (title: string) => void;
  saveAction: SaveAction;
  setOpen: (open: boolean) => void;
  title: string;
} & DialogProps;
export const CrossPlotFileNameModal: React.FC<CrossPlotFileNameModalProps> = ({
  fileName,
  setFileName,
  saveAction,
  title,
  setOpen,
  ...props
}) => {
  return (
    <Dialog {...props}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <FormControl sx={{ m: 1, width: "25ch" }} variant="outlined">
          <OutlinedInput
            endAdornment={<InputAdornment position="end">{saveAction === "download" ? ".txt" : ""}</InputAdornment>}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            inputProps={{
              "aria-label": "weight"
            }}
          />
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={(e) => setOpen(false)}>
            cancel
        </Button>
        <TSCButton type="submit">
            Save
        </TSCButton>
      </DialogActions>
    </Dialog>
  );
};
