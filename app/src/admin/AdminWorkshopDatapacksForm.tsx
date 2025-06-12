import {
  Box,
  Dialog,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  ListItemText,
  SelectChangeEvent,
  FormControl
} from "@mui/material";
import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { context } from "../state";
import { TSCButton, DatapackUploadForm, TSCDialogLoader } from "../components";
import { ErrorCodes } from "../util/error-codes";
import { SharedWorkshop, getWorkshopUUIDFromWorkshopId, isOfficialDatapack } from "@tsconline/shared";
import { displayServerError } from "../state/actions/util-actions";
import "./AdminWorkshop.css";

type AddDatapacksToWorkshopFormProps = {
  currentWorkshop: SharedWorkshop;
  onClose: () => void;
};
export const AddDatapacksToWorkshopForm: React.FC<AddDatapacksToWorkshopFormProps> = observer(
  function AddDatapacksToWorkshopForm({ currentWorkshop, onClose }) {
    const { state, actions } = useContext(context);
    const [datapack, setDatapack] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [uploadDatapacks, setUploadDatapacks] = useState(false);

    const handleDialogClose = () => {
      setDatapack("");
      setLoading(false);
      onClose();
    };

    const addOfficialDatapacks = async () => {
      setLoading(true);
      try {
        if (!datapack) {
          actions.pushError(ErrorCodes.INVALID_FORM);
          return;
        }
        await actions.adminAddOfficialDatapackToWorkshop(currentWorkshop.workshopId, datapack);
        actions.fetchAllWorkshops();
      } catch (error) {
        displayServerError(
          error,
          ErrorCodes.ADMIN_ADD_OFFICIAL_DATAPACK_TO_WORKSHOP_FAILED,
          ErrorCodes[ErrorCodes.ADMIN_ADD_OFFICIAL_DATAPACK_TO_WORKSHOP_FAILED]
        );
      } finally {
        setLoading(false);
      }
    };

    return !uploadDatapacks ? (
      <Dialog open={true} onClose={handleDialogClose} maxWidth="md">
        <Box textAlign="center" padding="10px">
          <Typography variant="h5" mb="5px">
            Add Datapacks to Workshop
          </Typography>
          <Box gap="20px" display="flex" alignItems="center">
            <Box display="flex" alignItems="center" gap={5}>
              <FormControl variant="outlined" sx={{ m: 1 }}>
                <InputLabel id="datapacks-label">Select Official Datapack</InputLabel>
                <Select
                  className="datapack-select"
                  name="datapack"
                  label="Select Official Datapacks"
                  labelId="datapacks-label"
                  value={datapack}
                  onChange={(event: SelectChangeEvent<typeof datapack>) => {
                    setDatapack(event.target.value as string);
                  }}
                  autoWidth>
                  {Array.from(state.datapackMetadata)
                    .filter((datapack) => isOfficialDatapack(datapack))
                    .map((datapack) => (
                      <MenuItem key={datapack.title} value={datapack.title}>
                        <ListItemText primary={datapack.title} />
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>
            <Box display="flex" alignItems="flex-start" gap={1}>
              <TSCButton className="datapack-buttons" onClick={addOfficialDatapacks}>
                Add Datapack
              </TSCButton>
              <TSCButton className="datapack-buttons" onClick={() => setUploadDatapacks(true)}>
                Upload Datapack
              </TSCButton>
            </Box>
            {loading && <TSCDialogLoader open={loading} headerText="Adding Datapack" />}
          </Box>
        </Box>
      </Dialog>
    ) : (
      <Dialog open={true} onClose={() => setUploadDatapacks(false)} maxWidth={false}>
        <DatapackUploadForm
          close={() => setUploadDatapacks(false)}
          upload={actions.adminUploadDatapackToWorkshop}
          type={{ type: "workshop", uuid: getWorkshopUUIDFromWorkshopId(currentWorkshop.workshopId) }}
          forcePublic
        />
      </Dialog>
    );
  }
);
