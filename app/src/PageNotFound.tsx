import styles from "./PageNotFound.module.css";
import logo from "./assets/TSCreatorLogo.png";
export const PageNotFound = () => {
  return (
    <div className={styles.container}>
      <img src={logo} alt="logo" className={styles.logo} />
      <h1>404 Page Not Found</h1>
      <span>Sorry, the page you are looking for could not be found.</span>
      <span>
        Click <a href="/">here</a> to go back to the home page.
      </span>
    </div>
  );
};
