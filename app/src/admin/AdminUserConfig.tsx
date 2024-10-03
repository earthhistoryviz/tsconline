import { observer } from "mobx-react-lite";
import { useContext, useRef, useState } from "react";
import { context } from "../state";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef } from "ag-grid-community";
import { Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, List, ListItem, ListItemIcon, ListItemText, Menu, MenuItem, Select, Switch, TextField, Typography, useTheme } from "@mui/material";
import { AdminAddUserForm } from "./AdminAddUserForm";
import {
  AdminSharedUser,
  DatapackIndex,
  BaseDatapackProps,
  assertAdminSharedUser,
  isUserDatapack
} from "@tsconline/shared";
import { CustomTooltip, TSCButton } from "../components";
import { isOwnedByUser } from "../state/non-action-util";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import React from "react";
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Close, Delete, Edit, ExitToApp, FileUpload, FileUploadOutlined, PersonRemove, School, UploadFile } from "@mui/icons-material";

const checkboxRenderer = (params: { value: boolean }) => {
  if (params.value === true) {
    return <span className="ag-icon-tick" />;
  } else {
    return <span className="ag-icon-cross" />;
  }
};


type MoreCellRendererProps = {

  data: AdminSharedUser;
};

const ShowWorkshopTitleRenderer: React.FC<MoreCellRendererProps> = (props) => {

  const { data } = props;
  const [moreUsersInfoFormOpen, setMoreUsersInfoFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    username: data.username,
    email: data.email,
    isAdmin: data.isAdmin,
    pictureUrl: data.pictureUrl || null
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUserInfo, setOriginalUserInfo] = useState(userInfo);
  const theme = useTheme();
  const workshops = data.workshopTitle ? data.workshopTitle : ["No workshops enrolled"];
  const [currentWorkshops, setCurrentWorkshops] = useState(workshops);
  const worshopsList = () => {
    return ((currentWorkshops[0] === "No workshops enrolled" && workshops.length === 1) || currentWorkshops.length == 0) ? <Typography ml={1}>No workshops enrolled</Typography> : (<List dense={true}>
      {currentWorkshops.map((value, index) => (
        <ListItem key={index}>
          <School />
          <Typography ml={1}>{value}</Typography>
          {/* Quit/Leave Icon */}
          <CustomTooltip title="Remove user from this workshop">
            <IconButton onClick={() => handleRemoveWorkshop(value)} edge="end" aria-label="leave">
              <PersonRemove />
            </IconButton>
          </CustomTooltip>
        </ListItem>
      ))}
    </List>)
  }

  // Function to remove a workshop
  const handleRemoveWorkshop = (title: string) => {
    const updatedWorkshops = currentWorkshops.filter((workshop) => workshop !== title); // Remove the workshop at the given index
    setCurrentWorkshops(updatedWorkshops); // Update the state
  };
  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setOriginalUserInfo(userInfo);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInfo({
      ...userInfo,
      [e.target.name]: e.target.value,
    });
  };
  const handleSaveChanges = () => {
    if (selectedFile) {
      const newAvatarUrl = URL.createObjectURL(selectedFile); // Preview URL for the uploaded image
      console.log(newAvatarUrl);
      setUserInfo({ ...userInfo, pictureUrl: newAvatarUrl });
    }
    setIsEditing(false); // Quit edit mode
  };
  const handleDiscardChanges = () => {
    setUserInfo(originalUserInfo); // Reset to original data
    setSelectedFile(null); // Clear any selected file
    setIsEditing(false); // Quit edit mode
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]); // Store the selected file
    }
  };
  const handleOpen = () => {
    setMoreUsersInfoFormOpen(true);
  };
  const handleClose = () => {
    setMoreUsersInfoFormOpen(false);
  }
  return (
    <><CustomTooltip title="Check Enrolled Workshop">
      <IconButton onClick={handleOpen}>
        <MoreVertOutlinedIcon />
      </IconButton>
    </CustomTooltip>
      <Dialog
        open={moreUsersInfoFormOpen}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <Close />
        </IconButton>

        {/* Overall Header */}
        <Box textAlign={"center"} width="100%" pt={3} pr={3} pb={0} pl={3}>
          <Typography variant="h5" mb={2} sx={{ fontWeight: 'bold' }}>
            Stats of {data.username}
          </Typography>
        </Box>
        {/* Basic Information Title */}
        <Box textAlign="left" width="100%" pt={0} pr={3} pb={3} pl={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center">
              <Typography variant="h6">
                Basic Information
              </Typography>
              <IconButton onClick={handleEditToggle} sx={{ ml: 1 }}>
                <Edit />
              </IconButton>
            </Box>
          </Box>

          {/* Basic Information Section */}
          <Box border={1} borderRadius={5} p={2} mb={2} borderColor="grey.400">
            {/* User Avatar */}
            <Box display="flex" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" mb={2} position="relative">
                <Avatar sx={{ width: 56, height: 56, mr: 2 }}>
                  {userInfo.pictureUrl ? <img src={userInfo.pictureUrl} alt={userInfo.username} /> : userInfo.username[0].toUpperCase()}
                </Avatar>
                {isEditing && (
                  <Box position="absolute" bottom={-3} right={12} zIndex={1}>
                    <CustomTooltip title="Upload avatar">
                      <IconButton component="label" sx={{ padding: 0, backgroundColor: 'transparent', borderRadius: '50%' }}>
                        <FileUpload fontSize="small" />
                        <input type="file" hidden onChange={handleFileChange} accept="image/*" />
                      </IconButton>
                    </CustomTooltip>
                  </Box>
                )}
              </Box>

              {isEditing ? (
                <TextField
                  label="Username"
                  name="username"
                  value={userInfo.username}
                  onChange={handleInputChange}
                />
              ) : (
                <Typography variant="h6">{userInfo.username}</Typography>
              )}
            </Box>

            {/* User Email */}
            <Box mb={1}>
              {isEditing ? (
                <TextField
                  label="Email"
                  name="email"
                  value={userInfo.email}
                  onChange={handleInputChange}
                  fullWidth
                />
              ) : (
                <Typography variant="body1">
                  <strong>Email:</strong> {userInfo.email}
                </Typography>
              )}
            </Box>

            {/* Admin Status */}
            <Box display="flex" alignItems="center">
              <Typography variant="body1" mr={1}>
                <strong>Admin:</strong>
              </Typography>
              {isEditing ? (
                <Select
                  value={userInfo.isAdmin ? "Yes" : "No"}
                  onChange={(e) => setUserInfo({ ...userInfo, isAdmin: e.target.value === "Yes" })}
                >
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              ) : (
                <Typography variant="body1">
                  {userInfo.isAdmin ? "Yes" : "No"}
                </Typography>
              )}
            </Box></Box>
          {isEditing && (
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button variant="outlined" color="secondary" onClick={handleDiscardChanges} sx={{ mr: 1 }}>
                Discard
              </Button>
              <Button variant="contained" color="primary" onClick={handleSaveChanges}>
                Save Changes
              </Button>
            </Box>
          )}

          {/* Workshop Enrolled Title */}
          <Typography variant="h6" mb={2}>
            Workshop Enrolled
          </Typography>

          {/* Workshop Enrolled Section */}
          <Box border={1} borderRadius={5} p={2} borderColor="grey.400">
            {worshopsList()}
          </Box>
        </Box >
      </Dialog >

      {/*  <Dialog
        open={moreUsersInfoFormOpen}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <Box textAlign="center" width="100%">
          <Typography variant="h5" mb="5px">
            Stats of {data.username}
          </Typography>
        </Box >
        <div>
          <Typography variant="h5" mb="5px">
            Basic Information
          </Typography>
        </div>
        <div>
          <Typography variant="h5" mb="5px">
            Workshop Enrolled
          </Typography>
          <List dense={true}>
            {workshops.map((value, index) => (
              <ListItem key={index}>
                <School />
                <Typography>{value}</Typography>
              </ListItem>
            ))}
          </List></div>

      </Dialog > */}</>
  );

  /* return (
    <PopupState variant="popover" popupId="demo-popup-menu">
      {(popupState) => (
        <React.Fragment>
          <Button variant="text" {...bindTrigger(popupState)}>
            <CustomTooltip title="Check Enrolled Workshop">
              {/* <MoreVertIcon />
              <MoreVertOutlinedIcon />
            </CustomTooltip>
          </Button>
          <Menu {...bindMenu(popupState)}>
            {workshops.map((value, index) => (
              <MenuItem
                key={index}
                className="settings-sub-menu-item"
              >
                <Typography>{value}</Typography>
              </MenuItem>
            ))}
          </Menu>
        </React.Fragment>
      )}
    </PopupState>
  ); */
};

const userColDefs: ColDef[] = [
  {
    headerName: "Username",
    field: "username",
    sortable: true,
    filter: true,
    rowDrag: true,
    checkboxSelection: true,
    minWidth: 120
  },
  { headerName: "Email", field: "email", sortable: true, filter: true },
  { headerName: "UUID", field: "uuid" },
  { headerName: "User ID", field: "userId", flex: 1 },
  {
    headerName: "Admin",
    field: "isAdmin",
    width: 90,
    autoHeaderHeight: true,
    wrapHeaderText: true,
    flex: 1,
    cellRenderer: checkboxRenderer
  },
  {
    headerName: "Email Verified",
    field: "emailVerified",
    width: 90,
    flex: 1,
    autoHeaderHeight: true,
    wrapHeaderText: true,
    cellRenderer: checkboxRenderer
  },
  { headerName: "Google User", field: "isGoogleUser", width: 120, flex: 1, cellRenderer: checkboxRenderer },
  {
    headerName: "Invalidated Session?",
    field: "invalidateSession",
    width: 110,
    autoHeaderHeight: true,
    wrapHeaderText: true,
    flex: 1,
    cellRenderer: checkboxRenderer
  },
  { headerName: "Picture URL", field: "pictureUrl", width: 80, autoHeaderHeight: true, wrapHeaderText: true, flex: 1 },
  {
    //headerName: "Workshop Title",
    headerName: "More",
    field: "workshopTitle",
    //field: "workshopNumber",
    width: 100,
    autoHeaderHeight: true,
    wrapHeaderText: true,
    flex: 1,
    cellRenderer: ShowWorkshopTitleRenderer
  }
];
const userDefaultColDefs = {
  flex: 2,
  minWidth: 80
};

export const AdminUserConfig = observer(function AdminUserConfig() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const gridRef = useRef<AgGridReact<AdminSharedUser>>(null);

  /**
   * delete selected users
   * @returns
   */
  const deleteUsers = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || !selectedNodes.length) return;
    try {
      const users = selectedNodes.map((node) => {
        assertAdminSharedUser(node.data);
        return node.data;
      });
      await actions.adminDeleteUsers(users);
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <Box className="admin-user-config-buttons">
        <AdminAddUserForm />
        <TSCButton onClick={deleteUsers}>Delete Selected Users</TSCButton>
      </Box>
      <AgGridReact
        defaultColDef={userDefaultColDefs}
        ref={gridRef}
        rowMultiSelectWithClick
        rowSelection="multiple"
        rowDragManaged
        columnDefs={userColDefs}
        rowData={state.admin.displayedUsers}
        components={{ ShowWorkshopTitleRenderer }}
        onModelUpdated={() => actions.adminSetDisplayedUserDatapacks({})}
        onRowSelected={async (event) => {
          if (event.node.isSelected()) {
            if (!event.data.uuid || typeof event.data.uuid !== "string") return;
            await actions.adminAddDisplayedUserDatapack(event.data.uuid);
          } else {
            // remove the user's datapacks from the index
            if (!event.data.uuid || typeof event.data.uuid !== "string") return;
            actions.adminRemoveDisplayedUserDatapack(event.data.uuid);
          }
        }}
      />
      <Box mt="20px">
        <Typography variant="h5">Selected Users&apos; Datapacks</Typography>
        <Box m="20px">
          <Divider />
        </Box>
      </Box>
      <AdminDatapackDetails
        datapackIndex={Object.values(state.admin.displayedUserDatapacks).reduce((acc, val) => ({ ...acc, ...val }), {})}
      />
    </Box>
  );
});

const datapackColDefs: ColDef[] = [
  {
    headerName: "Datapack Title",
    field: "title",
    sortable: true,
    filter: true,
    rowDrag: true,
    flex: 1,
    checkboxSelection: true
  },
  { headerName: "File Name", field: "file", flex: 1, sortable: true, filter: true },
  { headerName: "Age Units", field: "ageUnits", flex: 1 },
  { headerName: "Description", field: "description", flex: 1 },
  { headerName: "Size", field: "size", flex: 1 },
  { headerName: "Format Version", field: "formatVersion", flex: 1 }
];
type AdminDatapackDetailsProps = {
  datapackIndex: DatapackIndex;
};
const AdminDatapackDetails: React.FC<AdminDatapackDetailsProps> = observer(({ datapackIndex }) => {
  const theme = useTheme();
  const { actions, state } = useContext(context);
  const gridRef = useRef<AgGridReact<BaseDatapackProps>>(null);
  /**
   * delete selected datapacks then refetch the user's datapacks
   * @returns
   */
  const deleteDatapacks = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || !selectedNodes.length) return;
    try {
      const datapacks = selectedNodes.map((node) => {
        if (!node.data?.storedFileName || !isOwnedByUser(node.data, state.user?.uuid))
          throw new Error("Invalid datapack");
        return { uuid: isUserDatapack(node.data) ? node.data.uuid : "", datapack: node.data.storedFileName };
      });
      const uuids = new Set<string>(datapacks.map((dp) => dp.uuid).filter((uuid) => !!uuid));
      await actions.adminDeleteUserDatapacks(datapacks);
      actions.updateAdminUserDatapacks([...uuids]);
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <Box className={theme.palette.mode === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} height={500}>
      <Box m="10px">
        <TSCButton onClick={deleteDatapacks}>Delete Selected Datapacks</TSCButton>
      </Box>
      <AgGridReact
        ref={gridRef}
        rowSelection="multiple"
        rowMultiSelectWithClick
        rowDragManaged
        columnDefs={datapackColDefs}
        rowData={Object.values(datapackIndex)}
      />
    </Box>
  );
});
