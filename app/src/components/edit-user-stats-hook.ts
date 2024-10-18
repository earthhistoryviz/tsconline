import { AdminSharedUser, WorkshopEnrolled } from "@tsconline/shared";
import { useState, useEffect } from "react";
import { EditableUserProperties } from "../types";

type UseUserStatsProps = {
  data: AdminSharedUser;
};

const useEditUser = ({ data }: UseUserStatsProps) => {
  const [moreUsersInfoFormOpen, setMoreUsersInfoFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [userInfo, setUserInfo] = useState<EditableUserProperties>({
    username: data.username,
    email: data.email,
    isAdmin: data.isAdmin,
    pictureUrl: data.pictureUrl || undefined
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUserInfo, setOriginalUserInfo] = useState(userInfo);
  const workshops = data.workshopsEnrolled ? data.workshopsEnrolled : null;
  const [currentWorkshops, setCurrentWorkshops] = useState<WorkshopEnrolled[] | null>(workshops);
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopEnrolled | null>(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  // Function to remove a workshop
  const handleRemoveWorkshop = () => {
    if (currentWorkshops) {
      if (selectedWorkshop) {
        const updatedWorkshops = currentWorkshops.filter(
          (workshop) => workshop.workshopId !== selectedWorkshop.workshopId
        );
        setCurrentWorkshops(updatedWorkshops);
      }
      handleCloseConfirmDialog();
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setOriginalUserInfo(userInfo);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUnsavedChanges(true);
    if (!(e.target.name in userInfo)) {
      console.error("wrong input type.");
      handleDiscardChanges(false);
      return;
    }
    setUserInfo({
      ...userInfo,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveChanges = () => {
    if (selectedFile) {
      const newAvatarUrl = URL.createObjectURL(selectedFile); // Preview URL for the uploaded image
      setUserInfo({ ...userInfo, pictureUrl: newAvatarUrl });
    }
    setUnsavedChanges(false);
    setIsEditing(false);
  };

  const handleDiscardChanges = (closeDialog: boolean) => {
    setUserInfo(originalUserInfo); // Reset to original data
    setSelectedFile(null); // Clear any selected file
    setIsEditing(false);
    setUnsavedChanges(false);
    setShowDiscardDialog(false);
    if (closeDialog) {
      setMoreUsersInfoFormOpen(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
    setUnsavedChanges(true);
  };

  const handleOpenConfirmDialog = (title: WorkshopEnrolled) => {
    setSelectedWorkshop(title);
    setOpenConfirmDialog(true);
  };

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setSelectedWorkshop(null);
  };

  const handleCloseDiscardDialog = () => {
    setShowDiscardDialog(false);
  };

  const handleCloseDialog = () => {
    if (unsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      handleDiscardChanges(true);
      setMoreUsersInfoFormOpen(false);
    }
  };

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

  return {
    state: {
      moreUsersInfoFormOpen,
      isEditing,
      unsavedChanges,
      showDiscardDialog,
      userInfo,
      selectedFile,
      originalUserInfo,
      currentWorkshops,
      selectedWorkshop,
      openConfirmDialog
    },

    setters: {
      setMoreUsersInfoFormOpen,
      setCurrentWorkshops,
      setIsEditing,
      setOpenConfirmDialog,
      setOriginalUserInfo,
      setUnsavedChanges,
      setSelectedFile,
      setShowDiscardDialog,
      setSelectedWorkshop,
      setUserInfo
    },
    handlers: {
      handleEditToggle,
      handleInputChange,
      handleSaveChanges,
      handleDiscardChanges,
      handleFileChange,
      handleOpenConfirmDialog,
      handleCloseConfirmDialog,
      handleCloseDiscardDialog,
      handleCloseDialog,
      handleRemoveWorkshop
    }
  };
};

export default useEditUser;
