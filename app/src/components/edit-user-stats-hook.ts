import { AdminSharedUser } from "@tsconline/shared";
import { useState, useEffect } from "react";
import { EditableUserProperties } from "../types";
import { SelectChangeEvent } from "@mui/material/Select";

type UseUserStatsProps = {
  data: AdminSharedUser;
};

const useEditUser = ({ data }: UseUserStatsProps) => {
  const workshops = data.workshopIds;
  const [moreUsersInfoFormOpen, setMoreUsersInfoFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showDiscardDialogAndCloseForm, setshowDiscardDialogAndCloseForm] = useState(false);
  const [userInfo, setUserInfo] = useState<EditableUserProperties>({
    username: data.username,
    email: data.email,
    isAdmin: data.isAdmin,
    pictureUrl: data.pictureUrl || undefined
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUserInfo, setOriginalUserInfo] = useState(userInfo);
  const [currentWorkshops, setCurrentWorkshops] = useState<number[] | undefined>(workshops);
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  //const [closeDialog, setCloseDialog] = useState(false);
  // Function to remove a workshop
  const handleRemoveWorkshop = () => {
    if (currentWorkshops) {
      if (selectedWorkshop) {
        const updatedWorkshops = currentWorkshops.filter((workshop) => workshop !== selectedWorkshop);
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
    const { name } = e.target;
    if (!(name in userInfo)) {
      console.error("Requested input change while editing UserInfo for field " + name + "doesn't exist");
      handleDiscardChanges();
      return;
    }
    setUserInfo({
      ...userInfo,
      [name]: e.target.value
    });
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    setUnsavedChanges(true);

    const { value } = e.target;

    setUserInfo({
      ...userInfo,
      isAdmin: value === "Yes"
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

  const handleDiscardChanges = () => {

    setUserInfo(originalUserInfo); // Reset to original data
    setSelectedFile(null); // Clear any selected file
    setIsEditing(false);
    setUnsavedChanges(false);
    setShowDiscardDialog(false);
  };

  const handleDiscardChangesAndCloseTheForm = () => {
    setUserInfo(originalUserInfo); // Reset to original data
    setSelectedFile(null); // Clear any selected file
    setIsEditing(false);
    setUnsavedChanges(false);
    setshowDiscardDialogAndCloseForm(false);
    setMoreUsersInfoFormOpen(false);
    //setCloseDialog(false);


  };

  // const handleConfirmDiscard = (closeTheForm: boolean) => {
  //   if (closeTheForm) {
  //     handleDiscardChangesAndCloseTheForm();
  //   } else {
  //     handleDiscardChanges();
  //   }

  // }


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
    setUnsavedChanges(true);
  };

  const handleOpenConfirmDialog = (id: number) => {
    setSelectedWorkshop(id);
    setOpenConfirmDialog(true);
  };

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setSelectedWorkshop(null);
  };

  const handleCloseDiscardDialog = () => {
    setShowDiscardDialog(false);
    setshowDiscardDialogAndCloseForm(false);
  };

  const handleCloseForm = () => {
    if (unsavedChanges) {
      //setCloseDialog(true);
      //setShowDiscardDialog(true);
      setshowDiscardDialogAndCloseForm(true);
    } else {
      handleDiscardChangesAndCloseTheForm();
    }
  };
  const handleShowDiscardDialog = () => {
    setShowDiscardDialog(true);

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

  return {
    editState: {
      moreUsersInfoFormOpen,
      isEditing,
      unsavedChanges,
      showDiscardDialog,
      userInfo,
      selectedFile,
      originalUserInfo,
      currentWorkshops,
      selectedWorkshop,
      openConfirmDialog,
      showDiscardDialogAndCloseForm
    },

    setters: {
      setMoreUsersInfoFormOpen,
      setCurrentWorkshops,
      setIsEditing,
      setOpenConfirmDialog,
      setOriginalUserInfo,
      setSelectedFile,
      setShowDiscardDialog,
      setSelectedWorkshop,
    },
    handlers: {
      handleEditToggle,
      handleInputChange,
      handleSelectChange,
      handleSaveChanges,
      handleDiscardChanges,
      handleFileChange,
      handleOpenConfirmDialog,
      handleCloseConfirmDialog,
      handleCloseDiscardDialog,
      handleCloseForm,
      handleRemoveWorkshop,
      handleDiscardChangesAndCloseTheForm,
      handleShowDiscardDialog,

    }
  };
};

export default useEditUser;
