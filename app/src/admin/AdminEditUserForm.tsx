import { School, PersonRemove, Close, Edit, FileUpload } from "@mui/icons-material";
import { Typography, List, ListItem, IconButton, Dialog, Box, Button, Avatar, TextField, Select, MenuItem } from "@mui/material";
import { AdminSharedUser } from "@tsconline/shared";
import { useState, useEffect } from "react";
import { CustomTooltip, TSCYesNoPopup } from "../components";
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';

type MoreCellRendererProps = {

    data: AdminSharedUser;
};

export const ShowUserStatsRenderer: React.FC<MoreCellRendererProps> = (props) => {

    const { data } = props;
    const [moreUsersInfoFormOpen, setMoreUsersInfoFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
    const [userInfo, setUserInfo] = useState({
        username: data.username,
        email: data.email,
        isAdmin: data.isAdmin,
        pictureUrl: data.pictureUrl || null
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [originalUserInfo, setOriginalUserInfo] = useState(userInfo);
    const workshops = data.workshopTitle ? data.workshopTitle : ["No registered workshop"];
    const [currentWorkshops, setCurrentWorkshops] = useState(workshops);
    const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null); // Store the workshop title to confirm
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const worshopsList = () => {
        return ((currentWorkshops[0] === "No registered workshop" && workshops.length === 1) || currentWorkshops.length == 0) ? <Typography ml={1}>No registered workshop</Typography> : (<List dense={true}>
            {currentWorkshops.map((value, index) => (
                <ListItem key={index}>
                    <School />
                    <Typography ml={1}>{value}</Typography>
                    <CustomTooltip title="Remove user from this workshop">
                        <IconButton onClick={() => handleOpenConfirmDialog(value)} edge="end" aria-label="leave">
                            <PersonRemove />
                        </IconButton>
                    </CustomTooltip>
                </ListItem>
            ))}
        </List>)
    }

    // Function to remove a workshop
    const handleRemoveWorkshop = () => {
        if (selectedWorkshop) {
            const updatedWorkshops = currentWorkshops.filter((workshop) => workshop !== selectedWorkshop); // Remove the workshop at the given index
            setCurrentWorkshops(updatedWorkshops); // Update the state
        }
        handleCloseConfirmDialog();
    };
    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        setOriginalUserInfo(userInfo);
    };
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUnsavedChanges(true);
        setUserInfo({
            ...userInfo,
            [e.target.name]: e.target.value,
        });
    };
    const handleSaveChanges = () => {
        if (selectedFile) {
            const newAvatarUrl = URL.createObjectURL(selectedFile); // Preview URL for the uploaded image
            setUserInfo({ ...userInfo, pictureUrl: newAvatarUrl });
        }
        setUnsavedChanges(false);
        setIsEditing(false); // Quit edit mode
    };
    const handleDiscardChanges = (closeDialog: boolean) => {
        setUserInfo(originalUserInfo); // Reset to original data
        setSelectedFile(null); // Clear any selected file
        setIsEditing(false); // Quit edit mode
        setUnsavedChanges(false);
        setShowDiscardDialog(false);
        if (closeDialog) {
            setMoreUsersInfoFormOpen(false);
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]); // Store the selected file
        }
    };
    // Function to handle opening the confirmation dialog
    const handleOpenConfirmDialog = (title: string) => {
        setSelectedWorkshop(title);
        setOpenConfirmDialog(true);
    };

    // Function to handle closing the confirmation dialog
    const handleCloseConfirmDialog = () => {
        setOpenConfirmDialog(false);
        setSelectedWorkshop(null); // Clear the selected workshop
    };

    const handleCloseDiscardDialog = () => {
        setShowDiscardDialog(false); // Close discard confirmation dialog
    };

    // Function to intercept dialog closure
    const handleCloseDialog = () => {
        if (unsavedChanges) {
            setShowDiscardDialog(true); // Show confirmation dialog if there are unsaved changes
        } else {
            handleDiscardChanges(true);
            setMoreUsersInfoFormOpen(false);// Close the main dialog
        }
    };

    const handleOpen = () => {
        setMoreUsersInfoFormOpen(true);
    };
    const handleClose = (event: React.MouseEvent<HTMLElement>, reason: string) => {
        if (reason !== "backdropClick") {
            handleDiscardChanges(true);
            setMoreUsersInfoFormOpen(false);
        }
    }
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (unsavedChanges) {
                event.preventDefault();
                event.returnValue = ""; // Shows the browser's default warning for unsaved changes
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [unsavedChanges]);

    return (
        <><CustomTooltip title="Show user stats">
            <IconButton onClick={handleOpen}>
                <MoreVertOutlinedIcon />
            </IconButton>
        </CustomTooltip>
            <Dialog
                open={moreUsersInfoFormOpen}
                onClose={handleClose}
                disableEscapeKeyDown
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <IconButton
                    onClick={() => handleCloseDialog()}
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
                                    onChange={(e) => {
                                        setUserInfo({ ...userInfo, isAdmin: e.target.value === "Yes" });
                                        setUnsavedChanges(true);
                                    }}
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
                            <Button variant="outlined" color="secondary" onClick={() => handleDiscardChanges(false)} sx={{ mr: 1 }}>
                                Discard
                            </Button>
                            <Button variant="contained" color="primary" onClick={handleSaveChanges}>
                                Save Changes
                            </Button>
                        </Box>
                    )}

                    {/* Workshop Enrolled Title */}
                    <Typography variant="h6" mb={2}>
                        Registered Workshops
                    </Typography>

                    {/* Workshop Enrolled Section */}
                    <Box border={1} borderRadius={5} p={2} borderColor="grey.400">
                        {worshopsList()}
                    </Box>
                </Box >
            </Dialog >
            <TSCYesNoPopup open={openConfirmDialog} title={"Are you sure you want to remove the user from the workshop?"} onYes={
                handleRemoveWorkshop} onNo={handleCloseConfirmDialog} onClose={handleCloseConfirmDialog} />
            <TSCYesNoPopup open={showDiscardDialog} title={" You have unsaved changes. Are you sure you want to discard them?"} onYes={
                () => handleDiscardChanges(true)} onNo={handleCloseDiscardDialog} onClose={handleCloseDiscardDialog} />
        </>
    );
};