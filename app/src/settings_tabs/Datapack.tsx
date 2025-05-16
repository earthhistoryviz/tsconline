import { useContext, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { DatapackUploadForm, TSCButton, CustomTooltip, CustomDivider, StyledScrollbar } from "../components";
import { context } from "../state";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/Download";
import { Menu, MenuItem } from "@szhsin/react-menu";
import styles from "./Datapack.module.css";
import { Dialog, ToggleButtonGroup, ToggleButton, IconButton, SvgIcon } from "@mui/material";
import { People, School, Security, Verified, Terrain } from "@mui/icons-material";
import { TSCDatapackCard } from "../components/datapack_display/TSCDatapackCard";
import TableRowsIcon from "@mui/icons-material/TableRows";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { TSCDatapackRow } from "../components/datapack_display/TSCDatapackRow";
import DeselectIcon from "@mui/icons-material/Deselect";
import ViewCompactIcon from "@mui/icons-material/ViewCompact";
import { TSCCompactDatapackRow } from "../components/datapack_display/TSCCompactDatapackRow";
import { loadRecaptcha, removeRecaptcha } from "../util";
import { toJS } from "mobx";
import {
  DatapackConfigForChartRequest,
  DatapackMetadata,
  isTempDatapack,
  isUserDatapack,
  isWorkshopDatapack
} from "@tsconline/shared";
import { Lock } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  compareExistingDatapacks,
  doesDatapackAlreadyExist,
  getCurrentUserDatapacksMetadata,
  getPrivateOfficialDatapackMetadatas,
  getPublicDatapacksMetadataWithoutCurrentUser,
  getPublicOfficialDatapacksMetadata,
  getTreatuseDatapackMetadata,
  getWorkshopDatapacksMetadata,
  isOwnedByUser
} from "../state/non-action-util";
import { useNavigate } from "react-router";

export const Datapacks = observer(function Datapacks() {
  const { state, actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const shouldLoadRecaptcha =
    state.isLoggedIn &&
    (formOpen ||
      state.user.isAdmin ||
      state.datapackMetadata.some((dp) => isWorkshopDatapack(dp) || (isUserDatapack(dp) && !dp.isPublic)));
  useEffect(() => {
    if (shouldLoadRecaptcha) loadRecaptcha();
    return () => {
      if (shouldLoadRecaptcha) removeRecaptcha();
    };
  }, [shouldLoadRecaptcha]);

  return (
    <StyledScrollbar className={styles.dc + " settings-datapack-container"}>
      <div className={styles.hdc}>
        <CustomTooltip title="Deselect All" placement="top">
          <IconButton
            className={styles.ib}
            data-tour="datapack-deselect-button"
            onClick={async () => {
              actions.setUnsavedDatapackConfig([]);
            }}>
            <DeselectIcon />
          </IconButton>
        </CustomTooltip>
        <div>
          <Typography className={styles.h}>{t("settings.datapacks.see-info-guidance")}</Typography>
          <Typography className={styles.dh}>{t("settings.datapacks.add-datapack-guidance")}</Typography>
        </div>
        <ToggleButtonGroup
          className={styles.display}
          data-tour="datapack-display-button"
          value={state.settingsTabs.datapackDisplayType}
          onChange={(_event, val) => {
            if (val === state.settingsTabs.datapackDisplayType || !/^(rows|cards|compact)$/.test(val)) return;
            actions.setDatapackDisplayType(val);
          }}
          exclusive>
          <ToggleButton className={styles.tb} disableRipple value="compact">
            {" "}
            <ViewCompactIcon className={styles.icon} />{" "}
          </ToggleButton>
          <ToggleButton className={styles.tb} disableRipple value="rows">
            {" "}
            <TableRowsIcon className={styles.icon} />{" "}
          </ToggleButton>
          <ToggleButton className={styles.tb} disableRipple value="cards">
            {" "}
            <DashboardIcon className={styles.icon} />{" "}
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <Box
        className={`${styles.datapackDisplayContainer} ${state.settingsTabs.datapackDisplayType === "cards" && styles.cards} datapack-display-container`}>
        <DatapackGroupDisplay
          datapacks={getPublicOfficialDatapacksMetadata(state.datapackMetadata)}
          header={t("settings.datapacks.title.public-official")}
          HeaderIcon={Verified}
          loading={state.skeletonStates.publicOfficialDatapacksLoading}
        />
        {state.user.isAdmin && (
          <DatapackGroupDisplay
            datapacks={getPrivateOfficialDatapackMetadatas(state.datapackMetadata)}
            header={t("settings.datapacks.title.private-official")}
            HeaderIcon={Security}
            loading={state.skeletonStates.privateOfficialDatapacksLoading}
          />
        )}
        {(state.user.workshopIds?.length ?? 0) > 0 && (
          <DatapackGroupDisplay
            datapacks={getWorkshopDatapacksMetadata(state.datapackMetadata)}
            header={t("settings.datapacks.title.workshop")}
            HeaderIcon={School}
            loading={state.skeletonStates.publicUserDatapacksLoading}
          />
        )}
        {state.isLoggedIn && state.user && (
          <DatapackGroupDisplay
            datapacks={getCurrentUserDatapacksMetadata(state.user.uuid, state.datapackMetadata)}
            header={t("settings.datapacks.title.your")}
            HeaderIcon={Lock}
            loading={state.skeletonStates.privateUserDatapacksLoading}
          />
        )}
        <DatapackGroupDisplay
          datapacks={getPublicDatapacksMetadataWithoutCurrentUser(state.datapackMetadata, state.user?.uuid)}
          header={t("settings.datapacks.title.contributed")}
          HeaderIcon={People}
          loading={state.skeletonStates.publicUserDatapacksLoading}
        />
        {getTreatuseDatapackMetadata(state.datapackMetadata).length !== 0 && (
          <DatapackGroupDisplay
            datapacks={getTreatuseDatapackMetadata(state.datapackMetadata)}
            header={t("settings.datapacks.title.treatise")}
            HeaderIcon={Terrain}
            loading={state.skeletonStates.treatiseDatapackLoading}
          />
        )}
      </Box>
      <Box className={`${styles.container} ${styles.buttonContainer}`}>
        {state.isLoggedIn && (
          <TSCButton
            className={styles.buttons}
            onClick={() => {
              setFormOpen(!formOpen);
            }}>
            {t("settings.datapacks.upload")}
          </TSCButton>
        )}
        <TSCButton
          className={styles.buttons}
          data-tour="datapack-confirm-button"
          disabled={state.loadingDatapacks}
          onClick={async () => {
            await actions.processDatapackConfig(toJS(state.unsavedDatapackConfig));
          }}>
          {t("button.confirm-selection")}
        </TSCButton>
      </Box>
      <Box display="flex" justifyContent="center" alignItems="center" width="100%">
        <TSCButton
          onClick={() => {
            navigate("/crossplot");
            actions.setTab(0);
            for (const datapack of state.unsavedDatapackConfig) {
              if (isTempDatapack(datapack)) {
                // continue to crossplot, this assumes the user just made a converted datapack and is returning the crossplot page
                return;
              }
            }
            actions.processDatapackConfig(toJS(state.unsavedDatapackConfig), {
              setter: actions.setCrossPlotDatapackConfig,
              currentConfig: state.crossPlot.datapacks
            });
          }}>
          {t("crossPlot.create-datapack")}
        </TSCButton>
      </Box>
      <Dialog classes={{ paper: styles.dd }} open={formOpen} onClose={() => setFormOpen(false)}>
        <DatapackUploadForm
          close={() => setFormOpen(false)}
          upload={actions.uploadUserDatapack}
          type={{
            type: "user",
            uuid: state.user?.uuid
          }}
        />
      </Dialog>
    </StyledScrollbar>
  );
});
type DatapackMenuProps = {
  datapack: DatapackMetadata;
  button?: JSX.Element;
};
export const DatapackMenu: React.FC<DatapackMenuProps> = ({ datapack, button }) => {
  const { state, actions } = useContext(context);
  return (
    <Menu
      direction="bottom"
      align="start"
      portal
      menuButton={button || <DownloadIcon className="download-icon" />}
      onClick={(e) => e.stopPropagation()}
      transition>
      <MenuItem onClick={async () => await actions.requestDownload(datapack, true)}>
        <Typography>Encrypted Download</Typography>
      </MenuItem>
      <MenuItem onClick={async () => await actions.requestDownload(datapack, false)}>
        <Typography>Retrieve Original File</Typography>
      </MenuItem>
      {isOwnedByUser(datapack, state.user?.uuid) && (
        <MenuItem onClick={async () => await actions.userDeleteDatapack(datapack.title)}>
          <Typography>Delete Datapack</Typography>
        </MenuItem>
      )}
    </Menu>
  );
};

type DatapackGroupDisplayProps = {
  datapacks: DatapackMetadata[];
  header: string;
  HeaderIcon: React.ElementType;
  loading?: boolean;
};
const DatapackGroupDisplay: React.FC<DatapackGroupDisplayProps> = observer(
  ({ datapacks, header, HeaderIcon, loading = false }) => {
    const { state, actions } = useContext(context);
    const { t } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const extraLoadingSkeletons = loading ? 2 : 0;
    const isOfficial = header === t("settings.datapacks.title.public-official");
    const isPublicContributed = header === t("settings.datapacks.title.contributed");
    const shouldSplitIntoTwoCol = isOfficial || isPublicContributed;
    const visibleLimit = shouldSplitIntoTwoCol ? 12 : 6;
    const visibleDatapacks: (DatapackMetadata | null)[] = showAll ? datapacks : datapacks.slice(0, visibleLimit);
    const skeletons = Array.from({ length: extraLoadingSkeletons }, () => null);
    const onChange = async (newDatapack: DatapackConfigForChartRequest) => {
      if (state.unsavedDatapackConfig.some((datapack) => compareExistingDatapacks(datapack, newDatapack))) {
        actions.setUnsavedDatapackConfig(
          state.unsavedDatapackConfig.filter((datapack) => !compareExistingDatapacks(datapack, newDatapack))
        );
      } else {
        actions.setLoadingDatapacks(true);
        if (!doesDatapackAlreadyExist(newDatapack, state.datapacks)) {
          const datapack = await actions.fetchDatapack(newDatapack);
          if (!datapack) {
            actions.setLoadingDatapacks(false);
            return;
          }
          actions.addDatapack(datapack);
        }
        actions.setUnsavedDatapackConfig([...state.unsavedDatapackConfig, newDatapack]);
        actions.setLoadingDatapacks(false);
      }
    };
    const numberOfDatapacks = datapacks.length + extraLoadingSkeletons;
    const shouldWrap = shouldSplitIntoTwoCol && state.settingsTabs.datapackDisplayType !== "cards";
    const officialRowLimit =
      shouldSplitIntoTwoCol && (showAll || numberOfDatapacks <= visibleLimit)
        ? { gridTemplateRows: `repeat(${(numberOfDatapacks / 2).toFixed(0)}, 1fr)` }
        : {};

    return (
      <Box
        className={`${styles.container} ${state.settingsTabs.datapackDisplayType === "cards" ? styles.cards : ""} ${shouldSplitIntoTwoCol && styles.official}`}>
        <Box className={styles.header}>
          <SvgIcon className={styles.sdi}>
            <HeaderIcon />
          </SvgIcon>
          <Typography
            variant="h5"
            fontWeight={700}
            fontSize="1.2rem"
            className={styles.idh}>{`${header} (${numberOfDatapacks - extraLoadingSkeletons})`}</Typography>
        </Box>
        <CustomDivider className={styles.divider} />
        {numberOfDatapacks !== 0 && (
          <Box className={`${styles.item} ${shouldWrap && styles.wrapItem}`} style={officialRowLimit}>
            {[...visibleDatapacks, ...skeletons].map((datapack, index) => {
              const value = datapack
                ? state.unsavedDatapackConfig.some((dp) => compareExistingDatapacks(dp, datapack))
                : false;
              return state.settingsTabs.datapackDisplayType === "rows" ? (
                datapack ? (
                  <TSCDatapackRow key={index} datapack={datapack} value={value} onChange={onChange} />
                ) : (
                  <TSCDatapackRow key={index} />
                )
              ) : state.settingsTabs.datapackDisplayType === "compact" ? (
                datapack ? (
                  <TSCCompactDatapackRow key={index} datapack={datapack} value={value} onChange={onChange} />
                ) : (
                  <TSCCompactDatapackRow key={index} />
                )
              ) : datapack ? (
                <TSCDatapackCard key={index} datapack={datapack} value={value} onChange={onChange} />
              ) : (
                <TSCDatapackCard key={index} />
              );
            })}
          </Box>
        )}
        {numberOfDatapacks > visibleLimit && (
          <Box className={styles.showBox} onClick={() => setShowAll(!showAll)}>
            <Typography className={styles.show} variant="body2" color="theme.palette.backgroundColor.contrastText">
              {!showAll ? t("settings.datapacks.seeMore") : t("settings.datapacks.seeLess")}
            </Typography>
          </Box>
        )}
        {numberOfDatapacks === 0 && (
          <Typography>
            {t("settings.datapacks.no")} {header} {t("settings.datapacks.avaliable")}
          </Typography>
        )}
      </Box>
    );
  }
);
