import { actions } from "../../state";
import { SetDatapackConfigCompleteMessage, SetDatapackConfigMessage } from "../../types";
self.onmessage = async (e: MessageEvent<SetDatapackConfigMessage>) => {
    console.log("helloe1");
    const { datapacks, settingsPath } = e.data;
    console.log(datapacks);
    const setDpConfig = await actions.setDatapackConfig(
        datapacks,
        settingsPath
    );
    console.log("hello2");
    const timeoutThreshold = 3000000;
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error("Function timed out after" + timeoutThreshold + " ms"));
        }, timeoutThreshold);
    });
    const message: SetDatapackConfigCompleteMessage = { status: "success", value: undefined };
    async function runWithTimeout() {
        console.log("I'm here");
        try {
            await Promise.race([setDpConfig, timeoutPromise]);
            message.value = setDpConfig;
        } catch (error) {
            message.status = "failure";
        }
    }
    await runWithTimeout();
    self.postMessage(message);
};
