import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import styles from "./WorkshopDetails.module.css";
import { CustomDivider, TSCButton } from "./components";

// TODO: change this when backend is finished
type Workshop = {
  title: string;
  start: string;
  end: string;
  workshopId: number;
  active: boolean;
  datapacks: string[];
  description: string;
  files: string[];
  downloadLink: string;
};

type WorkshopDetailsProps = {
  workshop: Workshop;
  onBack: () => void; // Callback for going back
};

const WorkshopDetails: React.FC<WorkshopDetailsProps> = ({ workshop, onBack }) => {
  return (
    <div className={styles.adjcontainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <IconButton className={styles.back} onClick={onBack}>
            <ArrowBackIcon className={styles.icon} />
          </IconButton>

          <Typography className={styles.ht}>{workshop.title}</Typography>

          <img className={styles.di} src={TSCreatorLogo} />
        </div>
        <CustomDivider className={styles.divider} />
        <Box className={styles.about} bgcolor="secondaryBackground.main">
          <div className={styles.ah}>
            <div className={styles.ai}>
              <Typography className={styles.aih}>Start Date</Typography>
              <Typography>{workshop.start}</Typography>
            </div>
            <div className={styles.ai}>
              <Typography className={styles.aih}>End Date</Typography>
              <Typography>{workshop.end}</Typography>
            </div>

            <div className={styles.ai}>
              <Typography className={styles.aih}>DataPacks</Typography>
              <Box>
                {workshop.datapacks.length > 0 ? (
                  workshop.datapacks.map((datapack, index) => (
                    <Typography key={index} className={styles.fileName}>
                      • {datapack}
                    </Typography>
                  ))
                ) : (
                  <Typography className={styles.fileName}>No datapacks available</Typography>
                )}
              </Box>
            </div>
            <div className={styles.ai}>
              <Typography className={styles.aih}>Files</Typography>
              <Box>
                <>
                  {workshop.files.length > 0 ? (
                    workshop.files.map((file, index) => (
                      <Typography key={index} className={styles.fileName}>
                        • {file}
                      </Typography>
                    ))
                  ) : (
                    <Typography className={styles.fileName}>No files available</Typography>
                  )}
                  <TSCButton variant="contained" color="primary" sx={{ marginTop: 2 }} href={workshop.downloadLink}>
                    Download Files
                  </TSCButton>
                </>
              </Box>
            </div>
          </div>
          <div className={styles.additional}>
            <Typography className={styles.dt}>Description</Typography>
            <Typography className={styles.description}>{workshop.description}</Typography>
          </div>
        </Box>
      </div>
    </div>
  );
};

export default WorkshopDetails;
