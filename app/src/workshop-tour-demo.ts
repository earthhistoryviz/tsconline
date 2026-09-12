import dayjs from "dayjs";
import tourWorkshopImage from "./assets/TSCreatorLogo.png";
import { RESERVED_INSTRUCTIONS_FILENAME, RESERVED_PRESENTATION_FILENAME, SharedWorkshop } from "@tsconline/shared";

export const WORKSHOP_TOUR_DEMO_ID = 99001;
export const WORKSHOP_TOUR_DEMO_COVER_IMAGE = tourWorkshopImage;

export const workshopTourDemoWorkshop: SharedWorkshop = {
  title: "Switzerland Workshop",
  start: dayjs().subtract(2, "hour").toISOString(),
  end: dayjs().add(10, "day").toISOString(),
  workshopId: WORKSHOP_TOUR_DEMO_ID,
  active: true,
  regRestrict: false,
  creatorUUID: "workshop-tour-demo",
  regLink: null,
  description:
    "This guided example workshop is only used during the workshop tour. It mirrors the real workshop layout so the tour can show the title, date range, datapacks, instructions, presentation, and the other download links without touching live workshop data.",
  files: [
    RESERVED_INSTRUCTIONS_FILENAME,
    RESERVED_PRESENTATION_FILENAME,
    "TSC Workshop -- sample instructions and datasets (2).zip"
  ],
  datapacks: ["Australia", "British Isles", "Human Culture"]
};
