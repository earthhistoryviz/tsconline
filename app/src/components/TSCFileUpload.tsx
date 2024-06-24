import { Button, styled } from "@mui/material";
import { ChangeEventHandler, ReactElement } from "react";
import { TSCButton } from "./TSCButton";
const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1
});
type InputFileUploadProps = {
  startIcon?: ReactElement<object>;
  text: string;
  variant?: "text" | "outlined" | "contained";
  onChange: ChangeEventHandler<HTMLInputElement>;
  multiple?: boolean;
};
export const InputFileUpload: React.FC<InputFileUploadProps> = ({
  startIcon,
  text,
  variant = "text",
  onChange,
  multiple = false
}) => {
  return (
    <TSCButton component="label" variant={variant} startIcon={startIcon} onClick={resetHandler} sx={{ bgcolor: "button.main"}}>
      {text}
      <VisuallyHiddenInput type="file" multiple={multiple} onChange={onChange} />
    </TSCButton>
  );
};

/**
 * reset the input value so we can upload the same file again
 * @param event
 */
function resetHandler(event: React.MouseEvent<HTMLButtonElement>) {
  const input = event.currentTarget.querySelector("input");
  if (input) {
    input.value = "";
  }
}
