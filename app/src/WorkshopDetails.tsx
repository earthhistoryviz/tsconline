import React, { useContext, useEffect } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import styles from "./WorkshopDetails.module.css";
import { CustomDivider, CustomTooltip, TSCButton } from "./components";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { useNavigate, useParams } from "react-router";
import { PageNotFound } from "./PageNotFound";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { TSCLoadingButton } from "./components/TSCLoadingButton";
import { formatDate, getWorkshopCoverImage } from "./state/non-action-util";
import { loadRecaptcha, removeRecaptcha } from "./util";
import { ReservedWorkshopFileKey, reservedInstructionsFileName, reservedPresentationFileName } from "@tsconline/shared";

type WorkshopReservedFileProps = {
  renderLink: boolean;
  fileType: ReservedWorkshopFileKey;
  workshopId: number;
  userInWorkshop: boolean;
};
const WorkshopReservedFile: React.FC<WorkshopReservedFileProps> = ({
  renderLink,
  fileType,
  workshopId,
  userInWorkshop
}) => {
  const { t } = useTranslation();
  const backendUrl = import.meta.env.DEV ? "http://localhost:3000" : "";
  return (
    <>
      <Typography className={styles.aih} mb={0.5}>
        {t("workshops.details-page." + fileType)}
      </Typography>
      {renderLink ? (
        <Typography className={styles.fileName} mb={0.5}>
          <CustomTooltip title={userInWorkshop ? "" : t("workshops.details-page.please-register")}>
            <span>
              <a
                href={userInWorkshop ? `${backendUrl}/workshop/${workshopId}/files/${fileType}` : undefined}
                onClick={(e) => {
                  if (!userInWorkshop) e.preventDefault();
                }}
                target="_blank"
                rel="noreferrer"
                className={userInWorkshop ? undefined : styles.disabledLink}>
                {t("workshops.details-page.view")}
              </a>
            </span>
          </CustomTooltip>
        </Typography>
      ) : (
        <Typography className={styles.fileName} mb={0.5}>
          {t("workshops.details-page.messages.no-" + fileType)}
        </Typography>
      )}
    </>
  );
};

export const WorkshopDetails = observer(() => {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();

  const isRegistered = false;
  const isPublicWorkshop = false;
  const [isDisabled, setIsDisabled] = useState(!isRegistered && !isPublicWorkshop ? true : false);
  const [loading, setLoading] = useState(false);
  const [switchButtonVar, setSwitchButtonVar] = useState(
    isRegistered ? t("workshops.details-page.registered-button") : t("workshops.details-page.register-button")
  );

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
  const shouldLoadRecaptcha = state.user.workshopIds?.includes(Number(id)) || state.user.isAdmin;
  useEffect(() => {
    if (shouldLoadRecaptcha) loadRecaptcha();
    return () => {
      if (shouldLoadRecaptcha) removeRecaptcha();
    };
  }, [shouldLoadRecaptcha]);
  async function downloadWorkshopFiles() {
    if (workshop) {
      await actions.fetchWorkshopFilesForDownload(workshop);
    }
  }
  if (!workshop || !id) return <PageNotFound />;
  return (
    <div className={styles.adjcontainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <IconButton className={styles.back} onClick={() => navigate("/workshops")}>
            <ArrowBackIcon className={styles.icon} />
          </IconButton>
          <Typography className={styles.ht}>{workshop.title}</Typography>

          <img className={styles.di} src={getWorkshopCoverImage(workshop.workshopId)} />
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
              <WorkshopReservedFile
                renderLink={workshop.files?.includes(reservedInstructionsFileName) || false}
                fileType="instructions"
                workshopId={workshop.workshopId}
                userInWorkshop={shouldLoadRecaptcha}
              />
              <WorkshopReservedFile
                renderLink={workshop.files?.includes(reservedPresentationFileName) || false}
                fileType="presentation"
                workshopId={workshop.workshopId}
                userInWorkshop={shouldLoadRecaptcha}
              />
              <Typography className={styles.aih}>{t("workshops.details-page.other-files")}</Typography>
              {(() => {
                const nonReservedFiles =
                  workshop.files?.filter(
                    (file) => file !== reservedInstructionsFileName && file !== reservedPresentationFileName
                  ) ?? [];
                return nonReservedFiles.length > 0 ? (
                  <>
                    {nonReservedFiles.map((file, index) => (
                      <Typography key={index} className={styles.fileName}>
                        • {file}
                      </Typography>
                    ))}
                  </>
                ) : (
                  <Typography className={styles.fileName} mb={0.5}>
                    {t("workshops.details-page.messages.no-files")}
                  </Typography>
                );
              })()}
              <Box sx={{ display: "flex", marginTop: 2, gap: 2 }}>
                {!shouldLoadRecaptcha ? (
                  <CustomTooltip
                    title={t("workshops.details-page.please-register")}
                    slotProps={{
                      popper: {
                        modifiers: [
                          {
                            name: "offset",
                            options: {
                              offset: [0, 0]
                            }
                          }
                        ]
                      }
                    }}>
                    <span>
                      <TSCButton variant="contained" disabled sx={{ backgroundColor: "primary" }}>
                        {t("workshops.details-page.download-button")}
                      </TSCButton>
                    </span>
                  </CustomTooltip>
                ) : (
                  <TSCButton variant="contained" onClick={downloadWorkshopFiles}>
                    {t("workshops.details-page.download-button")}
                  </TSCButton>
                )}
                <CustomTooltip
                  title={
                    !isRegistered && !isPublicWorkshop
                      ? t("workshops.details-page.download-tooltip-not-registered")
                      : ""
                  }
                  placement="bottom">
                  <div>
                    <TSCLoadingButton
                      variant="contained"
                      sx={{ marginRight: 2, backgroundColor: "primary" }}
                      onClick={handleRegisterClick}
                      disabled={isRegistered || isDisabled}
                      loading={loading}>
                      {switchButtonVar}
                    </TSCLoadingButton>
                  </div>
                </CustomTooltip>
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
