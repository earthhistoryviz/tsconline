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
  DatapackConfigForChartRequest,
  DatapackWarning,
  MAX_AUTHORED_BY_LENGTH,
  MAX_DATAPACK_DESC_LENGTH,
  MAX_DATAPACK_NOTES_LENGTH,
  MAX_DATAPACK_CONTACT_LENGTH,
  MAX_DATAPACK_TAGS_ALLOWED,
  MAX_DATAPACK_TAG_LENGTH,
  MAX_DATAPACK_TITLE_LENGTH,
  isUserDatapack,
  isDatapackTypeString
} from "@tsconline/shared";
import { ResponsivePie } from "@nivo/pie";
import { useTranslation } from "react-i18next";
import CreateIcon from "@mui/icons-material/Create";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { ErrorCodes, ErrorMessages } from "./util/error-codes";
import {
  doesDatapackAlreadyExist,
  getDatapackProfileImageUrl,
  getNavigationRouteForDatapackProfile,
  hasLeadingTrailingWhiteSpace
} from "./state/non-action-util";
import { Public, FileUpload, Lock } from "@mui/icons-material";
import { checkDatapackValidity, displayServerError } from "./state/actions/util-actions";
import { TSCDialogLoader } from "./components/TSCDialogLoader";

const SetDatapackContext = createContext<(datapack: Datapack) => void>(() => {});

export const DatapackProfile = observer(() => {
  const { state, actions } = useContext(context);
  const { id } = useParams();
  const query = new URLSearchParams(useLocation().search);
  const queryType = query.get("type");
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [datapack, setDatapack] = useState<Datapack | undefined>(
    state.datapacks.find((d) => d.title === id && d.type === queryType)
  );
  const [loading, setLoading] = useState(!datapack);
  // we need this because if a user refreshes the page, the metadata will be reset and we also
  // don't want to reset the metadata every time the datapack changes (file uploads shouldn't reset the metadata)
  const [isMetadataInitialized, setIsMetadataInitialized] = useState(false);
  const fetchDatapack = async () => {
    if (!id) return;
    if (!queryType || !isDatapackTypeString(queryType)) return;
    if (!datapack) {
      return await actions.fetchDatapack(queryType, id, true);
    }
  };
  const intializeDatapack = async () => {
    if (!datapack) {
      const fetchedDatapack = await fetchDatapack();
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
    setLoading(false);
  };
  useEffect(() => {
    intializeDatapack().catch((e) => {
      console.error("Error fetching datapack", e);
      displayServerError(e, ErrorCodes.UNABLE_TO_FETCH_DATAPACKS, ErrorMessages[ErrorCodes.UNABLE_TO_FETCH_DATAPACKS]);
    });
  }, [queryType, id, isMetadataInitialized, datapack]);
  useEffect(() => {
    return () => {
      actions.setDatapackProfilePageEditMode(false);
    };
  }, []);
  if (loading) return <TSCDialogLoader headerText="Fetching Datapack" open={true} />;
  if (!datapack || !id) return <PageNotFound />;
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
        <IconButton className={styles.back} onClick={() => navigate("/settings")}>
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
        <DatapackImage id={datapack.title} image={image} />
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
        storedFileName: ""
      } as DatapackConfigForChartRequest;
      if (
        state.datapackProfilePage.editableDatapackMetadata.title !== datapack.title &&
        doesDatapackAlreadyExist(tempDatapackConfig, state.datapacks)
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
          getNavigationRouteForDatapackProfile(state.datapackProfilePage.editableDatapackMetadata.title, queryType!)
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
  id: string;
};
const DatapackImage: React.FC<DatapackImageProps> = observer(({ id, image }) => {
  const { state, actions } = useContext(context);
  const profileImageRef = useRef<HTMLInputElement>(null);
  const handleDatapackImageChange = async () => {
    if (profileImageRef.current && profileImageRef.current.files && profileImageRef.current.files[0]) {
      const file = profileImageRef.current.files[0];
      await actions.replaceUserProfileImageFile(id, file);
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
  return (
    <Box className={styles.about} bgcolor="secondaryBackground.main">
      <div className={styles.ah}>
        {isUserDatapack(datapack) && datapack.uuid === state.user.uuid && (
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
          <PublicField isPublic={datapack.isPublic} />
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Total Columns</Typography>
          <Typography>{datapack.totalColumns}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Name</Typography>
          <DatapackFile id={datapack.title} fileName={datapack.originalFileName} />
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Size</Typography>
          <Typography>{datapack.size}</Typography>
        </div>
        <div className={styles.ai}>
          <Tags tags={datapack.tags} />
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
};
const PublicField: React.FC<PublicFieldProps> = observer(({ isPublic }) => {
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
        <Box className={styles.privacyContainer}>
          <PrivateComp />
          <TSCSwitch
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
  id: string;
};
const DatapackFile: React.FC<DatapackFileProps> = observer(({ id, fileName }) => {
  const { state, actions } = useContext(context);
  const setDatapack = useContext(SetDatapackContext);
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !checkDatapackValidity(file)) return;
    const datapack = await actions.replaceUserDatapackFile(id, file);
    if (datapack) setDatapack(datapack);
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
