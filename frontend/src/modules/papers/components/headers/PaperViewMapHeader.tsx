import React from "react";
import { RouteComponentProps, withRouter } from "react-router";

import { PaperData } from "backend/src/types/papers";

import { makeStyles, createStyles, Theme } from "@material-ui/core/styles";
import {
  Container,
  Toolbar,
  AppBar,
  Typography,
  IconButton
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";

interface OwnProps {
  paper: PaperData;
  title: string;
}

type Props = RouteComponentProps & OwnProps;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: {
      flexGrow: 1
    },
    toolbar: {
      paddingLeft: 0,
      paddingRight: 0
    },
    backButton: {
      marginRight: theme.spacing(2)
    }
  })
);

const Header: React.FC<Props> = props => {
  const classes = useStyles();

  const { paper, title } = props;
  const { name } = paper;

  return (
    <AppBar position="sticky" color="primary">
      <Container fixed maxWidth="md">
        <Toolbar className={classes.toolbar}>
          <IconButton
            edge="start"
            className={classes.backButton}
            color="inherit"
            aria-label="go back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1" className={classes.title}>
            {name}
          </Typography>
          <Typography variant="body1" component="p">
            Map Documents
          </Typography>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default withRouter(Header);
