import { AdminSharedUser } from "@tsconline/shared";
import { useState, useEffect } from "react";
import { EditableUserProperties } from "../types";
import { SelectChangeEvent } from "@mui/material/Select";

type UseUserStatsProps = {
  data: AdminSharedUser;
};

const useEditUser = ({ data }: UseUserStatsProps) => {
  const workshops = data.workshopIds;
  const [moreUserInfoFormOpen, setMoreUserInfoFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [openConfirmDiscardUserInfoChange, setOpenConfirmDiscardUserInfoChange] = useState(false);
  const [openConfirmDiscardUserInfoChangeAndCloseForm, setOpenConfirmDiscardUserInfoChangeAndCloseForm] =
    useState(false);
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
  const [openConfirmRemovalOfUserFromWorkshopDialog, setOpenConfirmRemovalOfUserFromWorkshopDialog] = useState(false);
  // Function to remove a workshop
  const handleRemoveWorkshop = () => {
    if (currentWorkshops) {
      if (selectedWorkshop) {
        const updatedWorkshops = currentWorkshops.filter((workshop) => workshop !== selectedWorkshop);
        setCurrentWorkshops(updatedWorkshops);
      }
      handleCloseConfirmRemovalOfUserFromWorkshop();
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
    setOriginalUserInfo(userInfo);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUnsavedChanges(true);
    const { name } = e.target;
    if (!(name in userInfo)) {
      console.error("Requested input change while editing UserInfo for field " + name + "doesn't exist");
      handleDiscardUserInfoChanges();
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
    setEditMode(false);
  };

  const handleDiscardUserInfoChanges = () => {
    setUserInfo(originalUserInfo); // Reset to original data
    setSelectedFile(null); // Clear any selected file
    setEditMode(false);
    setUnsavedChanges(false);
    setOpenConfirmDiscardUserInfoChange(false);
  };

  const handleDiscardUserInfoChangesThenCloseTheMoreUserInfoForm = () => {
    setUserInfo(originalUserInfo); // Reset to original data
    setSelectedFile(null); // Clear any selected file
    setEditMode(false);
    setUnsavedChanges(false);
    setOpenConfirmDiscardUserInfoChangeAndCloseForm(false);
    setMoreUserInfoFormOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
    setUnsavedChanges(true);
  };

  const handleOpenConfirmRemovalOfUserFromWorkshop = (id: number) => {
    setSelectedWorkshop(id);
    setOpenConfirmRemovalOfUserFromWorkshopDialog(true);
  };

  const handleCloseConfirmRemovalOfUserFromWorkshop = () => {
    setOpenConfirmRemovalOfUserFromWorkshopDialog(false);
    setSelectedWorkshop(null);
  };

  const handleCloseConfirmDiscardUserInfoChange = () => {
    setOpenConfirmDiscardUserInfoChange(false);
    setOpenConfirmDiscardUserInfoChangeAndCloseForm(false);
  };

  const handleCloseTheMoreUserInfoForm = () => {
    if (unsavedChanges) {
      setOpenConfirmDiscardUserInfoChangeAndCloseForm(true);
    } else {
      handleDiscardUserInfoChangesThenCloseTheMoreUserInfoForm();
    }
  };
  const handleOpenConfirmDiscardUserInfoChange = () => {
    setOpenConfirmDiscardUserInfoChange(true);
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
    editState: {
      moreUserInfoFormOpen,
      editMode,
      unsavedChanges,
      openConfirmDiscardUserInfoChange,
      userInfo,
      selectedFile,
      originalUserInfo,
      currentWorkshops,
      selectedWorkshop,
      openConfirmRemovalOfUserFromWorkshopDialog,
      openConfirmDiscardUserInfoChangeAndCloseForm
    },

    setters: {
      setMoreUserInfoFormOpen,
      setCurrentWorkshops,
      setEditMode,
      setOpenConfirmRemovalOfUserFromWorkshopDialog,
      setOriginalUserInfo,
      setSelectedFile,
      setSelectedWorkshop
    },
    handlers: {
      handleEditToggle,
      handleInputChange,
      handleSelectChange,
      handleSaveChanges,
      handleDiscardUserInfoChanges,
      handleFileChange,
      handleOpenConfirmRemovalOfUserFromWorkshop,
      handleCloseConfirmRemovalOfUserFromWorkshop,
      handleCloseConfirmDiscardUserInfoChange,
      handleCloseTheMoreUserInfoForm,
      handleRemoveWorkshop,
      handleDiscardUserInfoChangesThenCloseTheMoreUserInfoForm,
      handleOpenConfirmDiscardUserInfoChange
    }
  };
};

export default useEditUser;
