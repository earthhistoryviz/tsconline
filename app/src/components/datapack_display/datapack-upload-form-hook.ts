import { DatapackMetadata, DatapackType } from "@tsconline/shared";
import { Dayjs } from "dayjs";
import { useContext, useRef, useState } from "react";
import { context } from "../../state";
import { Reference, UploadDatapackMethodType } from "../../types";
import { ErrorCodes } from "../../util/error-codes";
import { PickerChangeHandlerContext, DateValidationError } from "@mui/x-date-pickers";
import { getDatapackFromArray, hasLeadingTrailingWhiteSpace } from "../../state/non-action-util";
import { checkDatapackValidity } from "../../state/actions/util-actions";

type DatapackUploadFormProps = {
  upload: UploadDatapackMethodType;
  type: DatapackType;
};
const useDatapackUploadForm = (props: DatapackUploadFormProps) => {
  const { upload, type } = props;
  const { state, actions } = useContext(context);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [currentId, setCurrentId] = useState(0);
  const [authoredBy, setAuthoredBy] = useState(state.user.username);
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [date, setDate] = useState<Dayjs | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [priority, setPriority] = useState(0);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const profileImageRef = useRef<HTMLInputElement>(null);
  const filename = file?.name || "";
  const metadata: DatapackMetadata = {
    storedFileName: "", // don't write storedFileName to the metadata (need this to be set for types)
    originalFileName: filename,
    description,
    title,
    isPublic,
    authoredBy,
    references: references.map((reference) => reference.reference),
    tags,
    priority,
    size: "0", // placeholder, this will get set after the file is uploaded
    ...type,
    ...(contact && { contact }),
    ...(notes && { notes }),
    ...(date && { date: date.format("YYYY-MM-DD") })
  };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      actions.pushError(ErrorCodes.INVALID_FORM);
      return;
    }
    if (hasLeadingTrailingWhiteSpace(title)) {
      actions.pushError(ErrorCodes.DATAPACK_TITLE_LEADING_TRAILING_WHITESPACE);
      return;
    }
    if (dateError) {
      return;
    }
    if (!file) {
      actions.pushError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
      return;
    }
    if (getDatapackFromArray(metadata, state.datapacks)) {
      actions.pushError(ErrorCodes.DATAPACK_ALREADY_EXISTS);
      return;
    }
    actions.removeAllErrors();
    // server datapacks are always public
    // @Paolo: I'm not sure how to generically handle this because I don't want `isPublic` to be in the FileMetadata
    // and I also don't know how to generically pass it into the upload function besides this.
    upload(file, metadata, profileImage || undefined);
  };
  const addReference = () => {
    if (references[0] && references[references.length - 1].reference === "") {
      return;
    }
    setReferences([...references, { id: currentId, reference: "" }]);
    setCurrentId(currentId + 1);
  };
  const changeReference = (index: number, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newReferences = [...references];
    newReferences[index].reference = event.target.value;
    setReferences(newReferences);
  };
  const handleDateChange = (date: Dayjs | null, context: PickerChangeHandlerContext<DateValidationError>) => {
    if (context.validationError) {
      setDateError("Invalid Date");
    } else {
      setDateError(null);
      setDate(date);
    }
  };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0];
    if (!file || !checkDatapackValidity(file)) {
      return;
    }
    actions.removeAllErrors();
    setFile(file);
  };
  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0];
    if (!file) {
      return;
    }
    actions.removeAllErrors();
    setProfileImage(file);
  };
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIsPublic(false);
    setAuthoredBy(state.user.username);
    setNotes("");
    setContact("");
    setTags([]);
    setReferences([]);
    setDate(null);
    setFile(null);
  };
  return {
    state: {
      profileImage,
      title,
      description,
      isPublic,
      authoredBy,
      notes,
      contact,
      tags,
      references,
      date,
      dateError,
      file,
      profileImageRef,
      priority
    },
    setters: {
      setTitle,
      setDescription,
      setIsPublic,
      setAuthoredBy,
      setNotes,
      setContact,
      setTags,
      setReferences,
      setDate,
      setFile,
      setPriority
    },
    handlers: {
      resetForm,
      handleFileUpload,
      handleSubmit,
      addReference,
      changeReference,
      handleDateChange,
      handleProfileImageChange
    }
  };
};

export default useDatapackUploadForm;
