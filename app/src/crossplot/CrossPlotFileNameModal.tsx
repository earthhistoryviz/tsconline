import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  FormControl,
  InputAdornment,
  OutlinedInput
} from "@mui/material";
import { SaveAction } from "./CrossPlotChart";
import { TSCButton } from "../components";
import { useTranslation } from "react-i18next";

type CrossPlotFileNameModalProps = {
  fileName: string;
  setFileName: (title: string) => void;
  saveAction: SaveAction;
  setOpen: (open: boolean) => void;
  title: string;
  placeholder?: string;
} & DialogProps;
export const CrossPlotFileNameModal: React.FC<CrossPlotFileNameModalProps> = ({
  fileName,
  setFileName,
  saveAction,
  title,
  setOpen,
  placeholder,
  ...props
}) => {
  const { t } = useTranslation();
  return (
    <Dialog {...props}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <FormControl sx={{ m: 1, width: "25ch" }} variant="outlined">
          <OutlinedInput
            error={fileName.length === 0}
            autoFocus
            endAdornment={<InputAdornment position="end">{saveAction === "download" ? ".txt" : ""}</InputAdornment>}
            placeholder={placeholder}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            inputProps={{
              "aria-label": "weight"
            }}
          />
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => setOpen(false)}>
          {t("general-actions.cancel")}
        </Button>
        <TSCButton type="submit">{t("general-actions.save")}</TSCButton>
      </DialogActions>
    </Dialog>
  );
};
