import { observer } from "mobx-react-lite";
import { useLocation, useNavigate, useParams, useBlocker } from "react-router";
import styles from "./DatapackProfile.module.css";
import { useContext, useEffect, useState } from "react";
import { context } from "./state";
import { devSafeUrl } from "./util";
import { Box, Button, IconButton, SvgIcon, TextField, Typography, useTheme } from "@mui/material";
import { CustomDivider, TSCButton, TagButton } from "./components";
import { CustomTabs } from "./components/TSCCustomTabs";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Discussion } from "./components/TSCDiscussion";
import CampaignIcon from "@mui/icons-material/Campaign";
import { PageNotFound } from "./PageNotFound";
import { BaseDatapackProps, Datapack, DatapackWarning } from "@tsconline/shared";
import { ResponsivePie } from "@nivo/pie";
import { useTranslation } from "react-i18next";
import CreateIcon from "@mui/icons-material/Create";
import { useDatapackProfileForm } from "./util/datapack-profile-form-hook";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";

export const DatapackProfile = observer(() => {
  const { state } = useContext(context);
  const { id } = useParams();
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  if (!id) return <PageNotFound />;
  const query = new URLSearchParams(useLocation().search);
  const fetchDatapack = () => {
    let datapack: Datapack | undefined;
    switch (query.get("index")) {
      case "server":
        datapack = state.datapackCollection.serverDatapackIndex[id];
        break;
      case "public_user":
        datapack = state.datapackCollection.publicUserDatapackIndex[id];
        break;
      case "private_user":
        datapack = state.datapackCollection.privateUserDatapackIndex[id];
        break;
      case "workshop":
        datapack = state.datapackCollection.workshopDatapackIndex[id];
        break;
      default:
        datapack =
          state.datapackCollection.serverDatapackIndex[id] ||
          state.datapackCollection.publicUserDatapackIndex[id] ||
          state.datapackCollection.privateUserDatapackIndex[id] ||
          state.datapackCollection.workshopDatapackIndex[id] ||
          null;
        break;
    }
    return datapack;
  };
  const datapack = fetchDatapack();
  if (!datapack) return <PageNotFound />;
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
      tab: <WarningsTab count={datapack.warnings ? datapack.warnings.length : 0} />
    }
  ];
  return (
    <div className={styles.adjcontainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <IconButton className={styles.back} onClick={() => navigate("/settings")}>
            <ArrowBackIcon className={styles.icon} />
          </IconButton>
          <Typography className={styles.ht}>{datapack.title}</Typography>
          <img className={styles.di} src={datapack.image || defaultImageUrl} />
        </div>
        <CustomTabs
          className={styles.tabs}
          centered
          value={tabIndex}
          onChange={(val) => setTabIndex(val)}
          tabs={tabs}
        />
        <CustomDivider className={styles.divider} />
        <DatapackProfileContent index={tabIndex} datapack={datapack} />
      </div>
    </div>
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
  datapack: BaseDatapackProps;
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
  datapack: BaseDatapackProps;
};
const About: React.FC<AboutProps> = ({ datapack }) => {
  const [editMode, setEditMode] = useState(false);
  const { state, setters, handlers } = useDatapackProfileForm(datapack);
  const { t } = useTranslation();
  // for when user tries to navigate away with unsaved changes
  useBlocker(
    ({ currentLocation, nextLocation }) =>
      state.unsavedChanges &&
      currentLocation.pathname !== nextLocation.pathname &&
      !window.confirm(t("dialogs.confirm-changes.message"))
  );
  // for when user tries to leave page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (state.unsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [state.unsavedChanges]);
  return (
    <Box className={styles.about} bgcolor="secondaryBackground.main">
      <div className={styles.ah}>
        <Typography className={styles.dt}>Description</Typography>
        <Typography className={styles.description}>{datapack.description}</Typography>
        {datapack.notes && (
          <>
            <Typography className={styles.dt}>Notes</Typography>
            <Typography className={styles.description}>{datapack.notes}</Typography>
          </>
        )}
        {datapack.contact && (
          <>
            <Typography className={styles.dt}>Contact</Typography>
            <Typography className={styles.description}>{datapack.contact}</Typography>
          </>
        )}
      </div>
      <div className={styles.additional}>
        {!editMode ? (
          <Box className={styles.pencilIconContainer} onClick={() => setEditMode(!editMode)}>
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
                if (!state.unsavedChanges || window.confirm(t("dialogs.confirm-changes.message"))) {
                  setEditMode(false);
                  // reset the metadata if the user cancels
                  if (state.unsavedChanges) {
                    handlers.resetDatapackMetadata();
                  }
                }
              }}>
              Cancel
            </Button>
            <TSCButton className={styles.editButton}>Save</TSCButton>
          </Box>
        )}
        <div className={styles.ai}>
          <Typography className={styles.aih}>Authored By</Typography>
          {editMode ? (
            <TextField
              fullWidth
              onChange={(e) => setters.updateDatapackMetadata({ ...datapack, authoredBy: e.target.value })}
              value={state.datapackMetadata.authoredBy}
            />
          ) : (
            <Typography>{datapack.authoredBy}</Typography>
          )}
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Created</Typography>
          {editMode ? (
            <DatePicker
              value={datapack.date ? dayjs(datapack.date) : null}
              maxDate={dayjs()}
              slotProps={{
                field: {
                  clearable: true,
                  onClear: () => setters.updateDatapackMetadata({ ...datapack, date: undefined })
                },
                textField: { helperText: state.dateError },
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
              onChange={handlers.handleDateChange}
            />
          ) : (
            <Typography>{datapack.date || "Unknown"}</Typography>
          )}
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Total Columns</Typography>
          <Typography>{datapack.totalColumns}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Name</Typography>
          <Typography>{datapack.originalFileName}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Size</Typography>
          <Typography>{datapack.size}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Tags</Typography>
          <div className={styles.tags}>
            {datapack.tags[0]
              ? datapack.tags.map((tag) => (
                  <TagButton key={tag}>
                    <Typography fontSize="0.9rem">{tag}</Typography>
                  </TagButton>
                ))
              : "No tags"}
          </div>
        </div>
      </div>
    </Box>
  );
};

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
  datapack: BaseDatapackProps;
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
