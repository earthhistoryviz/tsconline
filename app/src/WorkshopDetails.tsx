import { useContext } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import styles from "./WorkshopDetails.module.css";
import { CustomDivider, TSCButton } from "./components";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { useNavigate, useParams } from "react-router";
import { PageNotFound } from "./PageNotFound";
import { useTranslation } from "react-i18next";
import { NotLoggedIn } from "./NotLoggedIn";
import { useState } from "react";
import { TSCLoadingButton } from "./components/TSCLoadingButton";
import { CustomTooltip } from "./components";

// TODO: change this when backend is finished

export const WorkshopDetails = observer(() => {
  const { state } = useContext(context);
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();

  const isRegistered = false;
  const isPublicWorkshop = true;
  const [showTooltip, setShowTooltip] = useState(false); 
  const [isDisabled, setIsDisabled] = useState((!isRegistered && !isPublicWorkshop) ? true : false);
  const [loading, setLoading] = useState(false);
  const [switchButtonVar, setSwitchButtonVar] = useState(isRegistered ? t("workshops.details-page.registered-button") : t("workshops.details-page.register-button"));



  const handleRegisterClick = () => {
    if (!isRegistered && isPublicWorkshop) {
      setLoading(true);
      setIsDisabled(true);
    }
    setTimeout(() => {
      if (!isRegistered && isPublicWorkshop) {
        setSwitchButtonVar(t("workshops.details-page.registered-button"));
      }
      setLoading(false);
    }, 2000);
  };

  const fetchWorkshop = () => {
    if (!id) return;
    const workshop = state.workshops.find((d) => d.workshopId === Number(id));
    return workshop;
  };
  const workshop = fetchWorkshop();
  if (!state.isLoggedIn) return <NotLoggedIn />;
  if (!workshop || !id) return <PageNotFound />;
  const fetchWorkshopFiles = () => {
    //TODO: implement this when implement the backend
    return "https://example.com/download/advanced_typescript.zip";
  };
  return (
    <div className={styles.adjcontainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <IconButton className={styles.back} onClick={() => navigate("/workshops")}>
            <ArrowBackIcon className={styles.icon} />
          </IconButton>
          <Typography className={styles.ht}>{workshop.title}</Typography>

          <img className={styles.di} src={TSCreatorLogo} />
        </div>
        <CustomDivider className={styles.divider} />
        <Box className={styles.about} bgcolor="secondaryBackground.main">
          <div className={styles.ah}>
            <div className={styles.ai}>
              <Typography className={styles.aih}>{t("workshops.dates.start")}</Typography>
              <Typography>{workshop.start}</Typography>
            </div>
            <div className={styles.ai}>
              <Typography className={styles.aih}>{t("workshops.dates.end")}</Typography>
              <Typography>{workshop.end}</Typography>
            </div>

            <div className={styles.ai}>
              <Typography className={styles.aih}>{t("workshops.details-page.datapacks")}</Typography>
              <Box>
                {workshop.datapacks.length > 0 ? (
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
                  {workshop.files.length > 0 ? (
                    workshop.files.map((file, index) => (
                      <Typography key={index} className={styles.fileName}>
                        • {file}
                      </Typography>
                    ))
                  ) : (
                    <Typography className={styles.fileName}>{t("workshops.details-page.messages.no-files")}</Typography>
                  )}
                  <Box sx={{ display: "flex", marginTop: 2 }}>
                    <CustomTooltip title={t("workshops.details-page.messages.not-registered")} open={showTooltip} placement="bottom">
                      <div
                      onMouseEnter={() => { 
                        if (!isRegistered && !isPublicWorkshop) {
                          setShowTooltip(true);
                        }
                      }} 
                      onMouseLeave={() => setShowTooltip(false)}
                      >
                      <TSCLoadingButton
                        variant="contained"
                        sx={{
                          marginRight: 2,
                          backgroundColor: "primary"
                        }}
                        onClick={handleRegisterClick}
                        disabled={isRegistered ? true : isDisabled}
                        loading={loading}>
                        {switchButtonVar}
                      </TSCLoadingButton>
                      </div>
                    </CustomTooltip>

                    <TSCButton variant="contained" color="primary" href={fetchWorkshopFiles()}>
                      {t("workshops.details-page.download-button")}
                    </TSCButton>
                  </Box>
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
