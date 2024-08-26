import { useContext, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { DatapackUploadForm, TSCButton, CustomTooltip, CustomDivider } from "../components";
import { context } from "../state";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/Download";
import { Menu, MenuItem } from "@szhsin/react-menu";
import styles from "./Datapack.module.css";
import { Dialog, ToggleButtonGroup, ToggleButton, IconButton, SvgIcon } from "@mui/material";
import { TSCDatapackCard } from "../components/datapack_display/TSCDatapackCard";
import TableRowsIcon from "@mui/icons-material/TableRows";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { TSCDatapackRow } from "../components/datapack_display/TSCDatapackRow";
import DeselectIcon from "@mui/icons-material/Deselect";
import ViewCompactIcon from "@mui/icons-material/ViewCompact";
import { TSCCompactDatapackRow } from "../components/datapack_display/TSCCompactDatapackRow";
import { loadRecaptcha, removeRecaptcha } from "../util";
import { toJS } from "mobx";
import { Datapack, DatapackConfigForChartRequest, DatapackIndex, isPrivateUserDatapack } from "@tsconline/shared";
import { Work, Storage, Lock, Public } from "@mui/icons-material";

export const Datapacks = observer(function Datapacks() {
  const { state, actions } = useContext(context);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (state.isLoggedIn) {
      loadRecaptcha();
    }
    return () => {
      if (state.isLoggedIn) {
        removeRecaptcha();
      }
    };
  }, []);

  return (
    <div className={styles.dc}>
      <div className={styles.hdc}>
        <CustomTooltip title="Deselect All" placement="top">
          <IconButton
            className={styles.ib}
            onClick={async () => {
              await actions.processDatapackConfig([]);
            }}>
            <DeselectIcon />
          </IconButton>
        </CustomTooltip>
        <div>
          <Typography className={styles.h}>Click a datapack to see more information!</Typography>
          <Typography className={styles.dh}>Add a datapack by clicking the checkbox</Typography>
        </div>
        <ToggleButtonGroup
          className={styles.display}
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
      <DatapackIndexDisplay
        index={state.datapackCollection.serverDatapackIndex}
        header="Server Datapacks"
        HeaderIcon={Storage}
      />
      {state.isLoggedIn && (
        <DatapackIndexDisplay
          index={state.datapackCollection.privateUserDatapackIndex}
          header="Your Datapacks"
          HeaderIcon={Lock}
        />
      )}
      <DatapackIndexDisplay
        index={state.datapackCollection.publicUserDatapackIndex}
        header="Public User Datapacks"
        HeaderIcon={Public}
      />
      <DatapackIndexDisplay
        index={state.datapackCollection.workshopDatapackIndex}
        header="Workshop Datapacks"
        HeaderIcon={Work}
      />
      <Box className={styles.container}>
        {state.isLoggedIn && (
          <TSCButton
            className={styles.buttons}
            onClick={() => {
              setFormOpen(!formOpen);
            }}>
            Upload Datapack
          </TSCButton>
        )}
        <TSCButton
          className={styles.buttons}
          onClick={async () => {
            await actions.processDatapackConfig(toJS(state.unsavedDatapackConfig));
          }}>
          Confirm Selection
        </TSCButton>
      </Box>
      <Dialog classes={{ paper: styles.dd }} open={formOpen} onClose={() => setFormOpen(false)}>
        <DatapackUploadForm
          close={() => setFormOpen(false)}
          upload={actions.uploadUserDatapack}
          index={state.datapackCollection.privateUserDatapackIndex}
        />
      </Dialog>
    </div>
  );
});
type DatapackMenuProps = {
  datapack: Datapack;
  button?: JSX.Element;
};
export const DatapackMenu: React.FC<DatapackMenuProps> = ({ datapack, button }) => {
  const { actions } = useContext(context);
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
      {isPrivateUserDatapack(datapack) && (
        <MenuItem onClick={async () => await actions.userDeleteDatapack(datapack.title)}>
          <Typography>Delete Datapack</Typography>
        </MenuItem>
      )}
    </Menu>
  );
};

type DatapackIndexDisplayProps = {
  index: DatapackIndex;
  header: string;
  HeaderIcon: React.ElementType;
};
const DatapackIndexDisplay: React.FC<DatapackIndexDisplayProps> = observer(({ index, header, HeaderIcon }) => {
  const { state, actions } = useContext(context);
  const onChange = (newDatapack: DatapackConfigForChartRequest) => {
    if (state.unsavedDatapackConfig.includes(newDatapack)) {
      actions.setUnsavedDatapackConfig(
        state.unsavedDatapackConfig.filter((datapack) => datapack.title !== newDatapack.title)
      );
    } else {
      actions.setUnsavedDatapackConfig([...state.unsavedDatapackConfig, newDatapack]);
    }
  };
  const numberOfDatapacks = Object.keys(index).length;

  return (
    <Box className={`${styles.container} ${state.settingsTabs.datapackDisplayType === "cards" ? styles.cards : ""}`}>
      <Box className={styles.header}>
        <SvgIcon className={styles.sdi}>
          <HeaderIcon/>
        </SvgIcon>
        <Typography
          variant="h5"
          fontWeight={700}
          fontSize="1.2rem"
          className={styles.idh}>{`${header} (${numberOfDatapacks})`}</Typography>
      </Box>
      <CustomDivider className={styles.divider} />
      {Object.keys(index).map((datapack) => {
        return state.settingsTabs.datapackDisplayType === "rows" ? (
          <TSCDatapackRow
            key={datapack}
            name={datapack}
            datapack={index[datapack]}
            value={state.unsavedDatapackConfig.map((dp) => dp.title).includes(datapack)}
            onChange={onChange}
          />
        ) : state.settingsTabs.datapackDisplayType === "compact" ? (
          <TSCCompactDatapackRow
            key={datapack}
            name={datapack}
            datapack={index[datapack]}
            value={state.unsavedDatapackConfig.map((dp) => dp.title).includes(datapack)}
            onChange={onChange}
          />
        ) : (
          <TSCDatapackCard
            key={datapack}
            name={datapack}
            datapack={index[datapack]}
            value={state.unsavedDatapackConfig.map((dp) => dp.title).includes(datapack)}
            onChange={onChange}
          />
        );
      })}
      {Object.keys(index).length === 0 && <Typography>No {header} Available</Typography>}
    </Box>
  );
});
