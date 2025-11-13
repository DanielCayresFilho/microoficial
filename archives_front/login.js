import React, { useState, useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import { versionSystem } from "../../../package.json";
import { i18n } from "../../translate/i18n";
import { nomeEmpresa } from "../../../package.json";
import { AuthContext } from "../../context/Auth/AuthContext";
import logo from "../../assets/logo.png";
import LogoHorizontal from "../../assets/LogoHorizontal.png";
import vendLogo from "../../assets/vendLogo.png";
import MicrosoftIcon from "../../assets/microsoft-icon.png";
import {
  Paper,
  DialogTitle
} from "@material-ui/core";


const Copyright = () => {
	return (
		<Typography variant="body2" color="primary" align="center">
			{"Copyright "}
 			<Link color="primary" href="#">
 				{ nomeEmpresa } - v { versionSystem }
 			</Link>{" "}
 			{new Date().getFullYear()}
 			{"."}
 		</Typography>
 	);
 };

const useStyles = makeStyles(theme => ({
	root: {
		width: "100vw",
		height: "100vh",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center"
	},
	paper: {
		backgroundColor: theme.palette.login, //DARK MODE PLW DESIGN//
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
		padding: "55px 30px",
		borderRadius: "12.5px",
		width: "700px"
	},
	avatar: {
		margin: theme.spacing(1),  
		backgroundColor: theme.palette.secondary.main,
	},
	form: {
		width: "360px", // Fix IE 11 issue.
		marginTop: theme.spacing(1),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
		height: "45px !important",
    color: "#fff",
    '&:hover':{
      backgroundColor: "#00d31d"
    }
	},
	powered: {
		color: "white"
	},
	login: {
		maxWidth: "100%",
		display: "flex",
		justifyContent: "center",
		padding: "0 !important",
    flexDirection: "row-reverse"
	},
  microsoftButton: {
    margin: theme.spacing(2, 0, 2),
    height: "45px !important",
    backgroundColor: theme.palette.primary.main,
    color: "white",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
  },
  microsoftIcon: {
    width: "24px",
    height: "24px",
    marginRight: "8px",
  },
  rightPaper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "50%",
    backgroundColor: 'hsla(188, 100%, 41%, 1)',
    backgroundImage: `
      radial-gradient(at 40% 20%, hsla(226, 99%, 50%, 1) 0px, transparent 50%),
      radial-gradient(at 80% 0%, rgb(8, 38, 136) 0px, transparent 50%),
      radial-gradient(at 0% 50%, hsla(226, 99%, 50%, 1) 0px, transparent 50%),
      radial-gradient(at 80% 50%, hsla(226, 99%, 70%, 1) 0px, transparent 50%),
      radial-gradient(at 0% 100%, rgb(5, 18, 62) 0px, transparent 50%),
      radial-gradient(at 80% 100%, hsla(184, 18%, 96%, 1) 0px, transparent 50%),
      radial-gradient(at 0% 0%, hsla(226, 99%, 50%, 1) 0px, transparent 50%)
    `,
  },
  leftPaper: {
    width: "50%",
    display: "flex",
    flexFlow: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh"
  },
  img: {
    width: 150
  },
  frase: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    color: "#fff",
    '& p':{
      fontSize: 60,
      fontWeight: "900"
    }
  },
  loginMsg: {
    color: "#333333",
    fontWeight: "900",
    '& h2': {
      color: "#333333",
      fontWeight: "900 !important",
      fontSize: 36
    }
  },
  smallText: {
    fontSize: 12,
    color: "#999999",
    fontWeight: "300"
  },
  imgHorizontal: {
    width: 120,
    marginTop: 48,
  },
  vendLogo: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 100
  }
}));

const Login = () => {
  const classes = useStyles();
  const [user, setUser] = useState({ email: "", password: "" });
  const { handleLogin } = useContext(AuthContext);

  const handleChangeInput = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin(user);
  };

  const handleMicrosoftLogin = () => {
    window.location.href = `${process.env.REACT_APP_BACKEND_URL}/auth/microsoft`; // URL do backend para autenticação Microsoft
  };

  return (
    <div className={classes.root}>
       <Container component="main" maxWidth="xs" className={classes.login}>
        <CssBaseline />
          <Paper className={classes.rightPaper}>
            <div className={classes.frase}>
              <Typography>Transformando</Typography>
              <Typography>Vidas</Typography>
              <Typography>Negócios</Typography>
              <Typography>& Comunidades.</Typography>
              <img
                className={classes.vendLogo}
                src={vendLogo}
                alt="logo-horizontal"
              />
            </div>
          </Paper>
          <Paper className={classes.leftPaper}>
            <img
              className={classes.img}
              src={logo}
              alt="logo"
            />
            <div className={classes.loginMsg}>
              <DialogTitle style={{paddingBottom: 0}}>
                {i18n.t("Bem Vindo!")}
              </DialogTitle>
              <Typography className={classes.smallText} >Bem vindo de volta, insira suas credenciais.</Typography>
            </div>

            <form className={classes.form} noValidate onSubmit={handleSubmit}>
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="email"
                label={i18n.t("login.form.email")}
                name="email"
                value={user.email}
                onChange={handleChangeInput}
                autoComplete="email"
                autoFocus
                InputLabelProps={{
                  required: false 
                }}
              />
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                name="password"
                label={i18n.t("login.form.password")}
                type="password"
                id="password"
                value={user.password}
                onChange={handleChangeInput}
                autoComplete="current-password"
                InputLabelProps={{
                  required: false 
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                className={classes.submit}
              >
                {i18n.t("login.buttons.submit")}
              </Button>

              <Button
                fullWidth
                variant="contained"
                className={classes.microsoftButton}
                onClick={handleMicrosoftLogin}
              >
                <img
                  src={MicrosoftIcon}
                  alt="Microsoft Logo"
                  className={classes.microsoftIcon}
                />
                Login com Microsoft
              </Button>
            </form>
            <div className={classes.imgHorizontalWrapper}>
              <img
                className={classes.imgHorizontal}
                src={LogoHorizontal}
                alt="logo-horizontal"
              />
            </div>

          </Paper>
      </Container>
    </div>
  );
};

export default Login;