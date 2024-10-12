import { School, PersonRemove, Close, Edit, FileUpload } from "@mui/icons-material";
import {
  Typography,
  IconButton,
  Dialog,
  Box,
  Avatar,
  TextField,
  Select,
  MenuItem,
  TableRow,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead
} from "@mui/material";
import { AdminSharedUser } from "@tsconline/shared";
import { CustomTooltip, TSCButton, TSCYesNoPopup } from "../components";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import useEditUser from "../components/edit-user-stats-hook";

type ShowAdditionalUserInfoProps = {
  data: AdminSharedUser;
};

//TODO: Need to implement backend
export const ShowAdditionalUserInfo: React.FC<ShowAdditionalUserInfoProps> = (props) => {
  const { state, setters, handlers } = useEditUser({ data: props.data });
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };
  const workshopsList = () => {
    return (
      <TableContainer component={Paper} style={{ maxWidth: "100%" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ whiteSpace: "nowrap", width: "30%" }}>Title</TableCell>
              <TableCell style={{ whiteSpace: "nowrap", width: "30%" }}>Start Date</TableCell>
              <TableCell style={{ whiteSpace: "nowrap", width: "30%" }}>End Date</TableCell>
              <TableCell style={{ width: "10%" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!state.currentWorkshops || state.currentWorkshops.length === 0 ? (
              <TableRow>
                <TableCell align="center" colSpan={4} style={{ padding: "13px" }}>
                  <Typography ml={1} fontWeight={"bold"}>
                    No registered workshop
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              state.currentWorkshops.map((value, index) => (
                <TableRow key={index}>
                  <TableCell style={{ whiteSpace: "nowrap" }}>{value.workshopTitle}</TableCell>
                  <TableCell style={{ whiteSpace: "nowrap" }}>{formatDate(value.start)}</TableCell>
                  <TableCell style={{ whiteSpace: "nowrap" }}>{formatDate(value.end)}</TableCell>
                  <TableCell>
                    <CustomTooltip title="Remove user from this workshop">
                      <IconButton onClick={() => handlers.handleOpenConfirmDialog(value)} edge="end" aria-label="leave">
                        <PersonRemove />
                      </IconButton>
                    </CustomTooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <>
      <CustomTooltip title="Show Additional User Info">
        <IconButton onClick={() => setters.setMoreUsersInfoFormOpen(true)}>
          <MoreVertOutlinedIcon />
        </IconButton>
      </CustomTooltip>
      <Dialog
        open={state.moreUsersInfoFormOpen}
        onClose={(event, reason) => {
          if (reason !== "backdropClick") {
            handlers.handleCloseDialog();
          }
        }}
        disableEscapeKeyDown
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="md"
        fullWidth={true}>
        <IconButton onClick={handlers.handleCloseDialog} sx={{ position: "absolute", top: 8, right: 8 }}>
          <Close />
        </IconButton>

        {/* Overall Header */}
        <Box textAlign={"center"} width="100%" pt={3} pr={3} pb={0} pl={3}>
          <Typography variant="h5" mb={2} sx={{ fontWeight: "bold" }}>
            Additional Information about {state.userInfo.username}
          </Typography>
        </Box>
        {/* Basic Information Title */}
        <Box textAlign="left" width="100%" pt={0} pr={3} pb={3} pl={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center">
              <Typography variant="h6">Basic Information</Typography>
              <IconButton onClick={handlers.handleEditToggle} sx={{ ml: 1 }}>
                <Edit />
              </IconButton>
            </Box>
          </Box>

          {/* Basic Information Section */}
          <Box border={1} borderRadius={4} p={2} mb={2} borderColor="grey.400">
            {/* User Avatar */}
            <Box display="flex" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" mb={2} position="relative">
                <Avatar sx={{ width: 56, height: 56, mr: 2 }}>
                  {state.selectedFile ? (
                    <img src={URL.createObjectURL(state.selectedFile)} alt={state.userInfo.username} />
                  ) : state.userInfo.pictureUrl ? (
                    <img src={state.userInfo.pictureUrl} alt={state.userInfo.username} />
                  ) : (
                    state.userInfo.username[0].toUpperCase()
                  )}
                </Avatar>
                {state.isEditing && (
                  <Box position="absolute" bottom={-3} right={12} zIndex={1}>
                    <CustomTooltip title="Upload avatar">
                      <IconButton
                        component="label"
                        sx={{ padding: 0, backgroundColor: "transparent", borderRadius: "50%" }}>
                        <FileUpload fontSize="small" />
                        <input type="file" hidden onChange={handlers.handleFileChange} accept="image/*" />
                      </IconButton>
                    </CustomTooltip>
                  </Box>
                )}
              </Box>

              {state.isEditing ? (
                <TextField
                  label="Username"
                  name="username"
                  value={state.userInfo.username}
                  onChange={handlers.handleInputChange}
                />
              ) : (
                <Typography variant="h6">{state.userInfo.username}</Typography>
              )}
            </Box>

            {/* User Email */}
            <Box mb={1}>
              {state.isEditing ? (
                <TextField
                  label="Email"
                  name="email"
                  value={state.userInfo.email}
                  onChange={handlers.handleInputChange}
                  fullWidth
                />
              ) : (
                <Typography variant="body1">
                  <strong>Email:</strong> {state.userInfo.email}
                </Typography>
              )}
            </Box>

            {/* Admin Status */}
            <Box display="flex" alignItems="center">
              <Typography variant="body1" mr={1}>
                <strong>Admin:</strong>
              </Typography>
              {state.isEditing ? (
                <Select value={state.userInfo.isAdmin ? "Yes" : "No"} onChange={handlers.handleSelectChange}>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              ) : (
                <Typography variant="body1">{state.userInfo.isAdmin ? "Yes" : "No"}</Typography>
              )}
            </Box>
          </Box>
          {state.isEditing && (
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <TSCButton
                variant="outlined"
                buttonType="secondary"
                onClick={() => {
                  setters.setCloseDialog(false);
                  handlers.handleDiscardChanges(false);
                }}
                sx={{ mr: 1 }}>
                Discard
              </TSCButton>
              <TSCButton variant="contained" buttonType="primary" onClick={handlers.handleSaveChanges}>
                Save Changes
              </TSCButton>
            </Box>
          )}

          {/* Workshop Enrolled Title */}
          <Box display="flex">
            <School sx={{ mt: 0.5, mr: 0.5 }} />
            <Typography variant="h6" mb={2}>
              Registered Workshops
            </Typography>
          </Box>

          {/* Workshop Enrolled Section */}
          <Box>{workshopsList()}</Box>
        </Box>
      </Dialog>
      <TSCYesNoPopup
        open={state.openConfirmDialog}
        title="Are you sure you want to remove the user from the workshop?"
        onYes={handlers.handleRemoveWorkshop}
        onNo={handlers.handleCloseConfirmDialog}
        onClose={handlers.handleCloseConfirmDialog}
      />
      <TSCYesNoPopup
        open={state.showDiscardDialog}
        title="You have unsaved changes. Are you sure you want to discard them?"
        onYes={() => handlers.handleDiscardChanges(true)}
        onNo={handlers.handleCloseDiscardDialog}
        onClose={handlers.handleCloseDiscardDialog}
      />
    </>
  );
};
