import { observer } from "mobx-react-lite";
import { Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { TSCIcon } from "./components";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import "./About.css";
import { AboutCard } from "./components/AboutCard";

import LeytonPic from "./assets/aboutPictures/LeytonBostre.jpg";
import JacquiPic from "./assets/aboutPictures/JacquiLi.jpeg";
import PaoloPic from "./assets/aboutPictures/PaoloGumasing.jpeg";
import JayPic from "./assets/aboutPictures/JayLee.png";
import RohanPic from "./assets/aboutPictures/RohanNachnani.jpg";
import SejalPic from "./assets/aboutPictures/SejalKumar.jpg";
import AdityaPic from "./assets/aboutPictures/AdityaSivathanu.jpg";
import AaronPic from "./assets/aboutPictures/AaronAult.jpg";
import TobyPic from "./assets/aboutPictures/TobyOnyekwere.png";
import RebeccaPic from "./assets/aboutPictures/RebeccaRupp.png";
import JenniferPic from "./assets/aboutPictures/JenniferYu.jpg";
import KevinChang from "./assets/aboutPictures/KevinChang.jpg";


const HeaderContainer = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4)
}));

const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  fontSize: theme.typography.h2.fontSize
}));

const TSCOnlineHeader = () => {
  return (
    <HeaderContainer>
      <TSCIcon src={TSCreatorLogo} alt="Logo" size="80px" marginTop="20px" />
      <HeaderTitle variant="h2">Time Scale Creator Online</HeaderTitle>
    </HeaderContainer>
  );
};

const members = [
  {
    name: "Aaron Ault",
    role: "Advisor",
    homeTown: "Rochester, IN",
    timeWorked: "2008 - Present",
    proPic: AaronPic
  },
  {
    name: "Paolo Gumasing",
    role: "Team Lead",
    homeTown: "Lafayette, IN",
    timeWorked: "2023 - Present",
    proPic: PaoloPic
  },
  {
    name: "Jay Lee",
    role: "Member",
    homeTown: "Seoul, South Korea",
    timeWorked: "2023 - Present",
    proPic: JayPic
  },
  {
    name: "Sejal Kumar",
    role: "Member",
    homeTown: "Canton, MI",
    timeWorked: "2023 - 2024",
    proPic: SejalPic
  },
  {
    name: "Aditya Sivathanu",
    role: "Member",
    homeTown: "West Lafayette, IN",
    timeWorked: "2023 - Present",
    proPic: AdityaPic
  },
  {
    name: "Leyton Bostre",
    role: "Member",
    homeTown: "Long Beach, CA",
    timeWorked: "2024",
    proPic: LeytonPic
  },
  {
    name: "Jiaqing Li (Jacqui)",
    role: "Member",
    homeTown: "Wuhan, China",
    timeWorked: "2024 - Present",
    proPic: JacquiPic
  },
  {
    name: "Toby Onyekwere",
    role: "Member",
    homeTown: "Nigeria",
    timeWorked: "2024",
    proPic: TobyPic
  },
  {
    name: "Rohan Nachnani",
    role: "Member",
    homeTown: "Bangalore, India",
    timeWorked: "2024",
    proPic: RohanPic
  },
  {
    name: "Rebecca Rupp",
    role: "Member",
    homeTown: "Houston, Texas",
    timeWorked: "2024 - Present",
    proPic: RebeccaPic
  },
  {
    name: "Jennifer Yu",
    role: "Member",
    homeTown: "West Lafayette, IN",
    timeWorked: "2024",
    proPic: JenniferPic
  },
  {
    name: "Kevin Chang",
    role: "Member",
    homeTown: "West Lafayette, IN",
    timeWorked: "2024 - Present",
    proPic: KevinChang
  }
];

export const About = observer(function About() {
  return (
    <div className="whole_page">
      <TSCOnlineHeader />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          marginBottom: "1vh"
        }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            width: "50%"
          }}>
          <Typography style={{ fontSize: 48, marginBottom: "1vh" }}>About</Typography>
          <Typography style={{ fontSize: 22, marginBottom: "3vh" }}>
            TimeScale Creator Online enables you to explore and create charts of any portion of the geologic time scale
            from an extensive suite of global and regional events in Earth History. The internal database suite
            encompasses over 20,000 biologic, geomagnetic, sea-level, stable isotope, and other events.
          </Typography>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            width: "90%",
            flexWrap: "wrap"
          }}>
          {members.map(function (member) {
            return (
              <AboutCard
                key={member.name}
                name={member.name}
                role={member.role}
                homeTown={member.homeTown}
                timeWorked={member.timeWorked}
                proPic={member.proPic}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});
