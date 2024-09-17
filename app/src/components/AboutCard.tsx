import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";

type AboutCardProps = {
  name: string;
  role: string;
  homeTown: string;
  timeWorked: string;
  proPic: string | undefined;
};
const serverURL = `${import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000"}/public/aboutPictures`;
export const AboutCard = ({
  name,
  role,
  homeTown,
  timeWorked,
  proPic = `${serverURL}/defaultpropic.jpg`
}: AboutCardProps) => {
  return (
    <Card
      sx={{
        minWidth: 330,
        bgcolor: "secondaryBackground.main",
        boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
        marginLeft: ".5vw",
        marginRight: ".5vw",
        marginTop: ".5vw",
        marginBottom: ".5vw"
      }}>
      <CardMedia sx={{ height: 250 }} image={`${serverURL}/${proPic}`} title={name} />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          {name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {role}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {homeTown}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {timeWorked}
        </Typography>
      </CardContent>
    </Card>
  );
};
