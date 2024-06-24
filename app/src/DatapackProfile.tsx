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

const tags: string[] = ["Large", "Small", "Medium", "Huge", "Tiny", "Normal", "Abnormal"];
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
      tab: <WarningsTab count={200} />
    }
  ];
  return (
    <div className={styles.adjcontainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <IconButton className={styles.back} onClick={() => navigate("/settings")}>
            <ArrowBackIcon className={styles.icon} />
          </IconButton>
          <Typography className={styles.ht}>{id}</Typography>
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
        <DatapackProfileContent index={tabIndex} />
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
};
const DatapackProfileContent: React.FC<DatapackProfileContentProps> = ({ index }) => {
  switch (index) {
    case 0:
      return <About />;
    case 1:
      return <NotImplemented />;
    case 2:
      return <Discussion />;
    case 3:
      return (
        <>
          <DatapackWarning text="hi" />
          <DatapackWarning
            text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur fermentum nisi vel pulvinar hendrerit. Curabitur non lacus nulla. Maecenas pellentesque imperdiet vestibulum. Aenean laoreet pretium lectus, pulvinar sollicitudin mauris accumsan quis. Nullam mollis iaculis egestas. Nam lobortis, neque sed malesuada dictum, eros nulla venenatis nunc, sed fringilla justo lorem at lorem. Aliquam egestas neque magna, quis posuere metus lobortis at. Suspendisse nec nibh eu justo vehicula semper. Nulla efficitur nunc sit amet dignissim posuere. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Proin imperdiet, purus a lacinia pharetra, lacus dui cursus metus, at rhoncus libero ligula sed dolor.
      Nulla pulvinar nulla erat, et fringilla sem finibus sit amet. Cras cursus urna non risus lacinia, ultricies vestibulum ipsum bibendum. Maecenas quis magna ac risus consequat elementum. Donec pretium orci nec congue ultricies. Proin ullamcorper nec nibh sed auctor. Ut non vehicula velit, non scelerisque purus. Vestibulum quis ipsum mi. Cras ultrices finibus dolor id dapibus. Sed eleifend viverra risus, in dictum velit ultrices quis. Nullam pulvinar magna ut lectus placerat rhoncus. Aenean vitae ex sed tellus convallis ullamcorper. Suspendisse mattis consequat lectus, non malesuada urna convallis non. Sed rhoncus fringilla nisi, at congue leo venenatis id."
          />
        </>
      );
    default:
      return <About />;
  }
};

const About: React.FC = () => {
  return (
    <Box className={styles.about} bgcolor="secondaryBackground.main">
      <div className={styles.ah}>
        <Typography className={styles.dt}>Description</Typography>
        <Typography className={styles.description}>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys
          standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to
          make a type specimen book. It has survived not only five centuries, but also the leap into electronic
          typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset
          sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus
          PageMaker including versions of Lorem Ipsum Lorem Ipsum is simply dummy text of the printing and typesetting
          industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer
          took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries,
          but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the
          1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop
          publishing software like Aldus PageMaker including versions of Lorem Ipsum Lorem Ipsum is simply dummy text of
          the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the
          1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has
          survived not only five centuries, but also the leap into electronic typesetting, remaining essentially
          unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum
          passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem
          Ipsum
        </Typography>
      </div>
      <div className={styles.additional}>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Author</Typography>
          <Typography>Duval et al.</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Created</Typography>
          <Typography>12/12/2004</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Columns</Typography>
          <Typography>50</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Size</Typography>
          <Typography>10 Mb</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Tags</Typography>
          <div className={styles.tags}>
            {tags.map((tag) => (
              <TagButton key={tag}>
                <Typography fontSize="0.9rem">{tag}</Typography>
              </TagButton>
            ))}
          </div>
        </div>
      </div>
    </Box>
  );
};

type DatapackWarningProps = {
  text: string;
};
export const DatapackWarning: React.FC<DatapackWarningProps> = ({ text }) => {
  return (
    <Box className={styles.dwc} bgcolor="secondaryBackground.light">
      <CampaignIcon className={styles.dwi} />
      <Typography>{text}</Typography>
    </Box>
  );
};
