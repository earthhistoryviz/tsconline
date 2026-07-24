import { useContext, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { DatapackUploadForm, TSCButton, CustomTooltip, CustomDivider, StyledScrollbar } from "../components";
import { context } from "../state";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/Download";
import { Menu, MenuItem } from "@szhsin/react-menu";
import styles from "./Datapack.module.css";
import { Dialog, ToggleButtonGroup, ToggleButton, IconButton, SvgIcon, useTheme } from "@mui/material";
import { datapackAddedColors } from "../components/datapack_display/TSCDatapackCard";
import { People, School, Security, Verified, Terrain, Upload, CheckCircle } from "@mui/icons-material";
import { TSCDatapackCard } from "../components/datapack_display/TSCDatapackCard";
import TableRowsIcon from "@mui/icons-material/TableRows";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { TSCDatapackRow } from "../components/datapack_display/TSCDatapackRow";
import DeselectIcon from "@mui/icons-material/Deselect";
import ViewCompactIcon from "@mui/icons-material/ViewCompact";
import { TSCCompactDatapackRow } from "../components/datapack_display/TSCCompactDatapackRow";
import { loadRecaptcha, removeRecaptcha } from "../util";
import { toJS } from "mobx";
import { DatapackConfigForChartRequest, DatapackMetadata, isUserDatapack, isWorkshopDatapack } from "@tsconline/shared";
import { Lock } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  compareExistingDatapacks,
  doesDatapackAlreadyExist,
  getCurrentUserDatapacksMetadata,
  OfficialDatapackGroup,
  getPrivateOfficialDatapackMetadatas,
  getPublicDatapacksMetadataWithoutCurrentUser,
  getPublicOfficialDatapacksMetadata,
  getWorkshopDatapacksMetadata,
  groupOfficialDatapacks,
  isOwnedByUser
} from "../state/non-action-util";

export const Datapacks = observer(function Datapacks() {
  const { state, actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);
  const { t } = useTranslation();
  const theme = useTheme();
  const added = datapackAddedColors(theme);
  const selectedCount = state.unsavedDatapackConfig.length;
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

  // same code to get passed to datapack group display component but as a var to be reused for subgroups paramater
  const officialDatapacks = getPublicOfficialDatapacksMetadata(state.datapackMetadata).filter(
    (item) => !["Treatise", "Lexicon Formations"].some((tag) => item.tags.includes(tag))
  );
  const actionBorder = selectedCount > 0 ? added.main : undefined;

  return (
    <StyledScrollbar className={styles.dc + " settings-datapack-container"}>
      <Box className={styles.topbar}>
        <Box>
          <Typography className={styles.pageTitle}>Add Datapacks</Typography>
          <Typography className={styles.pageSubtitle}>Pick the packs you want, then generate the chart.</Typography>
        </Box>
        <Box className={styles.topbarActions}>
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
              <ViewCompactIcon className={styles.icon} />
            </ToggleButton>
            <ToggleButton className={styles.tb} disableRipple value="rows">
              <TableRowsIcon className={styles.icon} />
            </ToggleButton>
            <ToggleButton className={styles.tb} disableRipple value="cards">
              <DashboardIcon className={styles.icon} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      <Box
        className={`${styles.datapackDisplayContainer} ${state.settingsTabs.datapackDisplayType === "cards" && styles.cards} datapack-display-container`}>
        <DatapackGroupDisplay
          datapacks={officialDatapacks}
          subgroups={groupOfficialDatapacks(officialDatapacks)}
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
        {state.isLoggedIn &&
          getPublicOfficialDatapacksMetadata(state.datapackMetadata).some((item) => item.tags.includes("Treatise")) && (
            <DatapackGroupDisplay
              datapacks={getPublicOfficialDatapacksMetadata(state.datapackMetadata).filter((item) =>
                item.tags.includes("Treatise")
              )}
              header={t("settings.datapacks.title.treatise")}
              HeaderIcon={Terrain}
              loading={state.skeletonStates.publicOfficialDatapacksLoading}
            />
          )}
        {getPublicOfficialDatapacksMetadata(state.datapackMetadata).some((item) =>
          item.tags.includes("Lexicon Formations")
        ) && (
          <DatapackGroupDisplay
            datapacks={getPublicOfficialDatapacksMetadata(state.datapackMetadata).filter((item) =>
              item.tags.includes("Lexicon Formations")
            )}
            header={t("settings.datapacks.title.lexicon")}
            HeaderIcon={Terrain}
            loading={state.skeletonStates.publicOfficialDatapacksLoading}
          />
        )}
      </Box>
      <Box className={styles.actionDock}>
        <Box className={styles.selectionBadge} sx={{ borderColor: actionBorder }}>
          <Typography className={styles.selectionCount} sx={{ color: actionBorder }}>
            {selectedCount}
          </Typography>
          <Typography className={styles.selectionLabel} color="text.primary">
            {selectedCount === 1 ? "datapack staged" : "datapacks staged"}
          </Typography>
        </Box>
        <Box className={styles.dockButtons}>
          {state.isLoggedIn && (
            <TSCButton className={styles.dockButton} onClick={() => setFormOpen(!formOpen)}>
              <Upload fontSize="small" />
              {t("settings.datapacks.upload")}
            </TSCButton>
          )}
          <TSCButton
            className={styles.dockButton}
            data-tour="datapack-confirm-button"
            disabled={state.loadingDatapacks || selectedCount === 0}
            onClick={async () => {
              await actions.processDatapackConfig(toJS(state.unsavedDatapackConfig));
            }}>
            <CheckCircle fontSize="small" />
            {t("button.confirm-selection")}
          </TSCButton>
          <CustomTooltip title="Deselect All" placement="top">
            <span>
              <IconButton
                className={styles.clearButton}
                data-tour="datapack-deselect-button"
                disabled={selectedCount === 0}
                onClick={async () => {
                  actions.setUnsavedDatapackConfig([]);
                }}>
                <DeselectIcon />
              </IconButton>
            </span>
          </CustomTooltip>
        </Box>
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
  // when set, renders official datapacks in labeled sub-sections instead of one flat list
  subgroups?: OfficialDatapackGroup[];
};
const DatapackGroupDisplay: React.FC<DatapackGroupDisplayProps> = observer(
  ({ datapacks, header, HeaderIcon, loading = false, subgroups }) => {
    const { state, actions } = useContext(context);
    const { t } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const extraLoadingSkeletons = loading ? 2 : 0;
    const isOfficial = header === t("settings.datapacks.title.public-official");
    const isPublicContributed = header === t("settings.datapacks.title.contributed");
    const isTreatise = header === t("settings.datapacks.title.treatise");
    const shouldSplitIntoTwoCol = isOfficial || isPublicContributed || isTreatise;
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
    // row count for the official two-column grid (flat list only)
    const officialRowLimit = (count: number) =>
      shouldSplitIntoTwoCol && (showAll || count <= visibleLimit)
        ? { gridTemplateRows: `repeat(${Math.ceil(count / 2)}, 1fr)` }
        : {};

    // pick row, compact, or card component based on display mode
    const renderDatapack = (datapack: DatapackMetadata | null, key: string) => {
      const value = datapack ? state.unsavedDatapackConfig.some((dp) => compareExistingDatapacks(dp, datapack)) : false;
      return state.settingsTabs.datapackDisplayType === "rows" ? (
        datapack ? (
          <TSCDatapackRow key={key} datapack={datapack} value={value} onChange={onChange} />
        ) : (
          <TSCDatapackRow key={key} />
        )
      ) : state.settingsTabs.datapackDisplayType === "compact" ? (
        datapack ? (
          <TSCCompactDatapackRow key={key} datapack={datapack} value={value} onChange={onChange} />
        ) : (
          <TSCCompactDatapackRow key={key} />
        )
      ) : datapack ? (
        <TSCDatapackCard key={key} datapack={datapack} value={value} onChange={onChange} />
      ) : (
        <TSCDatapackCard key={key} />
      );
    };

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
        {numberOfDatapacks !== 0 &&
          (subgroups ? (
            <>
              {subgroups.map(({ subgroup, label, datapacks: subgroupDatapacks }) => (
                <Box key={`${subgroup ?? "custom"}-${label}`} className={styles.subgroup}>
                  <Typography variant="subtitle1" className={styles.subgroupHeader}>
                    {subgroup ? t(`settings.datapacks.official-subgroup.${subgroup}`) : label}
                  </Typography>
                  {/* 2-column grid for rows/compact; flex wrap for cards */}
                  <Box
                    className={`${styles.item} ${
                      state.settingsTabs.datapackDisplayType === "cards"
                        ? styles.subgroupItemCards
                        : shouldWrap
                          ? styles.subgroupItem
                          : ""
                    }`}>
                    {subgroupDatapacks.map((datapack) => renderDatapack(datapack, datapack.title))}
                  </Box>
                </Box>
              ))}
              {skeletons.length > 0 && (
                <Box className={`${styles.item} ${shouldWrap && styles.wrapItem}`}>
                  {skeletons.map((datapack, index) => renderDatapack(datapack, `skeleton-${index}`))}
                </Box>
              )}
            </>
          ) : (
            // render datapacks normally if not in offical datapack section (that one is categorized)
            <Box
              className={`${styles.item} ${shouldWrap && styles.wrapItem}`}
              style={officialRowLimit(datapacks.length)}>
              {[...visibleDatapacks, ...skeletons].map((datapack, index) =>
                renderDatapack(datapack, datapack?.title ?? `skeleton-${index}`)
              )}
            </Box>
          ))}
        {!subgroups && numberOfDatapacks > visibleLimit && (
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
