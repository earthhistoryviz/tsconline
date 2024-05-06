import { ColumnInfo } from "@tsconline/shared";
import { TSCRadioGroup } from "../components/TSCRadioGroup";
import EventLogo from "../assets/settings_icons/col_icon_event.png";
import RangeLogo from "../assets/settings_icons/col_icon_range.png";

type EventSpecificSettingsProps = {
    column: ColumnInfo;
};
export const EventSpecificSettings: React.FC<EventSpecificSettingsProps> = ({ column }) => {
    if (column.columnDisplayType !== "Event") return null;
    return (
        <TSCRadioGroup name={""} radioArray={[
            { value: "Events", label: "Events", imageSrc: EventLogo},
            { value: "Ranges", label: "Ranges", imageSrc: RangeLogo}
        ]}/>
    )
}