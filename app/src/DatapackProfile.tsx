import { observer } from "mobx-react-lite";
import { useNavigate, useParams } from "react-router";
import styles from "./DatapackProfile.module.css";
import { useContext, useState } from "react";
import { context } from "./state";
import { devSafeUrl } from "./util";
import { IconButton, Typography } from "@mui/material";
import { CustomDivider } from "./components";
import { CustomTabs } from "./components/TSCCustomTabs";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export const DatapackProfile = observer(() => {
  const { state } = useContext(context);
  const { id } = useParams();
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  if (!id) return;
  const datapack = state.datapackIndex[id];
  if (!datapack) return;
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <IconButton className={styles.back} onClick={() => navigate("/settings")}>
          <ArrowBackIcon />
        </IconButton>
        <img className={styles.di} src={datapack.image || defaultImageUrl} />
        <Typography className={styles.ht}>{id}</Typography>
      </div>
      <CustomTabs
        className={styles.tabs}
        centered
        value={tabIndex}
        onChange={(val) => setTabIndex(val)}
        tabs={["About", "Discussion", "Data"]}
      />
      <CustomDivider className={styles.divider} />
      <About />
    </div>
  );
});

const About: React.FC = () => {
  return (
    <div className={styles.about}>
      <div className={styles.ah}>
        <Typography className={styles.dt}>Description</Typography>
        <Typography className={styles.description}>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's
          standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to
          make a type specimen book. It has survived not only five centuries, but also the leap into electronic
          typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset
          sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus
          PageMaker including versions of Lorem Ipsum
        </Typography>
      </div>
      <div className={styles.additional}>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Size:</Typography>
          <Typography>10 Mb</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Columns:</Typography>
          <Typography>50</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Created:</Typography>
          <Typography>12/12/2004</Typography>
        </div>
      </div>
    </div>
  );
};
