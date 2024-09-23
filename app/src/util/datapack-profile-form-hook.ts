import { DateValidationError, PickerChangeHandlerContext } from "@mui/x-date-pickers";
import { DatapackMetadata } from "@tsconline/shared";
import { Dayjs } from "dayjs";
import { useState } from "react";
export type ChangeAbleDatapackMetadata = Omit<DatapackMetadata, "originalFileName" | "storedFileName" | "size">;

export const useDatapackProfileForm = (datapack: DatapackMetadata) => {
  const [datapackMetadata, setDatapackMetadata] = useState<ChangeAbleDatapackMetadata>({
    ...datapack
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const updateDatapackMetadata = (newMetadata: ChangeAbleDatapackMetadata) => {
    setDatapackMetadata(newMetadata);
    setUnsavedChanges(true);
  };
  const resetDatapackMetadata = () => {
    setDatapackMetadata(datapack);
    setUnsavedChanges(false);
  };
  const handleDateChange = (date: Dayjs | null, context: PickerChangeHandlerContext<DateValidationError>) => {
    if (context.validationError) {
      setDateError("Invalid Date");
    } else {
      setDateError(null);
      setDatapackMetadata({ ...datapackMetadata, date: date?.format("YYYY-MM-DD") });
    }
  };
  return {
    state: {
      unsavedChanges,
      datapackMetadata,
      dateError
    },
    setters: {
      updateDatapackMetadata
    },
    handlers: {
      resetDatapackMetadata,
      handleDateChange
    }
  };
};
