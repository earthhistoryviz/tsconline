import { useContext, useEffect } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import styles from "./WorkshopDetails.module.css";
import { CustomDivider, TSCButton } from "./components";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { useNavigate, useParams } from "react-router";
import { PageNotFound } from "./PageNotFound";
import { useTranslation } from "react-i18next";
import { NotLoggedIn } from "./NotLoggedIn";
import { formatDate, getWorkshopCoverImage } from "./state/non-action-util";
import { loadRecaptcha, removeRecaptcha } from "./util";

export const WorkshopDetails = observer(() => {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const fetchWorkshop = () => {
    if (!id) return;
    const workshop = state.admin.workshops.find((d) => d.workshopId === Number(id));
    return workshop;
  };
  const workshop = fetchWorkshop();
  if (!state.isLoggedIn) return <NotLoggedIn />;
  if (!workshop || !id) return <PageNotFound />;
  const shouldLoadRecaptcha = state.user.isAdmin || state.isLoggedIn;
  useEffect(() => {
    if (shouldLoadRecaptcha) loadRecaptcha();
    return () => {
      if (shouldLoadRecaptcha) removeRecaptcha();
    };
  }, [shouldLoadRecaptcha]);
  function downloadWorkshopFiles() {
    if (workshop) {
      actions.fetchWorkshopFilesForDownload(workshop);
    }
  }

  return (
    <div className={styles.adjcontainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <IconButton className={styles.back} onClick={() => navigate("/workshops")}>
            <ArrowBackIcon className={styles.icon} />
          </IconButton>

          <Typography className={styles.ht}>{workshop.title}</Typography>

          <img className={styles.di} src={getWorkshopCoverImage()} />
        </div>
        <CustomDivider className={styles.divider} />
        <Box className={styles.about} bgcolor="secondaryBackground.main">
          <div className={styles.ah}>
            <div className={styles.ai}>
              <Typography className={styles.aih}>{t("workshops.dates.start")}</Typography>
              <Typography>{formatDate(workshop.start)}</Typography>
            </div>
            <div className={styles.ai}>
              <Typography className={styles.aih}>{t("workshops.dates.end")}</Typography>
              <Typography>{formatDate(workshop.end)}</Typography>
            </div>

            <div className={styles.ai}>
              <Typography className={styles.aih}>{t("workshops.details-page.datapacks")}</Typography>
              <Box>
                {workshop.datapacks && workshop.datapacks.length > 0 ? (
                  workshop.datapacks.map((datapack, index) => (
                    <Typography key={index} className={styles.fileName}>
                      • {datapack}
                    </Typography>
                  ))
                ) : (
                  <Typography className={styles.fileName}>
                    {t("workshops.details-page.messages.no-datapacks")}
                  </Typography>
                )}
              </Box>
            </div>
            <div className={styles.ai}>
              <Typography className={styles.aih}>{t("workshops.details-page.files")}</Typography>
              <Box>
                <>
                  {workshop.files && workshop.files.length > 0 ? (
                    <>
                      {workshop.files.map((file, index) => (
                        <Typography key={index} className={styles.fileName}>
                          • {file}
                        </Typography>
                      ))}
                      {/* TODO: change this to only be allowed if user is registered to the workshop. Probably need a route for checking this */}
                      <TSCButton
                        variant="contained"
                        color="primary"
                        sx={{ marginTop: 2 }}
                        onClick={() => downloadWorkshopFiles()}>
                        {t("workshops.details-page.download-button")}
                      </TSCButton>
                    </>
                  ) : (
                    <Typography className={styles.fileName}>{t("workshops.details-page.messages.no-files")}</Typography>
                  )}
                </>
              </Box>
            </div>
          </div>
          <div className={styles.additional}>
            <Typography className={styles.dt}>{t("workshops.details-page.description")}</Typography>
            <Typography className={styles.description}>{workshop.description}</Typography>
          </div>
        </Box>
      </div>
    </div>
  );
});

export default WorkshopDetails;
