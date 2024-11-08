import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
  FormControlLabel,
  Badge,
  SvgIcon
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { InputFileUpload } from "../TSCFileUpload";
import "./DatapackUploadForm.css";
import { TSCButton } from "../TSCButton";
import { CustomDivider, StyledScrollbar } from "../TSCComponents";
import {
  DatapackMetadata,
  DatapackType,
  MAX_AUTHORED_BY_LENGTH,
  MAX_DATAPACK_CONTACT_LENGTH,
  MAX_DATAPACK_DESC_LENGTH,
  MAX_DATAPACK_NOTES_LENGTH,
  MAX_DATAPACK_REFERENCE_LENGTH,
  MAX_DATAPACK_TAGS_ALLOWED,
  MAX_DATAPACK_TAG_LENGTH,
  MAX_DATAPACK_TITLE_LENGTH
} from "@tsconline/shared";
import { AddCircleOutline, ExpandMore, Close, DeleteOutline, AddPhotoAlternate } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import useDatapackUploadForm from "./datapack-upload-form-hook";
import { TSCCheckbox } from "../TSCCheckbox";
import { useTranslation } from "react-i18next";

type DatapackUploadFormProps = {
  close: () => void;
  upload: (file: File, metadata: DatapackMetadata) => Promise<void>;
  type: DatapackType;
  workshopId?: number;
  forcePublic?: boolean;
};
export const DatapackUploadForm: React.FC<DatapackUploadFormProps> = ({ close, upload, type, workshopId, forcePublic = false }) => {
  const { state, setters, handlers } = useDatapackUploadForm({ upload, type, workshopId, forcePublic });
  const { t } = useTranslation();
  return (
    <Box margin="20px" justifyContent="center" textAlign="center" maxWidth="70vw">
      <div className="close-upload-form">
        <IconButton className="icon" onClick={close} size="large">
          <Close className="close-icon" />
        </IconButton>
      </div>
      <Typography className="upload-datapack-header" variant="h4">
        {t("settings.datapacks.upload-form.title")}
      </Typography>
      <CustomDivider />
      <form onSubmit={handlers.handleSubmit}>
        <StyledScrollbar className="datapack-upload-form-container">
          <Box display="flex" flexDirection="row" justifyContent="flex-start" gap="100px" margin="10px">
            <UploadProfilePicture
              profileImageRef={state.profileImageRef}
              profileImage={state.profileImage}
              handleProfileImageChange={handlers.handleProfileImageChange}
            />
            <Box className="file-upload">
              <InputFileUpload
                startIcon={<CloudUploadIcon />}
                text={t("settings.datapacks.upload")}
                variant="contained"
                onChange={handlers.handleFileUpload}
                accept=".dpk, .mdpk, .zip, .txt"
              />
              <Typography className="file-upload-text" variant="body2">
                {state.file ? state.file.name : t("settings.datapacks.upload-form.no-file")}
              </Typography>
              {state.file && (
                <IconButton className="icon" onClick={() => setters.setFile(null)}>
                  <DeleteOutline className="close-icon" />
                </IconButton>
              )}
            </Box>
          </Box>
          <Box gap="10px" display="flex">
            <TextField
              label={t("settings.datapacks.upload-form.name")}
              required
              sx={{ flexGrow: 0.5 }}
              placeholder={t("settings.datapacks.upload-form.name-placeholder")}
              InputLabelProps={{ shrink: true }}
              value={state.title}
              inputProps={{
                maxLength: MAX_DATAPACK_TITLE_LENGTH
              }}
              onChange={(event) => setters.setTitle(event.target.value)}
            />
            <TextField
              label={t("settings.datapacks.upload-form.author")}
              sx={{ flexGrow: 1 }}
              placeholder={t("settings.datapacks.upload-form.author-placeholder")}
              required
              InputLabelProps={{ shrink: true }}
              inputProps={{
                maxLength: MAX_AUTHORED_BY_LENGTH
              }}
              value={state.authoredBy}
              onChange={(event) => setters.setAuthoredBy(event.target.value)}
            />
          </Box>
          <TextField
            multiline
            required
            rows={5}
            label={t("settings.datapacks.upload-form.description")}
            placeholder={t("settings.datapacks.upload-form.description-placeholder")}
            inputProps={{ className: "datapack-description-input-text", maxLength: MAX_DATAPACK_DESC_LENGTH }}
            InputLabelProps={{ shrink: true }}
            value={state.description}
            onChange={(event) => setters.setDescription(event.target.value)}
          />
          <Box display="flex" flexDirection="column">
            <DatePicker
              className="datapack-date-picker"
              value={state.date}
              maxDate={dayjs()}
              slotProps={{
                field: { clearable: true, onClear: () => setters.setDate(null) },
                textField: { helperText: state.dateError },
                popper: {
                  className: "datapack-date-picker",
                  sx: {
                    "& .MuiPaper-root": {
                      backgroundColor: "secondaryBackground.main"
                    }
                  }
                }
              }}
              onChange={handlers.handleDateChange}
            />
          </Box>
          <Autocomplete
            multiple
            value={state.tags}
            onChange={(_, value) => setters.setTags(value)}
            options={[]}
            freeSolo
            limitTags={MAX_DATAPACK_TAGS_ALLOWED}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("settings.datapacks.upload-form.tags")}
                inputProps={{ ...params.inputProps, maxLength: MAX_DATAPACK_TAG_LENGTH }}
              />
            )}
          />
          <FormControlLabel
            name="public-datapack"
            control={
              <TSCCheckbox disabled={forcePublic} checked={state.isPublic} onChange={(event) => setters.setIsPublic(event.target.checked)} />
            }
            label={t("settings.datapacks.upload-form.make-public")}
          />
          <Stack spacing={2} flexShrink={0} alignSelf="center" width="100%">
            {state.references.map((reference, index) => (
              <Box key={reference.id} display="flex" alignItems="center">
                <TextField
                  label={`${t("settings.datapacks.upload-form.reference")} ${index + 1}`}
                  variant="outlined"
                  value={reference.reference}
                  onChange={(event) => handlers.changeReference(index, event)}
                  inputProps={{ maxLength: MAX_DATAPACK_REFERENCE_LENGTH }}
                  fullWidth
                />
                <IconButton
                  onClick={() => setters.setReferences(state.references.filter((ref) => ref.id !== reference.id))}>
                  <DeleteOutline />
                </IconButton>
              </Box>
            ))}
          </Stack>
          <Button
            color="icon"
            fullWidth
            className="add-reference-button"
            onClick={handlers.addReference}
            startIcon={<AddCircleOutline className="add-reference-plus-button" />}>
            {t("settings.datapacks.upload-form.button.add-ref")}
          </Button>
          <Accordion className="additional-options-upload-form" disableGutters>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="body2" alignSelf="flex-start">
                {t("settings.datapacks.upload-form.button.more")}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box gap="10px" display="flex">
                <TextField
                  label={t("settings.datapacks.upload-form.contact")}
                  placeholder={t("settings.datapacks.upload-form.contact-placeholder")}
                  sx={{ flexGrow: 0.5 }}
                  helperText={t("settings.datapacks.upload-form.contact-helper-text")}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: MAX_DATAPACK_CONTACT_LENGTH }}
                  value={state.contact}
                  onChange={(event) => setters.setContact(event.target.value)}
                />
                <TextField
                  label={t("settings.datapacks.upload-form.notes")}
                  placeholder={t("settings.datapacks.upload-form.notes-placeholder")}
                  helperText={t("settings.datapacks.upload-form.notes-helper-text")}
                  sx={{ flexGrow: 1 }}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: MAX_DATAPACK_NOTES_LENGTH }}
                  value={state.notes}
                  onChange={(event) => setters.setNotes(event.target.value)}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </StyledScrollbar>
        <Box display="flex" gap="20px" justifyContent="center">
          <TSCButton onClick={handlers.resetForm}>{t("settings.datapacks.upload-form.button.startover")}</TSCButton>
          <TSCButton type="submit">{t("settings.datapacks.upload-form.button.finish")}</TSCButton>
        </Box>
      </form>
    </Box>
  );
};

type UploadProfilePictureProps = {
  profileImageRef: React.RefObject<HTMLInputElement>;
  profileImage: File | null;
  handleProfileImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};
const UploadProfilePicture: React.FC<UploadProfilePictureProps> = ({
  profileImageRef,
  profileImage,
  handleProfileImageChange
}) => {
  return (
    <Box className="datapack-editable-profile-icon-background" sx={{ backgroundColor: "secondaryBackground.dark" }}>
      <Badge
        overlap="rectangular"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        className="editable-datapack-profile-icon-badge"
        onClick={() => {
          if (profileImageRef.current) profileImageRef.current.click();
        }}>
        {profileImage ? (
          <img src={URL.createObjectURL(profileImage)} className="editable-datapack-profile-icon" />
        ) : (
          <SvgIcon className="editable-datapack-empty-icon">
            <AddPhotoAlternate />
          </SvgIcon>
        )}
      </Badge>
      <input
        type="file"
        accept=".png, .jpg, .jpeg"
        ref={profileImageRef}
        style={{ display: "none" }}
        onChange={handleProfileImageChange}
      />
    </Box>
  );
};
