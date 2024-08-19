import { Box, Dialog, useTheme, TextField, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { useContext, useState } from "react";
import { context } from "../state";
import { ColDef } from "ag-grid-community";
import { TSCButton, InputFileUpload } from "../components";
import { ErrorCodes } from "../util/error-codes";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const workshopColDefs: ColDef[] = [
  {
    headerName: "Workshop Title",
    field: "title",
    sortable: true,
    filter: true,
    flex: 1
  },
  { headerName: "Workshop Start Date", field: "startDate", flex: 1 },
  { headerName: "Workshop End Date", field: "endDate", flex: 1 }
];

export const AdminWorkshop = observer(function AdminWorkshop() {
  const theme = useTheme();
  const { actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const emails = formData.get("emails")?.toString();
    const fileInput = formData.get("file");
    if (!emails && !fileInput) {
      actions.pushError(ErrorCodes.ADMIN_WORKSHOP_FIELDS_EMPTY);
      return;
    }
    const data = new FormData();
    if (emails) data.append("emails", emails);
    if (fileInput) data.append("file", fileInput as File);
    // TODO: Add some sort of id here, probably generated when the workshop is created
    await actions.adminAddUsersToWorkshop(Math.floor(Math.random() * 100000), data);
    await actions.adminFetchUsers();
    setFormOpen(false);
  };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0];
    if (!file) {
      return;
    }
    const ext = file.name.split(".").pop();
    if (
      file.type !== "application/vnd.ms-excel" && // for .xls files
      file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && // for .xlsx files
      file.type !== ""
    ) {
      actions.pushError(ErrorCodes.UNRECOGNIZED_EXCEL_FILE);
      return;
    }
    if (!ext || !/^(xlx|xlsx)$/.test(ext)) {
      actions.pushError(ErrorCodes.UNRECOGNIZED_EXCEL_FILE);
      return;
    }
    setFileName(file.name);
  };
  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <Box display="flex" m="10px" gap="20px">
        <TSCButton
          onClick={() => {
            setFormOpen(!formOpen);
          }}>
          Add Users to Workshop
        </TSCButton>
        <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth={false}>
          <Box width="30vw" textAlign="center" padding="10px">
            <Typography variant="h5" mb="5px">
              Add Users
            </Typography>
            <Box component="form" gap="20px" display="flex" flexDirection="column" alignItems="center" onSubmit={handleSubmit}>
              <TextField
                label="Paste Emails"
                name="emails"
                multiline
                rows={5}
                placeholder="Enter multiple emails, separated by commas"
                size="small"
                fullWidth
              />
              <Box display="flex" flexDirection="row" justifyContent="center" alignItems="center">
                <InputFileUpload
                  text="Upload Excel File of Emails"
                  onChange={handleFileUpload}
                  accept=".xls,.xlsx"
                  startIcon={<CloudUploadIcon />}
                />
                <Typography ml="10px">
                  {fileName || "No file selected"}
                </Typography>
              </Box>
              <TSCButton type="submit">Submit</TSCButton>
            </Box>
          </Box>
        </Dialog>
      </Box>
      <AgGridReact
        columnDefs={workshopColDefs}
        rowSelection="multiple"
        rowDragManaged
        rowMultiSelectWithClick
        rowData={null}
      />
    </Box>
  );
});
