import { DatapackMetadata } from "@tsconline/shared";
import { Dayjs } from "dayjs";
import { useContext, useState } from "react";
import { context } from "../../state";
import { Reference } from "../../types";
import { ErrorCodes } from "../../util/error-codes";
import { PickerChangeHandlerContext, DateValidationError } from "@mui/x-date-pickers";

type DatapackUploadFormProps = {
  upload: (file: File, metadata: DatapackMetadata) => Promise<void>;
};
const useDatapackUploadForm = (props: DatapackUploadFormProps) => {
  const { upload } = props;
  const { state, actions } = useContext(context);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [currentId, setCurrentId] = useState(0);
  const [authoredBy, setAuthoredBy] = useState(state.user.username);
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [date, setDate] = useState<Dayjs | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const metadata = {
    file: file?.name || "",
    description,
    title,
    authoredBy,
    references: references.map((reference) => reference.reference),
    tags,
    size: "0", // placeholder, this will get set after the file is uploaded
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
    if (dateError) {
      return;
    }
    if (!file) {
      actions.pushError(ErrorCodes.NO_DATAPACK_FILE_FOUND);
      return;
    }
    if (state.datapackIndex[file.name]) {
      actions.pushError(ErrorCodes.DATAPACK_ALREADY_EXISTS);
      return;
    }
    actions.removeAllErrors();
    upload(file, metadata);
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
    if (!file) {
      return;
    }
    if (file.name.length > 50) {
      actions.pushError(ErrorCodes.DATAPACK_FILE_NAME_TOO_LONG);
      return;
    }
    const ext = file.name.split(".").pop();
    // either an unencoded file (text file) or an encoded file that we have no type for
    if (file.type !== "text/plain" && file.type !== "") {
      actions.pushError(ErrorCodes.UNRECOGNIZED_DATAPACK_FILE);
      return;
    }
    if (!ext || !/^(dpk|mdpk|txt|map)$/.test(ext)) {
      actions.pushError(ErrorCodes.UNRECOGNIZED_DATAPACK_EXTENSION);
      return;
    }
    if (state.datapackIndex[file.name]) {
      actions.pushError(ErrorCodes.DATAPACK_ALREADY_EXISTS);
      return;
    }
    actions.removeAllErrors();
    setFile(file);
  };
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAuthoredBy(state.user.username);
    setNotes("");
    setContact("");
    setTags([]);
    setReferences([]);
    setDate(null);
    setFile(null);
  };
  return {
    state: { title, description, authoredBy, notes, contact, tags, references, date, dateError, file },
    setters: {
      setTitle,
      setDescription,
      setAuthoredBy,
      setNotes,
      setContact,
      setTags,
      setReferences,
      setDate,
      setFile
    },
    handlers: { resetForm, handleFileUpload, handleSubmit, addReference, changeReference, handleDateChange }
  };
};

export default useDatapackUploadForm;
