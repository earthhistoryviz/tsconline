import { observer } from "mobx-react-lite";
import { useLocation, useNavigate, useParams, useBlocker } from "react-router";
import styles from "./DatapackProfile.module.css";
import React, { ChangeEvent, useContext, useEffect, useRef, useState, createContext } from "react";
import { context } from "./state";
import {
  Autocomplete,
  Avatar,
  Badge,
  Box,
  Button,
  IconButton,
  SvgIcon,
  TextField,
  Typography,
  useTheme
} from "@mui/material";
import { CustomDivider, InputFileUpload, TSCButton, TSCSwitch, TagButton } from "./components";
import { CustomTabs } from "./components/TSCCustomTabs";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Discussion } from "./components/TSCDiscussion";
import CampaignIcon from "@mui/icons-material/Campaign";
import { PageNotFound } from "./PageNotFound";
import {
  Datapack,
  DatapackWarning,
  MAX_AUTHORED_BY_LENGTH,
  MAX_DATAPACK_DESC_LENGTH,
  MAX_DATAPACK_NOTES_LENGTH,
  MAX_DATAPACK_CONTACT_LENGTH,
  MAX_DATAPACK_TAGS_ALLOWED,
  MAX_DATAPACK_TAG_LENGTH,
  MAX_DATAPACK_TITLE_LENGTH,
  isWorkshopDatapack,
  DatapackUniqueIdentifier,
  isDatapackTypeString,
  isUserDatapack,
  isOfficialDatapack,
  checkUserAllowedDownloadDatapack,
  getUUIDOfDatapackType
} from "@tsconline/shared";
import { ResponsivePie } from "@nivo/pie";
import { useTranslation } from "react-i18next";
import CreateIcon from "@mui/icons-material/Create";
import DeleteIcon from "@mui/icons-material/Delete";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import {
  canEditDatapack,
  doesMetadataAlreadyExist,
  getDatapackFromArray,
  getDatapackProfileImageUrl,
  getDatapackUUID,
  getMetadataFromArray,
  getNavigationRouteForDatapackProfile,
  hasLeadingTrailingWhiteSpace,
  isMetadataLoading,
  isOwnedByUser
} from "./state/non-action-util";
import { Public, FileUpload, Lock } from "@mui/icons-material";
import { checkDatapackValidity, displayServerError } from "./state/actions/util-actions";
import { TSCDialogLoader } from "./components/TSCDialogLoader";
import { loadRecaptcha, removeRecaptcha } from "./util";

const SetDatapackContext = createContext<(datapack: Datapack) => void>(() => {});

export const DatapackProfile = observer(() => {
  const { state, actions } = useContext(context);
  const { id } = useParams();
  const query = new URLSearchParams(useLocation().search);
  const queryType = query.get("type");
  const uuid = query.get("uuid");
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const areParamsValid = !!id && isDatapackTypeString(queryType) && !!uuid;
  const [datapack, setDatapack] = useState<Datapack | null>(
    areParamsValid ? getDatapackFromArray({ title: id, type: queryType, uuid }, state.datapacks) : null
  );
  const metadata = areParamsValid
    ? getMetadataFromArray({ title: id, type: queryType, uuid }, state.datapackMetadata)
    : null;
  const [loading, setLoading] = useState(!datapack);
  // we need this because if a user refreshes the page, the metadata will be reset and we also
  // don't want to reset the metadata every time the datapack changes (file uploads shouldn't reset the metadata)
  const [isMetadataInitialized, setIsMetadataInitialized] = useState(false);
  const shouldLoadRecaptcha =
    !!metadata &&
    ((isUserDatapack(metadata) && state.user.uuid && isOwnedByUser(metadata, state.user.uuid)) ||
      isWorkshopDatapack(metadata) ||
      (state.user.isAdmin && isOfficialDatapack(metadata)) ||
      (metadata.isPublic && metadata.hasFiles));
  const initializeDatapack = async (controller: AbortController) => {
    if (!areParamsValid || !metadata) return;
    if (!datapack) {
      const fetchedDatapack = await actions.fetchDatapack(metadata, { signal: controller.signal });
      if (fetchedDatapack) {
        actions.resetEditableDatapackMetadata(fetchedDatapack);
        actions.addDatapack(fetchedDatapack);
        setIsMetadataInitialized(true);
        setDatapack(fetchedDatapack);
      }
    } else if (!isMetadataInitialized) {
      actions.resetEditableDatapackMetadata(datapack);
      setIsMetadataInitialized(true);
    }
  };
  const metadataLoading = isMetadataLoading(state.skeletonStates);
  const initializePage = async (controller: AbortController) => {
    if (!datapack && metadataLoading) {
      setLoading(true);
      return;
    }
    try {
      if (shouldLoadRecaptcha) {
        await loadRecaptcha();
      }
      await initializeDatapack(controller);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    initializePage(controller).catch((e) => {
      console.error("Error fetching datapack", e);
      displayServerError(e, ErrorCodes.UNABLE_TO_FETCH_DATAPACKS, ErrorMessages[ErrorCodes.UNABLE_TO_FETCH_DATAPACKS]);
    });
    return () => {
      if (shouldLoadRecaptcha) {
        removeRecaptcha();
      }
      // if the user navigates away from the page quickly, the recaptcha script will be removed but the fetch will still be in progress causing an error as well as a zombie fetch request so we need to abort the fetch request
      // a second issue is that due to strict mode the initial fetch will be aborted because React will call the cleanup before fetching is done causing the page to flicker to the 404 page for a split second
      // the second fetch in the second useEffect will be successful and the page will render correctly
      // this is not an issue in prod since strict mode is disabled
      if (import.meta.env.PROD) {
        // if we're in prod, we do want to abort to prevent errors and zombie fetch requests
        // but if we're in dev, skip aborting so we don’t see that flicker, will see occasional recaptcha errors
        controller.abort();
      }
    };
  }, [queryType, id, isMetadataInitialized, metadataLoading]);
  useEffect(() => {
    return () => {
      actions.setDatapackProfilePageEditMode(false);
      actions.setDatapackProfileComments([]);
    };
  }, []);

  if (loading) return <TSCDialogLoader open={true} transparentBackground />;
  if (!datapack || !areParamsValid) return <PageNotFound />;
  const image = getDatapackProfileImageUrl(datapack);
  const tabs = [
    {
      id: "About",
      tab: "About"
    },
    {
      id: "View Data",
      tab: "View Data"
    },
    {
      id: "Discussion",
      tab: "Discussion"
    },
    {
      id: "Warnings",
      tab: <WarningsTab count={datapack?.warnings ? datapack.warnings.length : 0} />
    }
  ];
  const Content: React.FC = observer(() => (
    <SetDatapackContext.Provider value={setDatapack}>
      <TSCDialogLoader open={state.datapackProfilePage.editRequestInProgress} transparentBackground />
      <div className={styles.header}>
        <IconButton className={styles.back} onClick={() => navigate(-1)}>
          <ArrowBackIcon className={styles.icon} />
        </IconButton>
        {state.datapackProfilePage.editMode ? (
          <TextField
            value={state.datapackProfilePage.editableDatapackMetadata?.title}
            required
            fullWidth
            size="medium"
            multiline
            maxRows={2}
            inputProps={{ maxLength: MAX_DATAPACK_TITLE_LENGTH }}
            sx={{
              "& .MuiInputBase-root": {
                fontSize: "1.7rem",
                fontWeight: 600
              }
            }}
            onChange={(e) => actions.updateEditableDatapackMetadata({ title: e.target.value })}
          />
        ) : (
          <Typography className={styles.ht}>{datapack.title}</Typography>
        )}
        <DatapackImage datapack={datapack} image={image} />
      </div>
      <CustomTabs className={styles.tabs} centered value={tabIndex} onChange={(val) => setTabIndex(val)} tabs={tabs} />
      <CustomDivider className={styles.divider} />
      <DatapackProfileContent index={tabIndex} datapack={datapack} />
    </SetDatapackContext.Provider>
  ));
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      actions.pushError(ErrorCodes.INVALID_FORM);
      return;
    }
    if (hasLeadingTrailingWhiteSpace(state.datapackProfilePage.editableDatapackMetadata?.title || "")) {
      actions.pushError(ErrorCodes.DATAPACK_TITLE_LEADING_TRAILING_WHITESPACE);
      return;
    }
    if (state.datapackProfilePage.editableDatapackMetadata) {
      // types are really odd so I have decided to cast here, any other opinions are welcome
      const tempDatapackConfig = {
        ...state.datapackProfilePage.editableDatapackMetadata,
        ...(isUserDatapack(metadata) || isWorkshopDatapack(metadata) ? { uuid: metadata.uuid } : {})
      } as DatapackUniqueIdentifier;
      if (
        state.datapackProfilePage.editableDatapackMetadata.title !== datapack.title &&
        doesMetadataAlreadyExist(tempDatapackConfig, state.datapackMetadata)
      ) {
        actions.pushError(ErrorCodes.DATAPACK_ALREADY_EXISTS);
        return;
      }
      const editedDatapack = await actions.handleDatapackEdit(
        datapack,
        state.datapackProfilePage.editableDatapackMetadata
      );
      if (editedDatapack) {
        setDatapack(editedDatapack);
        actions.setDatapackProfilePageEditMode(false);
      }
      // if the title has changed, navigate to the new title
      if (editedDatapack && state.datapackProfilePage.editableDatapackMetadata.title !== datapack.title && queryType) {
        navigate(
          getNavigationRouteForDatapackProfile(
            getDatapackUUID(datapack),
            state.datapackProfilePage.editableDatapackMetadata.title,
            queryType!
          ),
          { replace: true }
        );
      }
    }
  };
  return (
    <div className={styles.adjcontainer}>
      <div className={styles.container}>
        {/* Conditionally render in a form to handle edit submissions */}
        {state.datapackProfilePage.editMode ? (
          <form onSubmit={handleSubmit} className={styles.formContainer}>
            <Content />
          </form>
        ) : (
          <Content />
        )}
      </div>
    </div>
  );
});

type DatapackImageProps = {
  image: string;
  datapack: DatapackUniqueIdentifier;
};
const DatapackImage: React.FC<DatapackImageProps> = observer(({ datapack, image }) => {
  const { state, actions } = useContext(context);
  const profileImageRef = useRef<HTMLInputElement>(null);
  const handleDatapackImageChange = async () => {
    if (profileImageRef.current && profileImageRef.current.files && profileImageRef.current.files[0]) {
      const file = profileImageRef.current.files[0];
      await actions.replaceProfileImageFile(datapack, file);
    }
  };
  // add a query parameter to the image to force a refresh when the image is updated (@PAOLO IF ANY OTHER WAY TO DO THIS IS KNOWN PLEASE LET ME KNOW)
  const imageUrl = `${image}?ver=${state.datapackProfilePage.datapackImageVersion}`;
  return (
    <>
      {state.datapackProfilePage.editMode ? (
        <Box className={styles.editableDatapackImage}>
          <Badge
            overlap="rectangular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={
              <Avatar className={styles.profilePencilEdit} sx={{ backgroundColor: "button.main" }}>
                <FileUpload fontSize="small" />
              </Avatar>
            }
            onClick={() => {
              if (profileImageRef.current) profileImageRef.current.click();
            }}>
            <img src={imageUrl} className={styles.di} />
          </Badge>
          <input
            type="file"
            accept=".png, .jpg, .jpeg"
            ref={profileImageRef}
            style={{ display: "none" }}
            onChange={handleDatapackImageChange}
          />
        </Box>
      ) : (
        <img className={styles.di} src={imageUrl} />
      )}
    </>
  );
});

type WarningTabProps = {
  count: number;
};
const WarningsTab: React.FC<WarningTabProps> = ({ count }) => {
  const { t } = useTranslation();
  return (
    <div className={styles.wtc}>
      {t("settingsTabs.Warnings")}
      {count > 0 && <span className={styles.number}>{`${count > 99 ? `99+` : count}`}</span>}
    </div>
  );
};

type DatapackProfileContentProps = {
  index: number;
  datapack: Datapack;
};
const DatapackProfileContent: React.FC<DatapackProfileContentProps> = ({ index, datapack }) => {
  switch (index) {
    case 0:
      return <About datapack={datapack} />;
    case 1:
      return <ViewData datapack={datapack} />;
    case 2:
      return <Discussion />;
    case 3:
      return (
        datapack.warnings &&
        datapack.warnings.length > 0 &&
        datapack.warnings.map((warning, index) => (
          <DatapackWarningAlert
            key={warning.lineNumber + warning.warning + warning.message + index}
            warning={warning}
          />
        ))
      );
    default:
      return <About datapack={datapack} />;
  }
};
type AboutProps = {
  datapack: Datapack;
};
const About: React.FC<AboutProps> = observer(({ datapack }) => {
  const { state, actions } = useContext(context);
  const { t } = useTranslation();
  const [originalFileNames, setOriginalFileNames] = useState<string[]>([]);
  // TODO used to prevent a warning with the useBlocker hook (will need to revisit later to see whether this is still necessary)
  const isMountedRef = useRef<boolean>();
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  // for when user tries to navigate away with unsaved changes
  useBlocker(({ currentLocation, nextLocation }) => {
    return (
      isMountedRef &&
      state.datapackProfilePage.unsavedChanges &&
      currentLocation.pathname !== nextLocation.pathname &&
      !window.confirm(t("dialogs.confirm-changes.message"))
    );
  });
  // for when user tries to leave page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (state.datapackProfilePage.unsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [state.datapackProfilePage.unsavedChanges]);

  // fetch the original attached file names for the datapack
  useEffect(() => {
    const fetchFileNames = async () => {
      if (datapack) {
        const names = await actions.fetchDatapackFileNames(datapack.title, getUUIDOfDatapackType(datapack));
        setOriginalFileNames(names ? names : []);
      }
    };
    fetchFileNames();
  }, [datapack]);

  function downloadDatapackFiles() {
    if (checkUserAllowedDownloadDatapack(state.user, datapack)) {
      actions.fetchDatapackFiles(datapack.title, getUUIDOfDatapackType(datapack), datapack.isPublic);
    } else {
      actions.pushSnackbar("You are not allowed to download this datapack's pdfs.", "warning");
    }
  }

  return (
    <Box className={styles.about} bgcolor="secondaryBackground.main">
      <div className={styles.ah}>
        {canEditDatapack(datapack, state.user) && (
          <EditButtons
            unsavedChanges={state.datapackProfilePage.unsavedChanges}
            resetForm={() => actions.resetEditableDatapackMetadata(datapack)}
          />
        )}
        <div className={styles.ai}>
          <AuthoredBy authoredBy={datapack.authoredBy} />
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Created</Typography>
          <DateField datapackDate={datapack.date} />
        </div>
        <div className={styles.ai}>
          <PublicField isPublic={datapack.isPublic} disabled={isWorkshopDatapack(datapack)} />
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Total Columns</Typography>
          <Typography>{datapack.totalColumns}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Name</Typography>
          <DatapackFile datapack={datapack} fileName={datapack.originalFileName} />
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Size</Typography>
          <Typography>{datapack.size}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>{t("settings.datapacks.attached-files")}</Typography>
          <AttachedFiles datapack={datapack} fileNames={originalFileNames} setFileNames={setOriginalFileNames} />
        </div>
        <div className={styles.ai}>
          <Tags tags={datapack.tags} />
        </div>
        <div className={styles.ai}>
          {datapack.hasFiles && (
            <TSCButton
              variant="contained"
              color="primary"
              sx={{ marginTop: 2 }}
              onClick={() => downloadDatapackFiles()}>
              {t("workshops.details-page.download-button")}
            </TSCButton>
          )}
        </div>
      </div>
      <div className={styles.additional}>
        <Typography className={styles.dt}>Description</Typography>
        <Description description={datapack.description} />
        <Notes notes={datapack.notes} />
        <Contact contact={datapack.contact} />
      </div>
    </Box>
  );
});
type PublicFieldProps = {
  isPublic: boolean;
  disabled: boolean;
};
const PublicField: React.FC<PublicFieldProps> = observer(({ isPublic, disabled }) => {
  const { state, actions } = useContext(context);
  const PrivateComp = () => (
    <>
      <Lock className={styles.privacyIcon} />
      <Typography>{"Private"}</Typography>
    </>
  );
  const PublicComp = () => (
    <>
      <Public className={styles.privacyIcon} />
      <Typography>{"Public"}</Typography>
    </>
  );
  return (
    <>
      <Typography className={styles.aih}>Privacy</Typography>
      {state.datapackProfilePage.editMode ? (
        <Box
          className={styles.privacyContainer}
          sx={{
            opacity: disabled ? 0.5 : 1
          }}>
          <PrivateComp />
          <TSCSwitch
            disabled={disabled}
            checked={state.datapackProfilePage.editableDatapackMetadata?.isPublic}
            onChange={(e) => {
              actions.updateEditableDatapackMetadata({ isPublic: e.target.checked });
            }}
          />
          <PublicComp />
        </Box>
      ) : (
        <Box className={styles.privacyContainer}>{isPublic ? <PublicComp /> : <PrivateComp />}</Box>
      )}
    </>
  );
});

type DatapackFileProps = {
  fileName: string;
  datapack: DatapackUniqueIdentifier;
};
const DatapackFile: React.FC<DatapackFileProps> = observer(({ datapack, fileName }) => {
  const { state, actions } = useContext(context);
  const setDatapack = useContext(SetDatapackContext);
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !checkDatapackValidity(file)) return;
    const newDatapack = await actions.replaceDatapackFile(datapack, file);
    if (newDatapack) setDatapack(newDatapack);
  };
  return (
    <>
      {state.datapackProfilePage.editMode ? (
        <Box className={styles.changeDatapackFile}>
          <Typography className={styles.fileName}>{fileName}</Typography>
          <InputFileUpload
            startIcon={<FileUpload />}
            text="Change Datapack File"
            onChange={handleFileUpload}
            accept=".dpk, .mdpk, .txt, .zip"
          />
        </Box>
      ) : (
        <Typography className={styles.fileName}>{fileName}</Typography>
      )}
    </>
  );
});

type AttachedFilesProps = {
  datapack: Datapack;
  fileNames: string[];
  setFileNames: React.Dispatch<React.SetStateAction<string[]>>;
};
const AttachedFiles: React.FC<AttachedFilesProps> = observer(({ datapack, fileNames, setFileNames }) => {
  const { state, actions } = useContext(context);
  const setDatapack = useContext(SetDatapackContext);
  const [pdfFiles, setPDFFiles] = useState<File[]>([]);
  const { t } = useTranslation();

  const handlePDFFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles: FileList | null = event.target.files;
    if (!newFiles) {
      return;
    }
    actions.removeAllErrors();
    const fileMap = new Map<string, File>();

    [...pdfFiles, ...Array.from(newFiles)].forEach((file) => {
      fileMap.set(file.name, file); // later files overwrite earlier ones
    });

    const uniqueFiles = Array.from(fileMap.values());
    setPDFFiles(uniqueFiles);

    const newFileNames = uniqueFiles.map((file) => file.name);

    await actions.addAttachedDatapackFiles(
      datapack.title,
      getUUIDOfDatapackType(datapack),
      datapack.isPublic,
      uniqueFiles
    );
    // only add new file names that are not already in the list
    setFileNames((prevFileNames) => [
      ...prevFileNames,
      ...newFileNames.filter((name) => !prevFileNames.includes(name))
    ]);
  };

  const handleDeleteFile = async (fileName: string) => {
    setFileNames(fileNames.filter((name) => name !== fileName));
    try {
      const numFilesRemaining = await actions.deleteAttachedDatapackFile(
        datapack.title,
        getUUIDOfDatapackType(datapack),
        fileName
      );
      // if there are no files remaining, set the hasFiles to false
      if (numFilesRemaining === 0) {
        setDatapack({ ...datapack, hasFiles: false });
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  return (
    <>
      {state.datapackProfilePage.editMode ? (
        <Box className={styles.changeDatapackFile}>
          {fileNames.length > 0 ? (
            fileNames.map((fileName, index) => (
              <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography className={styles.fileName}>{fileName}</Typography>
                <IconButton onClick={() => handleDeleteFile(fileName)} size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))
          ) : (
            <Typography className={styles.fileName}>{t("settings.datapacks.no-attached-files")}</Typography>
          )}

          <InputFileUpload
            startIcon={<FileUpload />}
            text={t("settings.datapacks.upload-pdf-files")}
            onChange={handlePDFFileUpload}
            accept=".pdf"
            multiple={true}
          />
        </Box>
      ) : fileNames.length > 0 ? (
        fileNames.map((fileName, index) => (
          <Typography key={index} className={styles.fileName}>
            {fileName}
          </Typography>
        ))
      ) : (
        <Typography className={styles.fileName}>{t("settings.datapacks.no-attached-files")}</Typography>
      )}
    </>
  );
});

type TagsProps = {
  tags: string[];
};

const Tags: React.FC<TagsProps> = observer(({ tags }) => {
  const { state, actions } = useContext(context);
  return (
    <>
      <Typography className={styles.aih}>Tags</Typography>
      {state.datapackProfilePage.editMode ? (
        <Autocomplete
          multiple
          value={state.datapackProfilePage.editableDatapackMetadata?.tags}
          onChange={(_, values) => {
            actions.updateEditableDatapackMetadata({ tags: values });
          }}
          fullWidth
          options={[]}
          freeSolo
          limitTags={MAX_DATAPACK_TAGS_ALLOWED}
          renderInput={(params) => (
            <TextField
              {...params}
              inputProps={{ ...params.inputProps, maxLength: MAX_DATAPACK_TAG_LENGTH }}
              placeholder="Add tags"
            />
          )}
        />
      ) : (
        <>
          <div className={styles.tags}>
            {tags[0]
              ? tags.map((tag) => (
                  <TagButton key={tag}>
                    <Typography fontSize="0.9rem">{tag}</Typography>
                  </TagButton>
                ))
              : "No tags"}
          </div>
        </>
      )}
    </>
  );
});

type AuthoredByProps = {
  authoredBy: string;
};
const AuthoredBy: React.FC<AuthoredByProps> = observer(({ authoredBy }) => {
  const { state, actions } = useContext(context);
  return (
    <>
      <Typography className={styles.aih}>Authored By</Typography>
      {state.datapackProfilePage.editMode ? (
        <TextField
          fullWidth
          required
          onChange={(e) => actions.updateEditableDatapackMetadata({ authoredBy: e.target.value })}
          placeholder="Creator of the data pack"
          inputProps={{ maxLength: MAX_AUTHORED_BY_LENGTH }}
          value={state.datapackProfilePage.editableDatapackMetadata?.authoredBy}
        />
      ) : (
        <Typography>{authoredBy}</Typography>
      )}
    </>
  );
});
type DescriptionProps = {
  description: string | undefined;
};
const Description: React.FC<DescriptionProps> = observer(({ description }) => {
  const { state, actions } = useContext(context);
  return (
    <>
      {state.datapackProfilePage.editMode ? (
        <TextField
          value={state.datapackProfilePage.editableDatapackMetadata?.description}
          onChange={(e) => actions.updateEditableDatapackMetadata({ description: e.target.value })}
          fullWidth
          required
          multiline
          placeholder="A brief description of the data"
          inputProps={{ maxLength: MAX_DATAPACK_DESC_LENGTH }}
          minRows={7}
        />
      ) : (
        <Typography className={styles.description}>{description}</Typography>
      )}
    </>
  );
});
type ContactProps = {
  contact: string | undefined;
};
const Contact: React.FC<ContactProps> = observer(({ contact }) => {
  const { state, actions } = useContext(context);
  return (
    <>
      {state.datapackProfilePage.editMode ? (
        <>
          <Typography className={styles.dt}>Contact</Typography>
          <TextField
            value={state.datapackProfilePage.editableDatapackMetadata?.contact}
            onChange={(e) => actions.updateEditableDatapackMetadata({ contact: e.target.value })}
            fullWidth
            multiline
            placeholder="Who can be contacted for more information"
            inputProps={{ maxLength: MAX_DATAPACK_CONTACT_LENGTH }}
            minRows={3}
          />
        </>
      ) : (
        contact && (
          <>
            <Typography className={styles.dt}>Contact</Typography>
            <Typography className={styles.description}>{contact}</Typography>
          </>
        )
      )}
    </>
  );
});
type NotesProps = {
  notes: string | undefined;
};
const Notes: React.FC<NotesProps> = observer(({ notes }) => {
  const { state, actions } = useContext(context);
  return (
    <>
      {state.datapackProfilePage.editMode ? (
        <>
          <Typography className={styles.dt}>Notes</Typography>
          <TextField
            value={state.datapackProfilePage.editableDatapackMetadata?.notes}
            onChange={(e) => actions.updateEditableDatapackMetadata({ notes: e.target.value })}
            fullWidth
            placeholder="Any additional notes for use of generating charts for this datapack"
            multiline
            inputProps={{ maxLength: MAX_DATAPACK_NOTES_LENGTH }}
            minRows={3}
          />
        </>
      ) : (
        notes && (
          <>
            <Typography className={styles.dt}>Notes</Typography>
            <Typography className={styles.description}>{notes}</Typography>
          </>
        )
      )}
    </>
  );
});
type EditButtonsProps = {
  unsavedChanges: boolean;
  resetForm: () => void;
};

const EditButtons: React.FC<EditButtonsProps> = observer(({ unsavedChanges, resetForm }: EditButtonsProps) => {
  const { t } = useTranslation();
  const { state, actions } = useContext(context);
  return (
    <>
      {!state.datapackProfilePage.editMode ? (
        <Box className={styles.pencilIconContainer} onClick={() => actions.setDatapackProfilePageEditMode(true)}>
          <SvgIcon className={styles.pencilIcon}>
            <CreateIcon />
          </SvgIcon>
        </Box>
      ) : (
        <Box className={styles.editButtonContainer}>
          <Button
            variant="outlined"
            sx={{
              borderColor: "error.main",
              color: "error.main",
              ":hover": {
                borderColor: "error.light",
                backgroundColor: "transparent"
              }
            }}
            className={styles.editButton}
            onClick={() => {
              if (!unsavedChanges || window.confirm(t("dialogs.confirm-changes.message"))) {
                actions.setDatapackProfilePageEditMode(false);
                // reset the metadata if the user cancels
                if (unsavedChanges) {
                  resetForm();
                }
              }
            }}>
            Cancel
          </Button>
          <TSCButton className={styles.editButton} type="submit">
            Save
          </TSCButton>
        </Box>
      )}
    </>
  );
});

type DateFieldProps = {
  datapackDate: string | undefined;
};
const DateField: React.FC<DateFieldProps> = observer(({ datapackDate }) => {
  const { state, actions } = useContext(context);
  return state.datapackProfilePage.editMode ? (
    <DatePicker
      value={
        state.datapackProfilePage.editableDatapackMetadata?.date
          ? dayjs(state.datapackProfilePage.editableDatapackMetadata.date)
          : null
      }
      maxDate={dayjs()}
      slotProps={{
        field: {
          clearable: true,
          onClear: () => actions.updateEditableDatapackMetadata({ date: undefined })
        },
        textField: { helperText: null },
        popper: {
          sx: {
            "& .MuiPickersYear-yearButton": {
              fontSize: "1rem"
            },
            "& .MuiPaper-root": {
              backgroundColor: "secondaryBackground.main"
            }
          }
        }
      }}
      onChange={(val) => actions.updateEditableDatapackMetadata({ date: val?.format("YYYY-MM-DD") })}
    />
  ) : (
    <Typography>{datapackDate || "Unknown"}</Typography>
  );
});

type DatapackWarningProps = {
  warning: DatapackWarning;
};
export const DatapackWarningAlert: React.FC<DatapackWarningProps> = ({ warning }) => {
  return (
    <Box className={styles.dwc} bgcolor="secondaryBackground.light">
      <CampaignIcon className={styles.dwi} />
      <Box>
        {warning.lineNumber !== undefined && (
          <Typography fontWeight={600}>{`Warning found on line ${warning.lineNumber}`}</Typography>
        )}
        <Typography>{warning.warning}</Typography>
        {warning.message && <Typography fontStyle="italic">{warning.message}</Typography>}
      </Box>
    </Box>
  );
};

type ViewDataProps = {
  datapack: Datapack;
};

const ViewData: React.FC<ViewDataProps> = observer(({ datapack }) => {
  const theme = useTheme();
  function convertToPieChartData(data: Record<string, number>): { label: string; value: number }[] {
    return Object.keys(data)
      .filter((key) => data[key] !== 0)
      .map((key) => ({
        id: key,
        label: key,
        value: data[key]
      }));
  }
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Box className={styles.vd} bgcolor="secondaryBackground.main">
        <Typography className={styles.dt}>Number of Columns</Typography>
        <ResponsivePie
          data={convertToPieChartData(datapack.columnTypeCount)}
          margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
          innerRadius={0.5}
          padAngle={0.75}
          cornerRadius={2}
          activeOuterRadiusOffset={8}
          borderWidth={1}
          borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
          arcLinkLabelsSkipAngle={1}
          arcLinkLabelsTextColor={theme.palette.text.primary}
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: "color" }}
          arcLabelsSkipAngle={2}
          arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
          theme={{
            tooltip: {
              container: {
                background: "#ffffff",
                color: "#333333"
              }
            }
          }}
        />
      </Box>
    </div>
  );
});
