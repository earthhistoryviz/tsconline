import { observer } from "mobx-react-lite";
import { useNavigate, useParams } from "react-router";
import styles from "./DatapackProfile.module.css";
import { useContext, useState } from "react";
import { context } from "./state";
import { devSafeUrl } from "./util";
import { Box, IconButton, Typography } from "@mui/material";
import { CustomDivider, NotImplemented, TagButton } from "./components";
import { CustomTabs } from "./components/TSCCustomTabs";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Discussion } from "./components/TSCDiscussion";
import CampaignIcon from "@mui/icons-material/Campaign";
import { PageNotFound } from "./PageNotFound";
import { DatapackParsingPack, DatapackWarning } from "@tsconline/shared";

export const DatapackProfile = observer(() => {
  const { state } = useContext(context);
  const { id } = useParams();
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  if (!id) return <PageNotFound />;
  const datapack = state.datapackIndex[decodeURIComponent(id)];
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
  return (
    <div className={styles.wtc}>
      Warnings{count > 0 && <span className={styles.number}>{`${count > 99 ? `99+` : count}`}</span>}
    </div>
  );
};

type DatapackProfileContentProps = {
  index: number;
  datapack: DatapackParsingPack;
};
const DatapackProfileContent: React.FC<DatapackProfileContentProps> = ({ index, datapack }) => {
  switch (index) {
    case 0:
      return <About datapack={datapack} />;
    case 1:
      return <NotImplemented />;
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
  datapack: DatapackParsingPack;
};
const About: React.FC<AboutProps> = ({ datapack }) => {
  return (
    <Box className={styles.about} bgcolor="secondaryBackground.main">
      <div className={styles.ah}>
        <Typography className={styles.dt}>Description</Typography>
        <Typography className={styles.description}>{datapack.description}</Typography>
      </div>
      <div className={styles.additional}>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Authored By</Typography>
          <Typography>{datapack.authoredBy}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Created</Typography>
          <Typography>{datapack.date || "Unknown"}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Columns</Typography>
          <Typography>{datapack.totalColumns}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Name</Typography>
          <Typography>{datapack.file}</Typography>
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
