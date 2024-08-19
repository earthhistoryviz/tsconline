import { Box, Dialog, useTheme, TextField, TextFieldProps, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { useContext, useState } from "react";
import { context } from "../state";
import { ColDef } from "ag-grid-community";
import { TSCButton, InputFileUpload } from "../components";

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
const FormTextField: React.FC<TextFieldProps> = (props) => {
  return <TextField size="small" fullWidth required {...props} />;
};

export const AdminWorkshop = observer(function AdminWorkshop() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const emails = formData
      .get("emails")
      ?.toString()
      .split(",")
      .map((email) => email.trim());
    const fileInput = formData.get("file");
    const data = new FormData();
    if (emails) data.append("emails", JSON.stringify(emails));
    if (fileInput) data.append("file", fileInput as File);
    // TODO: Add some sort of id here, probably generated when the workshop is created
    await actions.adminAddUsersToWorkshop(Math.random() * 100000, data);
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
            <Box component="form" gap="20px" display="flex" flexDirection="column" onSubmit={handleSubmit}>
              <FormTextField
                label="Paste Emails"
                name="emails"
                multiline
                rows={5}
                placeholder="Enter multiple emails, separated by commas"
              />
              <InputFileUpload text="Upload Excel File of Emails" onChange={() => {}} accept=".xls,.xlsx" />
              <TSCButton type="submit">Add Users</TSCButton>
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
