"use client"

import React from "react"
import { useState } from "react"
import { makeStyles } from "@material-ui/core/styles"
import Button from "@material-ui/core/Button"
import TextField from "@material-ui/core/TextField"
import MainContainer from "../../components/MainContainer"
import api from "../../services/api"
import {
  Backdrop,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Typography,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  CardActions,
} from "@material-ui/core"
import Papa from "papaparse"
import moment from "moment"
import { toast } from "react-toastify"
import { FiInfo, FiUsers } from "react-icons/fi"
import { BsChatDots } from "react-icons/bs"

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    padding: theme.spacing(4),
    backgroundColor: "#f5f7fa",
    minHeight: "calc(100vh - 64px)",
  },
  pageTitle: {
    width: "100%",
    marginBottom: theme.spacing(4),
    textAlign: "left",
    color: theme.palette.primary.dark,
    fontWeight: 600,
    fontSize: "1.8rem",
  },
  cardsContainer: {
    marginBottom: theme.spacing(4),
  },
  card: {
    width: "100%",
    height: "100%",
    minHeight: 280, // Increased from 200 to make cards taller
    maxWidth: "90%", // Added to make cards less wide
    margin: "auto",
    padding: theme.spacing(3),
    borderRadius: 8,
    backgroundColor: "#fff",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "transform 0.2s, box-shadow 0.2s",
    position: "relative",
    overflow: "hidden",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
    },
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "3px",
      backgroundColor: theme.palette.primary.main,
    },
  },
  cardOperators: {
    "&::before": {
      backgroundColor: "#00bcd4",
    },
  },
  cardConversations: {
    "&::before": {
      backgroundColor: "#3f51b5",
    },
  },
  title: {
    fontWeight: 600,
    marginBottom: theme.spacing(2),
    color: theme.palette.primary.main,
    fontSize: "1.3rem",
  },
  description: {
    fontSize: "0.9rem",
    marginBottom: theme.spacing(3),
    color: theme.palette.text.secondary,
    flexGrow: 1,
  },
  button: {
    padding: theme.spacing(0.8, 2),
    borderRadius: 4,
    fontWeight: 500,
    textTransform: "none",
    fontSize: "0.9rem",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
    transition: "all 0.2s",
    "&:hover": {
      boxShadow: "0 3px 6px rgba(0, 0, 0, 0.12)",
    },
  },
  buttonOperators: {
    backgroundColor: "#00bcd4",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#0097a7",
    },
  },
  buttonConversations: {
    backgroundColor: "#3f51b5",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#303f9f",
    },
  },
  cardIcon: {
    fontSize: 36,
    marginBottom: theme.spacing(1.5),
    color: theme.palette.primary.main,
  },
  iconOperators: {
    color: "#00bcd4",
  },
  iconConversations: {
    color: "#3f51b5",
  },
  cardHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: theme.spacing(1.5),
  },
  cardContent: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  infoIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    color: theme.palette.text.secondary,
    fontSize: "0.9rem",
  },
  dateRangeContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1.5),
  },
  dateField: {
    width: "48%",
  },
  loadingBackdrop: {
    zIndex: 2000,
    color: "#fff",
  },
  loadingBox: {
    padding: theme.spacing(3),
    backgroundColor: "#fff",
    borderRadius: 4,
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: theme.spacing(1.5),
    color: theme.palette.text.primary,
    fontSize: "0.9rem",
  },
  dialogButton: {
    padding: theme.spacing(0.8, 2),
    borderRadius: 4,
    fontWeight: 500,
    textTransform: "none",
    fontSize: "0.9rem",
  },
  dialogButtonOperators: {
    backgroundColor: "#00bcd4",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#0097a7",
    },
  },
  dialogButtonConversations: {
    backgroundColor: "#3f51b5",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#303f9f",
    },
  },
  dialogPaper: {
    overflow: "hidden",
  },
  dialogPaperOperators: {
    background: "linear-gradient(to bottom, #00bcd4 0%, #00bcd4 70px, #fff 70px, #fff 100%)",
  },
  dialogPaperConversations: {
    background: "linear-gradient(to bottom, #3f51b5 0%, #3f51b5 70px, #fff 70px, #fff 100%)",
  },
  dialogTitleColored: {
    color: "#fff",
    padding: theme.spacing(2),
    "& h2": {
      fontWeight: 500,
    },
  },
  dialogContentPadded: {
    paddingTop: theme.spacing(3),
  },
  dialogActionsPadded: {
    padding: theme.spacing(2),
  },
  gridContainer: {
    display: "flex",
    justifyContent: "center",
  },
}))

const Relatories = () => {
  const classes = useStyles()
  const [dateFrom, setDateFrom] = useState(moment("1", "D").format("YYYY-MM-DD"))
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"))
  const [loading, setLoading] = useState(false)
  const [openOperatorsModal, setOpenOperatorsModal] = useState(false)
  const [openConversationsModal, setOpenConversationsModal] = useState(false)


  const handleGenerateOperatorsCSV = async () => {
    setLoading(true)
    try {
      const response = await api.get("/reports/operators", {
        params: {
          dateFrom: dateFrom,
          dateTo: dateTo,
        }
      });

      const operatorsData = response.data;

      if (!operatorsData || operatorsData.length === 0) {
        toast.info("Nenhum dado encontrado para o período selecionado");
        setLoading(false);
        return;
      }

      const operatorsArray = operatorsData.map(item => [
        item.operatorName,
        item.operatorEmail,
        item.totalConversations,
        item.openConversations,
        item.closedConversations,
        item.totalMessages,
        item.conversationsWithCpc,
      ]);

      const headers = [
        "Nome do Operador",
        "Email",
        "Total de Conversas",
        "Conversas Abertas",
        "Conversas Fechadas",
        "Total de Mensagens",
        "Conversas com CPC",
      ];

      const csvContent = [headers, ...operatorsArray];

      const csv = Papa.unparse(csvContent, {
        quotes: true,
        delimiter: ",",
      });

      const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(csvBlob);
      link.download = "Relatório_Operadores.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar CSV:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoading(false);
      setOpenOperatorsModal(false);
    }
  };

  const handleGenerateConversationsCSV = async () => {
    setLoading(true)
    try {
      const response = await api.get("/reports/conversations", {
        params: {
          dateFrom: dateFrom,
          dateTo: dateTo,
        }
      });

      const conversationsData = response.data;

      if (!conversationsData || conversationsData.length === 0) {
        toast.info("Nenhum dado encontrado para o período selecionado");
        setLoading(false);
        return;
      }

      const conversationsArray = conversationsData.map(item => [
        item.conversationId,
        item.customerName,
        item.customerPhone,
        item.customerContract,
        item.customerCpf,
        item.operatorName,
        item.operatorEmail,
        item.status,
        item.tabulationName,
        item.totalMessages,
        item.inboundMessages,
        item.outboundMessages,
        item.cpcMarked,
        moment(item.createdAt).format("DD/MM/YYYY HH:mm"),
        item.closedAt ? moment(item.closedAt).format("DD/MM/YYYY HH:mm") : "N/A",
        item.notes || "N/A",
      ]);

      const headers = [
        "ID Conversa",
        "Nome Cliente",
        "Telefone",
        "Contrato",
        "CPF",
        "Operador",
        "Email Operador",
        "Status",
        "Tabulação",
        "Total Mensagens",
        "Mensagens Recebidas",
        "Mensagens Enviadas",
        "CPC Marcado",
        "Data Abertura",
        "Data Fechamento",
        "Observações",
      ];

      const csvContent = [headers, ...conversationsArray];

      const csv = Papa.unparse(csvContent, {
        quotes: true,
        delimiter: ",",
      });

      const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(csvBlob);
      link.download = "Relatório_Conversas.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar CSV:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoading(false);
      setOpenConversationsModal(false);
    }
  };

  return (
    <MainContainer>
      <Box className={classes.mainContainer}>
        <Typography variant="h4" className={classes.pageTitle}>
          Central de Relatórios
        </Typography>

        <Box className={classes.cardsContainer}>
          <Grid container spacing={3} justifyContent="center" className={classes.gridContainer}>
            <Grid item xs={12} sm={6} md={6}>
              <Card className={`${classes.card} ${classes.cardOperators}`}>
                <Tooltip title="Relatório de produtividade e desempenho dos operadores">
                  <IconButton className={classes.infoIcon} size="small">
                    <FiInfo />
                  </IconButton>
                </Tooltip>
                <CardContent className={classes.cardContent}>
                  <div className={classes.cardHeader}>
                    <FiUsers className={`${classes.cardIcon} ${classes.iconOperators}`} />
                    <Typography variant="h5" className={classes.title}>
                      Relatório de Operadores
                    </Typography>
                  </div>

                  <Typography className={classes.description}>
                    Gere relatórios detalhados sobre a produtividade dos operadores, incluindo conversas atendidas, 
                    mensagens enviadas e taxa de resolução. Os dados são permanentes no banco de dados PostgreSQL 
                    e você pode gerar relatórios de qualquer período histórico.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={() => setOpenOperatorsModal(true)}
                    className={`${classes.button} ${classes.buttonOperators}`}
                    fullWidth
                  >
                    Gerar Relatório
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={6}>
              <Card className={`${classes.card} ${classes.cardConversations}`}>
                <Tooltip title="Relatório detalhado de todas as conversas e interações">
                  <IconButton className={classes.infoIcon} size="small">
                    <FiInfo />
                  </IconButton>
                </Tooltip>
                <CardContent className={classes.cardContent}>
                  <div className={classes.cardHeader}>
                    <BsChatDots className={`${classes.cardIcon} ${classes.iconConversations}`} />
                    <Typography variant="h5" className={classes.title}>
                      Relatório de Conversas
                    </Typography>
                  </div>

                  <Typography className={classes.description}>
                    Exporte relatórios completos de conversas com informações detalhadas sobre clientes, operadores, 
                    tabulações e métricas de atendimento. Dados permanentes no banco com histórico completo de todas 
                    as conversas realizadas.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={() => setOpenConversationsModal(true)}
                    className={`${classes.button} ${classes.buttonConversations}`}
                    fullWidth
                  >
                    Gerar Relatório
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Operators Report Modal */}
        <Dialog
          open={openOperatorsModal}
          onClose={() => setOpenOperatorsModal(false)}
          maxWidth="sm"
          classes={{
            paper: `${classes.dialogPaper} ${classes.dialogPaperOperators}`,
          }}
        >
          <DialogTitle className={classes.dialogTitleColored}>Relatório de Operadores</DialogTitle>
          <DialogContent className={classes.dialogContentPadded}>
            <form>
              <Box className={classes.dateRangeContainer}>
                <TextField
                  label="De"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  className={classes.dateField}
                  size="small"
                />
                <TextField
                  label="Até"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  className={classes.dateField}
                  size="small"
                />
              </Box>
            </form>
          </DialogContent>

          <DialogActions className={classes.dialogActionsPadded}>
            <Button onClick={() => setOpenOperatorsModal(false)} size="small">
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={loading}
              onClick={handleGenerateOperatorsCSV}
              size="small"
              className={`${classes.dialogButton} ${classes.dialogButtonOperators}`}
            >
              Gerar
            </Button>
          </DialogActions>

          <Backdrop className={classes.loadingBackdrop} open={loading}>
            <Box className={classes.loadingBox}>
              <CircularProgress size={40} style={{ color: "#00bcd4" }} />
              <Typography className={classes.loadingText}>Gerando relatório...</Typography>
            </Box>
          </Backdrop>
        </Dialog>

        {/* Conversations Report Modal */}
        <Dialog
          open={openConversationsModal}
          onClose={() => setOpenConversationsModal(false)}
          maxWidth="sm"
          classes={{
            paper: `${classes.dialogPaper} ${classes.dialogPaperConversations}`,
          }}
        >
          <DialogTitle className={classes.dialogTitleColored}>Relatório de Conversas</DialogTitle>
          <DialogContent className={classes.dialogContentPadded}>
            <form>
              <Box className={classes.dateRangeContainer}>
                <TextField
                  label="De"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  className={classes.dateField}
                  size="small"
                />
                <TextField
                  label="Até"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  className={classes.dateField}
                  size="small"
                />
              </Box>
            </form>
          </DialogContent>

          <DialogActions className={classes.dialogActionsPadded}>
            <Button onClick={() => setOpenConversationsModal(false)} size="small">
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={loading}
              onClick={handleGenerateConversationsCSV}
              size="small"
              className={`${classes.dialogButton} ${classes.dialogButtonConversations}`}
            >
              Gerar
            </Button>
          </DialogActions>

          <Backdrop className={classes.loadingBackdrop} open={loading}>
            <Box className={classes.loadingBox}>
              <CircularProgress size={40} style={{ color: "#3f51b5" }} />
              <Typography className={classes.loadingText}>Gerando relatório...</Typography>
            </Box>
          </Backdrop>
        </Dialog>
      </Box>
    </MainContainer>
  )
}

export default Relatories