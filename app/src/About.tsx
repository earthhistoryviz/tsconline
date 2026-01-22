import { observer } from "mobx-react-lite";
import { Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { TSCIcon } from "./components";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import { AboutCard } from "./components/AboutCard";
import { useTranslation } from "react-i18next";
import "./About.css";

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
    proPic: "AaronAult.jpg"
  },
  {
    name: "Paolo Gumasing",
    role: "Team Lead",
    homeTown: "Lafayette, IN",
    timeWorked: "2023 - 2025",
    proPic: "PaoloGumasing.jpeg"
  },
  {
    name: "Ellis Selznick",
    role: "Team Lead",
    homeTown: "Tucson, AZ",
    timeWorked: "2024 - Present",
    proPic: "EllisSelznick.jpg"
  },
  {
    name: "Jay Lee",
    role: "Member",
    homeTown: "Seoul, South Korea",
    timeWorked: "2023 - Present",
    proPic: "JayLee.png"
  },
  {
    name: "Sejal Kumar",
    role: "Member",
    homeTown: "Canton, MI",
    timeWorked: "2023 - 2024",
    proPic: "SejalKumar.jpg"
  },
  {
    name: "Aditya Sivathanu",
    role: "Member",
    homeTown: "West Lafayette, IN",
    timeWorked: "2023 - 2025",
    proPic: "AdityaSivathanu.jpg"
  },
  {
    name: "Leyton Bostre",
    role: "Member",
    homeTown: "Long Beach, CA",
    timeWorked: "2024 - 2025",
    proPic: "LeytonBostre.jpg"
  },
  {
    name: "Jiaqing Li (Jacqui)",
    role: "Member",
    homeTown: "Wuhan, China",
    timeWorked: "2024 - 2025",
    proPic: "JacquiLi.jpeg"
  },
  {
    name: "Toby Onyekwere",
    role: "Member",
    homeTown: "Nigeria",
    timeWorked: "2024",
    proPic: "TobyOnyekwere.png"
  },
  {
    name: "Rohan Nachnani",
    role: "Member",
    homeTown: "Bangalore, India",
    timeWorked: "2024",
    proPic: "RohanNachnani.jpg"
  },
  {
    name: "Rebecca Rupp",
    role: "Member",
    homeTown: "Houston, Texas",
    timeWorked: "2024",
    proPic: "RebeccaRupp.png"
  },
  {
    name: "Jennifer Yu",
    role: "Member",
    homeTown: "West Lafayette, IN",
    timeWorked: "2024",
    proPic: "JenniferYu.jpg"
  },
  {
    name: "Kevin Chang",
    role: "Member",
    homeTown: "West Lafayette, IN",
    timeWorked: "2024 - 2025",
    proPic: "KevinChang.jpg"
  },
  {
    name: "Samyukta Balaji",
    role: "Member",
    homeTown: "Sacramento, California",
    timeWorked: "2024 - Present",
    proPic: "SamyuktaBalaji.png"
  },
  {
    name: "Michael Knaack",
    role: "Member",
    homeTown: "Denville, NJ",
    timeWorked: "2024",
    proPic: "MichaelPic.jpg"
  },
  {
    name: "Neel Patel",
    role: "Member",
    homeTown: "Hillsborough, NJ",
    timeWorked: "2025 - Present",
    proPic: "NeelPatel.jpg"
  }
];

export const About = observer(function About() {
  const { t } = useTranslation();
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
          <Typography style={{ fontSize: 48, marginBottom: "1vh" }}>{t("title.about")}</Typography>
          <Typography style={{ fontSize: 22, marginBottom: "3vh" }}>{t("about")}</Typography>
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
