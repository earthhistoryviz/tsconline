import { DatapackMetadata } from "@tsconline/shared";
import { useState } from "react";
type ChangeAbleDatapackMetadata = Omit<DatapackMetadata, "originalFileName" | "storedFileName" | "size">;

export const useDatapackProfileForm = (datapack: DatapackMetadata) => {
  const [datapackMetadata, setDatapackMetadata] = useState<ChangeAbleDatapackMetadata>({
    ...datapack
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const updateDatapackMetadata = (newMetadata: ChangeAbleDatapackMetadata) => {
    setDatapackMetadata(newMetadata);
    setUnsavedChanges(true);
  };
  const resetDatapackMetadata = () => {
    setDatapackMetadata(datapack);
    setUnsavedChanges(false);
  };
  return {
    state: {
      unsavedChanges,
      datapackMetadata
    },
    setters: {
      updateDatapackMetadata
    },
    handlers: {
      resetDatapackMetadata
    }
  };
};
