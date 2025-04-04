import { School, PersonRemove, Close, Edit } from "@mui/icons-material";
import {
  Typography,
  IconButton,
  Dialog,
  Box,
  Avatar,
  Select,
  MenuItem,
  TableRow,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  Button
} from "@mui/material";
import { AdminSharedUser } from "@tsconline/shared";
import { CustomTooltip, TSCButton, TSCYesNoPopup } from "../components";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import useEditUser from "./edit-user-stats-hook";
import { useContext } from "react";
import { context } from "../state";
import { formatDate } from "../state/non-action-util";

type ShowAdditionalUserInfoProps = {
  data: AdminSharedUser;
};

export const ShowAdditionalUserInfo: React.FC<ShowAdditionalUserInfoProps> = (props) => {
  const { state } = useContext(context);
  const { editState, setters, handlers } = useEditUser({ data: props.data });
  const allWorkshops = state.workshops;

  const WorkshopsList: React.FC = () => {
    // Create a lookup map for allWorkshops
    const workshopMap = Object.fromEntries(allWorkshops.map((workshop) => [workshop.workshopId, workshop]));

    return (
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: "tableContainer.main",
          maxWidth: "100%"
        }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ whiteSpace: "nowrap", width: "30%" }}>Title</TableCell>
              <TableCell style={{ whiteSpace: "nowrap", width: "30%" }}>Start</TableCell>
              <TableCell style={{ whiteSpace: "nowrap", width: "30%" }}>End</TableCell>
              <TableCell style={{ width: "10%" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!editState.currentWorkshops || editState.currentWorkshops.length === 0 || allWorkshops.length === 0 ? (
              <TableRow>
                <TableCell align="center" colSpan={4} style={{ padding: "13px" }}>
                  <Typography ml={1} fontWeight={"bold"}>
                    No registered workshop
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              editState.currentWorkshops.map((value, index) => {
                const workshop = workshopMap[value]; // Access the workshop directly from the map
                return (
                  <TableRow key={index}>
                    <TableCell style={{ whiteSpace: "nowrap" }}>{workshop.title}</TableCell>
                    <TableCell style={{ whiteSpace: "nowrap" }}>{formatDate(workshop.start)}</TableCell>
                    <TableCell style={{ whiteSpace: "nowrap" }}>{formatDate(workshop.end)}</TableCell>
                    <TableCell>
                      <CustomTooltip title="Remove user from this workshop">
                        <IconButton
                          onClick={() => handlers.handleOpenConfirmRemovalOfUserFromWorkshop(value)}
                          edge="end"
                          aria-label="leave">
                          <PersonRemove />
                        </IconButton>
                      </CustomTooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <>
      <CustomTooltip title="Show Additional User Info">
        <IconButton onClick={() => setters.setIsMoreUserInfoFormOpen(true)}>
          <MoreVertOutlinedIcon />
        </IconButton>
      </CustomTooltip>
      <Dialog
        open={editState.isMoreUserInfoFormOpen}
        onClose={handlers.handleCloseTheMoreUserInfoForm}
        disableEscapeKeyDown
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="md"
        fullWidth={true}>
        <IconButton onClick={handlers.handleCloseTheMoreUserInfoForm} sx={{ position: "absolute", top: 8, right: 8 }}>
          <Close />
        </IconButton>

        {/* Overall Header */}
        <Box textAlign={"center"} width="100%" pt={3} pr={3} pb={0} pl={3}>
          <Typography variant="h5" mb={2} sx={{ fontWeight: "bold" }}>
            {props.data.username}
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
                  {props.data.pictureUrl ? (
                    <img src={props.data.pictureUrl} alt={props.data.username} />
                  ) : (
                    props.data.username[0].toUpperCase()
                  )}
                </Avatar>
              </Box>

              {/* User Name */}
              <Typography variant="h6">{props.data.username}</Typography>
            </Box>

            {/* User Email */}
            <Box mb={1}>
              <Typography variant="body1">
                <strong>Email:</strong> {props.data.email}
              </Typography>
            </Box>

            {/* Admin Status */}
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="body1" mr={1} fontWeight={"bold"}>
                Admin:
              </Typography>
              {editState.editMode ? (
                <Select
                  name="isAdmin"
                  value={editState.userInfo.isAdmin ? "Yes" : "No"}
                  onChange={handlers.handleSelectChange}
                  sx={{ width: 70, maxHeight: 30, fontSize: "0.875rem" }}>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              ) : (
                <Typography variant="body1">{editState.userInfo.isAdmin ? "Yes" : "No"}</Typography>
              )}
            </Box>

            {/* Account Type */}
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="body1" mr={1} fontWeight={"bold"}>
                Pro:
              </Typography>
              {editState.editMode ? (
                <Select
                  name="accountType"
                  value={editState.userInfo.accountType === "pro" ? "Yes" : "No"}
                  onChange={handlers.handleSelectChange}
                  sx={{ width: 70, maxHeight: 30, fontSize: "0.875rem" }}>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              ) : (
                <Typography variant="body1">{editState.userInfo.accountType === "pro" ? "Yes" : "No"}</Typography>
              )}
            </Box>
          </Box>
          {editState.editMode && (
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                variant="outlined"
                sx={{
                  borderColor: "error.main",
                  color: "error.main",
                  ":hover": {
                    borderColor: "error.light",
                    backgroundColor: "transparent"
                  },
                  mr: 1
                }}
                onClick={handlers.handleIsConfirmDiscardUserInfoChangeOpen}>
                Discard
              </Button>
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
          <Box>
            <WorkshopsList />
          </Box>
        </Box>
      </Dialog>
      <TSCYesNoPopup
        open={editState.isConfirmRemovalOfUserFromWorkshopDialogOpen}
        title="Are you sure you want to remove the user from the workshop?"
        onYes={handlers.removeUserFromWorkshop}
        onNo={handlers.cancelRemovalOfUserFromWorkshop}
        onClose={handlers.cancelRemovalOfUserFromWorkshop}
      />
      <TSCYesNoPopup
        open={editState.isConfirmUserInfoChangesOnExitFormOpen}
        title="You have unsaved changes. Are you sure you want to discard them?"
        onYes={handlers.handleDiscardUserInfoChangesThenCloseTheMoreUserInfoForm}
        onNo={handlers.handleCloseConfirmUserInfoChangesDialog}
        onClose={handlers.handleCloseConfirmUserInfoChangesDialog}
      />
      <TSCYesNoPopup
        open={editState.isConfirmDiscardUserInfoChangeOpen}
        title="You have unsaved changes. Are you sure you want to discard them?"
        onYes={handlers.handleDiscardUserInfoChanges}
        onNo={handlers.handleCloseConfirmUserInfoChangesDialog}
        onClose={handlers.handleCloseConfirmUserInfoChangesDialog}
      />
    </>
  );
};
