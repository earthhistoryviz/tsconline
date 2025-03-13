import { AdminSharedUser } from "@tsconline/shared";
import { useState, useEffect } from "react";
import { EditableUserProperties } from "../types";
import { SelectChangeEvent } from "@mui/material/Select";
import { useContext } from "react";
import { context } from "../state";

type UseUserStatsProps = {
  data: AdminSharedUser;
};

const useEditUser = ({ data }: UseUserStatsProps) => {
  const workshops = data.workshopIds;
  const [isMoreUserInfoFormOpen, setIsMoreUserInfoFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isConfirmDiscardUserInfoChangeOpen, setIsConfirmDiscardUserInfoChangeOpen] = useState(false);
  const [isConfirmUserInfoChangesOnExitFormOpen, setIsConfirmUserInfoChangesOnExitFormOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<EditableUserProperties>({
    isAdmin: data.isAdmin,
    accountType: data.accountType,
    pictureUrl: data.pictureUrl || undefined
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUserInfo, setOriginalUserInfo] = useState(userInfo);
  const [currentWorkshops, setCurrentWorkshops] = useState<number[] | undefined>(workshops);
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
  const [isConfirmRemovalOfUserFromWorkshopDialogOpen, setIsConfirmRemovalOfUserFromWorkshopDialogOpen] =
    useState(false);

  const { actions } = useContext(context);

  // Function to remove a workshop
  const removeUserFromWorkshop = () => {
    if (currentWorkshops) {
      if (selectedWorkshop) {
        const updatedWorkshops = currentWorkshops.filter((workshop) => workshop !== selectedWorkshop);
        setCurrentWorkshops(updatedWorkshops);
      }
      cancelRemovalOfUserFromWorkshop();
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
    setOriginalUserInfo(userInfo);
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    setUnsavedChanges(true);

    const { name, value } = e.target;
    setUserInfo((prevUserInfo) => ({
      ...prevUserInfo,
      [name]: name === "isAdmin" ? value === "Yes" : value === "Yes" ? "pro" : "default"
    }));
  };

  const handleSaveChanges = async () => {
    if (selectedFile) {
      const newAvatarUrl = URL.createObjectURL(selectedFile); // Preview URL for the uploaded image
      setUserInfo({ ...userInfo, pictureUrl: newAvatarUrl });
    }
    const modifiedUser = {
      username: data.username,
      email: data.email,
      accountType: userInfo.accountType,
      isAdmin: userInfo.isAdmin ? 1 : 0
    };

    const resp = await actions.adminModifyUsers(modifiedUser);
    if (resp && resp === "Unable to modify user. Please try again later.") {
      discardUserInfoChanges();
    }
    setUnsavedChanges(false);
    setEditMode(false);
  };

  function discardUserInfoChanges() {
    setUserInfo(originalUserInfo); // Reset to original data
    setSelectedFile(null); // Clear any selected file
    setEditMode(false);
    setUnsavedChanges(false);
    setIsConfirmDiscardUserInfoChangeOpen(false);
  }

  const handleDiscardUserInfoChanges = () => {
    discardUserInfoChanges();
  };

  const handleDiscardUserInfoChangesThenCloseTheMoreUserInfoForm = () => {
    discardUserInfoChanges();
    setIsMoreUserInfoFormOpen(false);
    setIsConfirmUserInfoChangesOnExitFormOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
    setUnsavedChanges(true);
  };

  const handleOpenConfirmRemovalOfUserFromWorkshop = (id: number) => {
    setSelectedWorkshop(id);
    setIsConfirmRemovalOfUserFromWorkshopDialogOpen(true);
  };

  const cancelRemovalOfUserFromWorkshop = () => {
    setIsConfirmRemovalOfUserFromWorkshopDialogOpen(false);
    setSelectedWorkshop(null);
  };

  const handleCloseConfirmUserInfoChangesDialog = () => {
    setIsConfirmDiscardUserInfoChangeOpen(false);
    setIsConfirmUserInfoChangesOnExitFormOpen(false);
  };

  const handleCloseTheMoreUserInfoForm = () => {
    if (unsavedChanges) {
      setIsConfirmUserInfoChangesOnExitFormOpen(true);
    } else {
      handleDiscardUserInfoChangesThenCloseTheMoreUserInfoForm();
    }
  };
  const handleIsConfirmDiscardUserInfoChangeOpen = () => {
    setIsConfirmDiscardUserInfoChangeOpen(true);
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
      isMoreUserInfoFormOpen,
      editMode,
      unsavedChanges,
      isConfirmDiscardUserInfoChangeOpen,
      userInfo,
      selectedFile,
      originalUserInfo,
      currentWorkshops,
      selectedWorkshop,
      isConfirmRemovalOfUserFromWorkshopDialogOpen,
      isConfirmUserInfoChangesOnExitFormOpen
    },

    setters: {
      setIsMoreUserInfoFormOpen,
      setCurrentWorkshops,
      setEditMode,
      setIsConfirmRemovalOfUserFromWorkshopDialogOpen,
      setOriginalUserInfo,
      setSelectedFile,
      setSelectedWorkshop
    },
    handlers: {
      handleEditToggle,
      handleSelectChange,
      handleSaveChanges,
      handleDiscardUserInfoChanges,
      handleFileChange,
      handleOpenConfirmRemovalOfUserFromWorkshop,
      cancelRemovalOfUserFromWorkshop,
      handleCloseConfirmUserInfoChangesDialog,
      handleCloseTheMoreUserInfoForm,
      removeUserFromWorkshop,
      handleDiscardUserInfoChangesThenCloseTheMoreUserInfoForm,
      handleIsConfirmDiscardUserInfoChangeOpen
    }
  };
};

export default useEditUser;
