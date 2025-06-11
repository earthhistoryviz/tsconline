import { SharedWorkshop } from "@tsconline/shared";
import dayjs, { Dayjs } from "dayjs";
import { useContext, useState } from "react";
import { context } from "../state";
import { displayServerError } from "../state/actions/util-actions";
import { ErrorCodes } from "../util/error-codes";

export const useWorkshopCreateEditForm = (
  currentWorkshop: SharedWorkshop | null,
  editMode: boolean,
  onClose: () => void
) => {
  const { actions, state } = useContext(context);
  const [loading, setLoading] = useState(false);
  const [workshop, setWorkshop] = useState<SharedWorkshop | null>(currentWorkshop);
  const [workshopTitle, setWorkshopTitle] = useState(editMode ? currentWorkshop?.title || "" : "");
  const [startDate, setStartDate] = useState<Dayjs | null>(editMode ? dayjs(currentWorkshop?.start) : null);
  const [endDate, setEndDate] = useState<Dayjs | null>(editMode ? dayjs(currentWorkshop?.end) : null);
  const [emails, setEmails] = useState<string>("");
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const [instructionsFile, setInstructionsFile] = useState<File | null>(null);
  const [otherFiles, setOtherFiles] = useState<File[] | null>(null);
  const [coverPicture, setCoverPicture] = useState<File | null>(null);
  const [regLink, setRegLink] = useState<string | undefined>(currentWorkshop?.regLink);
  const [regRestrict, setRegRestrict] = useState(false);
  const [invalidEmails, setInvalidEmails] = useState<string>("");

  const resetFormState = () => {
    setWorkshopTitle(editMode ? currentWorkshop?.title || "" : "");
    setStartDate(editMode ? dayjs(currentWorkshop?.start) : null);
    setEndDate(editMode ? dayjs(currentWorkshop?.end) : null);
    setEmails("");
    setEmailFile(null);
    setPresentationFile(null);
    setInstructionsFile(null);
    setOtherFiles(null);
    setCoverPicture(null);
    setRegLink(editMode ? currentWorkshop?.regLink : undefined);
    setRegRestrict(false);
    setInvalidEmails("");
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      setLoading(true);
      event.preventDefault();

      if (!validateForm()) return;

      const start = dayjs(startDate).toISOString();
      const end = dayjs(endDate).toISOString();

      const workshopId = await handleWorkshopSave(start, end);
      if (!workshopId) return;

      const errors: string[] = [];
      await Promise.all([
        handleUserUploads(workshopId, errors),
        handleCoverUpload(workshopId, errors),
        handleFileUploads(workshopId, errors)
      ]);

      actions.fetchAllWorkshops();
      showFinalStatus(errors);
    } catch (err) {
      displayServerError(
        err,
        ErrorCodes.ADMIN_CREATE_WORKSHOP_FAILED,
        ErrorCodes[ErrorCodes.ADMIN_CREATE_WORKSHOP_FAILED]
      );
    } finally {
      setLoading(false);
    }
  };

  function validateForm(): boolean {
    if (!workshopTitle || !startDate || !endDate) {
      actions.pushError(ErrorCodes.INVALID_FORM);
      return false;
    }
    if (!startDate.isBefore(endDate)) {
      actions.pushError(ErrorCodes.ADMIN_WORKSHOP_START_AFTER_END);
      return false;
    }
    return true;
  }

  async function handleWorkshopSave(start: string, end: string): Promise<number | null> {
    if (!editMode) {
      const id = await actions.adminCreateWorkshop(workshopTitle, start, end, regRestrict, state.user.uuid, regLink);
      if (!id) actions.pushError(ErrorCodes.ADMIN_CREATE_WORKSHOP_FAILED);
      return id || null;
    }

    if (!workshop) {
      actions.pushError(ErrorCodes.ADMIN_WORKSHOP_NOT_FOUND);
      return null;
    }

    if (new Date(workshop.end) <= new Date()) {
      actions.pushError(ErrorCodes.ADMIN_WORKSHOP_ENDED);
      return null;
    }

    const updatedFields = getUpdatedFields(start, end);
    if (Object.keys(updatedFields).length > 1) {
      const newWorkshop = await actions.adminEditWorkshop(updatedFields);
      if (!newWorkshop) {
        actions.pushError(ErrorCodes.ADMIN_WORKSHOP_EDIT_FAILED);
        return null;
      }
      setWorkshop(newWorkshop);
    }

    if (
      Object.keys(updatedFields).length === 1 &&
      !emailFile &&
      !emails &&
      !presentationFile &&
      !instructionsFile &&
      !otherFiles &&
      !coverPicture &&
      regRestrict === currentWorkshop?.regRestrict
    ) {
      actions.pushSnackbar("No changes made.", "info");
      return null;
    }

    return workshop.workshopId;
  }

  function getUpdatedFields(start: string, end: string): Partial<SharedWorkshop> {
    const { title: oldTitle, start: oldStart, end: oldEnd } = workshop!;
    const updated: Partial<SharedWorkshop> = { workshopId: workshop!.workshopId };
    if (oldTitle !== workshopTitle) updated.title = workshopTitle;
    if (oldStart !== start) updated.start = start;
    if (oldEnd !== end) updated.end = end;
    if (regLink && regLink !== currentWorkshop?.regLink) updated.regLink = regLink;
    return updated;
  }

  async function handleUserUploads(workshopId: number, errors: string[]) {
    if (!emailFile && !emails) return;
    const form = new FormData();
    if (emails) form.append("emails", emails);
    if (emailFile) form.append("file", emailFile);
    form.append("workshopId", workshopId.toString());

    const response = await actions.adminAddUsersToWorkshop(form);
    if (!response.success) {
      errors.push("Users could not be added.");
      setInvalidEmails(response.invalidEmails);
    }
  }

  async function handleFileUploads(workshopId: number, errors: string[]) {
    if (!presentationFile && !instructionsFile && (!otherFiles || otherFiles.length === 0)) return;
    const response = await actions.adminAddFilesToWorkshop(workshopId, presentationFile, instructionsFile, otherFiles);
    if (!response) errors.push("Some or all files could not be uploaded.");
  }

  async function handleCoverUpload(workshopId: number, errors: string[]) {
    if (!coverPicture) return;
    const response = await actions.adminAddCoverPicToWorkshop(workshopId, coverPicture);
    if (!response) errors.push("Cover picture could not be uploaded.");
  }

  function showFinalStatus(errors: string[]) {
    if (errors.length > 0) {
      actions.pushSnackbar(errors.join("\n"), "warning");
    } else {
      const successMessage = editMode ? "Workshop edited successfully." : "Workshop created successfully.";
      actions.removeAllErrors();
      actions.pushSnackbar(successMessage, "success");
      onClose();
    }
  }

  const handleValidatedFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    acceptedExtensions: string[],
    acceptedMimeTypes: string[],
    errorCode: ErrorCodes,
    setter: (file: File) => void
  ) => {
    const file = event.target.files![0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    if (!ext || !acceptedExtensions.includes(ext) || !acceptedMimeTypes.includes(file.type)) {
      actions.pushError(errorCode);
      return;
    }
    setter(file);
  };

  const handleEmailFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleValidatedFileUpload(
      event,
      ["xls", "xlsx"],
      ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ErrorCodes.UNRECOGNIZED_EXCEL_FILE,
      (file) => setEmailFile(file)
    );
  };

  const handlePresentationFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleValidatedFileUpload(event, ["pdf"], ["application/pdf"], ErrorCodes.UNRECOGNIZED_PDF_FILE, (file) =>
      setPresentationFile(file)
    );
  };

  const handleInstructionsFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleValidatedFileUpload(event, ["pdf"], ["application/pdf"], ErrorCodes.UNRECOGNIZED_PDF_FILE, (file) =>
      setInstructionsFile(file)
    );
  };

  const handleOtherFilesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) {
      return;
    }

    const filesArray = Array.from(uploadedFiles);

    setOtherFiles((prevFiles) => {
      const fileMap = new Map<string, File>();
      let duplicated = false;

      prevFiles?.forEach((file) => fileMap.set(file.name, file));

      filesArray.forEach((file) => {
        if (fileMap.has(file.name)) {
          duplicated = true;
        }
        fileMap.set(file.name, file);
      });

      if (duplicated) {
        actions.pushSnackbar("Duplicate file detected. The newest uploaded versions have been kept.", "warning");
      }

      return Array.from(fileMap.values());
    });
  };

  const handleCoverPictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedCoverPicture = event.target.files![0];
    if (!uploadedCoverPicture) {
      return;
    }
    const ext = uploadedCoverPicture.name.split(".").pop();
    if (!uploadedCoverPicture.type.startsWith("image/") || !ext || !/^(jpg|jpeg|png)$/.test(ext)) {
      actions.pushError(ErrorCodes.UNRECOGNIZED_IMAGE_FILE);
      return;
    }
    setCoverPicture(uploadedCoverPicture);
  };

  return {
    state: {
      loading,
      workshop,
      workshopTitle,
      startDate,
      endDate,
      emails,
      emailFile,
      presentationFile,
      instructionsFile,
      otherFiles,
      coverPicture,
      regLink,
      regRestrict,
      invalidEmails
    },
    setters: {
      setWorkshopTitle,
      setStartDate,
      setEndDate,
      setEmails,
      setRegLink,
      setRegRestrict,
      setInvalidEmails,
      resetFormState
    },
    handlers: {
      handleFormSubmit,
      handleEmailFileUpload,
      handlePresentationFileUpload,
      handleInstructionsFileUpload,
      handleOtherFilesUpload,
      handleCoverPictureUpload
    }
  };
};
