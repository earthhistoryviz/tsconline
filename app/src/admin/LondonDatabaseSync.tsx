import { DatapackMetadata } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { Box } from "@mui/material";
import { Loader, CustomTooltip, ColoredIconButton } from "../components/TSCComponents";
import { context } from "../state";
import SyncIcon from "@mui/icons-material/Sync";

type TSCLondonDatabaseSyncButtonProps = {
  datapack?: DatapackMetadata;
};

export const LondonSyncButton: React.FC<TSCLondonDatabaseSyncButtonProps> = observer(function TSCCompactDatapackRow({
  datapack
}) {
  const [loading, setLoading] = useState(false);
  const { actions, state } = useContext(context);
  return (
    <>
      {datapack &&
        (datapack.title === "UCL TSC Chron" || datapack.title === "UCL TSC Facies") &&
        state.user?.isAdmin && (
          <Box sx={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <CustomTooltip title="Sync London Datapack: This will fetch the latest London datapack and upload it to the official datapacks. Existing datapacks with the same name will be deleted first. Sync is automatically done every midnight EST.">
              <span>
                <ColoredIconButton
                  size="small"
                  disabled={loading}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setLoading(true);
                    try {
                      const result = await actions.fetchLondonDatapack();
                      if (result) {
                        const { metadata, file } = result;
                        const uploadMetadata = { ...metadata, title: "UCL TSC Chron" };
                        const legacyTitles = ["UCL TSC Chron", "UCL TSC Facies"];
                        const toDelete = legacyTitles
                          .filter((title) =>
                            state.datapackMetadata.some((d) => d.title === title && d.type === "official")
                          )
                          .map((title) => ({ ...uploadMetadata, title }));
                        if (toDelete.length > 0) {
                          await actions.adminDeleteOfficialDatapacks(toDelete);
                        }
                        await actions.adminUploadOfficialDatapack(file, uploadMetadata);
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setLoading(false);
                    }
                  }}>
                  {loading ? <Loader /> : <SyncIcon className={"sync-icon"} />}
                </ColoredIconButton>
              </span>
            </CustomTooltip>
          </Box>
        )}
    </>
  );
});
