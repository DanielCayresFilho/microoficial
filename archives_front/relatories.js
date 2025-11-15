"use client"

import React from "react"
import { useState, useEffect, useContext } from "react"
import { makeStyles } from "@material-ui/core/styles"
import Button from "@material-ui/core/Button"
import TextField from "@material-ui/core/TextField"
import { i18n } from "../../translate/i18n"
import MainContainer from "../../components/MainContainer"
import { AuthContext } from "../../context/Auth/AuthContext"
import api from "../../services/api"
import {
  Backdrop,
  Box,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Typography,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  CardActions,
} from "@material-ui/core"
import Papa from "papaparse"
import moment from "moment"
import toastError from "../../errors/toastError"
import Bluebird from "bluebird"
import { toast } from "react-toastify"
import useDashboard from "../../hooks/useDashboard"
import { isArray, isEmpty } from "lodash"
import HistoryModal from "../../components/HistoryModal"
import jsPDF from "jspdf"
import { FiFileText, FiMessageSquare, FiInfo, FiUsers } from "react-icons/fi"
import { BsFileSpreadsheet, BsChatDots } from "react-icons/bs"
import { Send } from "@material-ui/icons"

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
  cardTemplate: {
    "&::before": {
      backgroundColor: "#4caf50",
    },
  },
  cardCsv: {
    "&::before": {
      backgroundColor: "#2196f3",
    },
  },
  cardShooting: {
    "&::before": {
      backgroundColor: "#ff9800",
    },
  },
  cardHistory: {
    "&::before": {
      backgroundColor: "#9c27b0",
    },
  },

  cardHistory: {
    "&::before": {
      backgroundColor: "#red",
    },
  },
  cardTransaction: {
    "&::before": {
      backgroundColor: "#e53935",
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
  buttonTemplate: {
    backgroundColor: "#4caf50",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#388e3c",
    },
  },
  buttonCsv: {
    backgroundColor: "#2196f3",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#1976d2",
    },
  },
  buttonShooting: {
    backgroundColor: "#ff9800",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#f57c00",
    },
  },
  buttonHistory: {
    backgroundColor: "#9c27b0",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#7b1fa2",
    },
  },
  buttonTransaction: {
    backgroundColor: "#e53935",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#c62828",
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
  iconTemplate: {
    color: "#4caf50",
  },
  iconCsv: {
    color: "#2196f3",
  },
  iconShooting: {
    color: "#ff9800",
  },
  iconHistory: {
    color: "#9c27b0",
  },
  iconTransaction: {
    color: "#e53935",
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
  dialogTitle: {
    padding: theme.spacing(1.5, 2),
    backgroundColor: theme.palette.background.default,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  dialogContent: {
    padding: theme.spacing(2),
  },
  formControl: {
    marginBottom: theme.spacing(1.5),
  },
  dateRangeContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1.5),
  },
  dateField: {
    width: "48%",
  },
  dialogActions: {
    padding: theme.spacing(1, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
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
  dialogTitleTemplate: {
    backgroundColor: "#4caf50",
    color: "#fff",
  },
  dialogTitleCsv: {
    backgroundColor: "#2196f3",
    color: "#fff",
  },
  dialogTitleShooting: {
    backgroundColor: "#ff9800",
    color: "#fff",
  },
  dialogTitleHistory: {
    backgroundColor: "#9c27b0",
    color: "#fff",
  },
  dialogButton: {
    padding: theme.spacing(0.8, 2),
    borderRadius: 4,
    fontWeight: 500,
    textTransform: "none",
    fontSize: "0.9rem",
  },
  dialogButtonTemplate: {
    backgroundColor: "#4caf50",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#388e3c",
    },
  },
  dialogButtonCsv: {
    backgroundColor: "#2196f3",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#1976d2",
    },
  },
  dialogButtonShooting: {
    backgroundColor: "#ff9800",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#f57c00",
    },
  },
  dialogButtonHistory: {
    backgroundColor: "#9c27b0",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#7b1fa2",
    },
  },
  dialogButtonTransaction: {
    backgroundColor: "#e53935",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#c62828",
    },
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
  dialogPaperTemplate: {
    background: "linear-gradient(to bottom, #4caf50 0%, #4caf50 70px, #fff 70px, #fff 100%)",
  },
  dialogPaperCsv: {
    background: "linear-gradient(to bottom, #2196f3 0%, #2196f3 70px, #fff 70px, #fff 100%)",
  },
  dialogPaperShooting: {
    background: "linear-gradient(to bottom, #ff9800 0%, #ff9800 70px, #fff 70px, #fff 100%)",
  },
  dialogPaperHistory: {
    background: "linear-gradient(to bottom, #9c27b0 0%, #9c27b0 70px, #fff 70px, #fff 100%)",
  },
  dialogPaperTransaction: {
    background: "linear-gradient(to bottom, #e53935 0%, #e53935 70px, #fff 70px, #fff 100%)",
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
  const [openPopup, setOpenPopup] = useState(false)
  const [templates, setTemplates] = useState([])
  const [dateFrom, setDateFrom] = useState(moment("1", "D").format("YYYY-MM-DD"))
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"))
  const [selectedCompanyId, setSelectedCompanyId] = useState([])
  const [companies, setCompanies] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const { user } = useContext(AuthContext)
  const [openHistoryModal, setOpenHistoryModal] = useState(false)
  const [searchParam, setSearchParam] = useState("")
  const [openPopupMessages, setOpenPopupMessages] = useState(false)
  const [counters, setCounters] = useState({})
  const [attendants, setAttendants] = useState([])
  const [period, setPeriod] = useState(0)
  const [filterType, setFilterType] = useState(1)
  const [users, setUsers] = useState([])
  const { find } = useDashboard()
  const [loading, setLoading] = useState(false)
  const [whatsAppSessions, setWhatsAppSessions] = useState([])
  const [status, setStatus] = useState("")
  const [selectedOption, setSelectedOption] = useState("chatsUser")
  const [tickets, setTickets] = useState([])
  const [inputValue, setInputValue] = useState("")
  const [openTemplateModal, setOpenTemplateModal] = useState(false)
  const [openCSVModal, setOpenCSVModal] = useState(false)
  const [openShootingModal, setOpenShootingModal] = useState(false);
  const [openOperatorsModal, setOpenOperatorsModal] = useState(false);
  const [openConversationsModal, setOpenConversationsModal] = useState(false);
  const [reports, setReports] = useState([])

  const handleCloseShootingModal = () => setOpenShootingModal(false);

  const formatToBrazilTime = (dateString) => {
    const date = new Date(dateString)
    date.setHours(date.getHours())

    const formattedDate = date.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

    return formattedDate
  }

  const handleDownloadPDF = async (number) => {
    try {
      const response = await api.get(`/pdf/${number}`)

      const messages = response.data.messages
      const users = response.data.responseUsers

      if (!users[0]) {
        toastError("Não existe um ticket aberto ou fechado para este Número!")
        return
      }

      if (!Array.isArray(messages)) {
        toastError("Os dados de mensagens não estão no formato esperado.")
        return
      }

      if (messages.length === 0) {
        toastError("Nenhuma mensagem encontrada para este número.")
        return
      }

      const doc = new jsPDF()
      doc.setFontSize(12)
      doc.text(`Histórico de Mensagens - Número: ${number} | Atendente: ${users[0].name}`, 10, 10)
      doc.line(10, 15, 200, 15)

      let yPosition = 20
      const lineHeight = 10
      const pageHeight = 280

      messages.forEach((message, index) => {
        const author = message.contact?.name || users[0].name
        const content = message.body || "Sem conteúdo"
        const formattedDate = formatToBrazilTime(message.createdAt)

        const messageText = `${index + 1}. ${author}: ${content} - ${formattedDate}`

        const splitText = doc.splitTextToSize(messageText, 180)

        splitText.forEach((line) => {
          if (yPosition + lineHeight > pageHeight) {
            doc.addPage()
            yPosition = 10
          }
          doc.text(line, 10, yPosition)
          yPosition += lineHeight
        })
      })

      doc.save(`Histórico de Mensagens do Número:${number}.pdf`)
    } catch (err) {
      console.error("Erro ao gerar o PDF:", err)
      toastError("Erro ao gerar o PDF. Tente novamente.")
    }
  }

  const handleGenerateHistoryReport = async (number) => {
    try {
      setLoading(true)
      await handleDownloadPDF(number)
    } catch (error) {
      console.error("Error generating report:", error)
      toastError("Erro ao gerar relatório")
    } finally {
      setLoading(false)
      handleCloseHistoryModal()
    }
  }

  const handleGenerateHistoryCSV = async () => {
    setLoading(true)
    try {

      const campaignData = await api.get("/relatories/campaignReport", 
        {params: {
          companyIds: selectedCompanyId,
          dateTo: dateTo,
          dateFrom: dateFrom,

        }});

      const validCampaignData = campaignData.data;

      const campaignArray = validCampaignData.map(item => [
        item.carteira,
        item.campanha,
        item.importado,
        item.envio,
        item.entregue,
        item.dataCriacao,
        item.dataDeEnvio,
        item.status
      ]);
      

      const headers = ["Carteira", "Nome da Campanha", "Lista Importada", "Enviado", "Entregue", "Data de Criação", "Data do Envio", "Status da Campanha"]
      const csvContent = [headers, ...campaignArray];

      const csv = Papa.unparse(csvContent, {
        quotes: true,
        delimiter: ",",
      })

      const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(csvBlob)
      link.download = "RelatórioDisparos.csv"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Erro ao gerar CSV:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenHistoryModal = () => {
    setOpenHistoryModal(true)
  }

  const handleCloseHistoryModal = () => {
    setOpenHistoryModal(false)
  }

  const handleCompanyChange = (e) => {
    const selectedCompanies = e.target.value
    setSelectedCompanyId(selectedCompanies === "" ? null : selectedCompanies)
  }

  const [filteredData, setFilteredData] = useState({
    companies: [],
    whatsAppSessions: [],
    users: [],
    tickets: [],
  })

  useEffect(() => {
    setFilteredData({
      companies,
      whatsAppSessions,
      users,
      tickets,
    })
  }, [companies, whatsAppSessions, users, tickets])

  const handleOpenPopup = () => setOpenPopup(true)
  const handleClosePopup = () => setOpenPopup(false)

  const newDate = new Date()
  const date = newDate.getDate()
  const month = newDate.getMonth() + 1
  const year = newDate.getFullYear()
  const now = `${year}-${month < 10 ? `0${month}` : `${month}`}-${date < 10 ? `0${date}` : `${date}`}`

  var userQueueIds = []

  if (user.queues && user.queues.length > 0) {
    userQueueIds = user.queues.map((q) => q.id)
  }

  useEffect(() => {
    async function firstLoad() {
      await fetchData()
    }
    setTimeout(() => {
      firstLoad()
    }, 1000)
  }, [])



  const fetchCompanies = async () => {
    try {
      const endpoint = user?.companyId === 1 ? "/companies/list" : "/companies"
      const companiesResponse = await listCompanies(endpoint)

      if (Array.isArray(companiesResponse)) {
        setCompanies(companiesResponse)

      } else {
        toastError("Você não tem permissão a esse recurso", companiesResponse)
      }
    } catch (err) {
      setLoading(false)
      if (err.response && err.response.data && err.response.data.message) {
        toastError(err.response.data.message)
      } else {
        toastError(err);
      }
    }
  }

    useEffect(() => {
    if (user) {
      fetchCompanies()
    }
  }, [user]);

  const listCompanies = async (endpoint) => {
    try {
      const response = await api.get(endpoint)
      return response.data
    } catch (error) {
      return []
    }
  }

  async function fetchData() {
    setLoading(true)

    let params = {}

    if (period > 0) {
      params = {
        days: period,
      }
    }

    if (!isEmpty(dateFrom) && moment(dateFrom).isValid()) {
      params = {
        ...params,
        date_from: moment(dateFrom).format("YYYY-MM-DD"),
      }
    }

    if (!isEmpty(dateTo) && moment(dateTo).isValid()) {
      params = {
        ...params,
        date_to: moment(dateTo).format("YYYY-MM-DD"),
      }
    }

    if (Object.keys(params).length === 0) {
      toast.error("Parametrize o filtro")
      setLoading(false)
      return
    }

    const data = await find(params)

    setCounters(data.counters)
    if (isArray(data.attendants)) {
      setAttendants(data.attendants)
    } else {
      setAttendants([])
    }

    setLoading(false)
  }

  const downloadCSV = async () => {
    setLoading(true)

    try {
      const csvData = await api.get("/relatories/csvReport", 
        {params: {
          companyIds: selectedCompanyId,
          dateTo: dateTo,
          dateFrom: dateFrom,

        }});
      
      const validCsvData = csvData.data;

      let csvArray;

      if(validCsvData.length > 0){

        csvArray = validCsvData.map(item => [
          item.id,
          item.companyName,
          item.contactName,
          item.contactNumber,
          item.contactCPF,
          item.contract,
          item.operatorName,
          item.operatorCPF,
          item.tags,
          item.status,
          item.createdAt,
          item.updatedAt,
          item.enviado,
          item.confirmado,
          item.falha,
          item.readStatus,
          item.interaction
        ]);
    } else{
      csvArray = "";
    }

      const headers = [
        "Id",
        "Carteira",
        "Nome do Cliente",
        "Telefone",
        "CNPJ/CPF",
        "Contrato",
        "Nome do Operador",
        "CPF Operador",
        "Tabulação",
        "status",
        "Primeiro atendimento",
        "Último Atendimento",
        "Enviado",
        "Confirmado",
        "Falha",
        "Leitura",
        "Interação",
      ]

      const csvContent = [headers, ...csvArray];

      const csv = Papa.unparse(csvContent, {
        quotes: true,
        delimiter: ",",
      })

      const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(csvBlob)
      link.download = "Relatório.csv"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Erro ao gerar CSV:", error)
    } finally {
      setLoading(false)
    }
  }

	const downloadCSVTransaction = async () => {
		setLoading(true);

		try {
			const transactionData = await api.get("/relatories/transactionReport", 
        {params: {
          companyIds: selectedCompanyId,
          dateTo: dateTo,
          dateFrom: dateFrom,

        }});
      
      const validTransactionData = transactionData.data;

      let transactionArray;
      if(validTransactionData.length > 0){
        transactionArray = validTransactionData.map(item => [
          item.ticketId,
          item.origem,
          item.templateId,
          item.status,
          item.tabulacao,
          item.nome_template,
          item.mensagem_template,
          item.dispositivo_disparo,
          item.segmento_dispositivo,
          item.email_operador,
          item.data_de_disparo,
          item.dispositivo_recebido,
          item.contato,
          item.cpf_cnpj,
          item.contrato,
          item.enviado,
          item.confirmado,
          item.falha,
          item.leitura,
          item.interacao,
      ]);
    } else{
      transactionArray = "";
    }
      const headers = [
				"Id Ticket",
        "Origem", 
        "Id Template",
        "Status Ticket",
        "Tabulações", 
        "Nome Template", 
        "Mensagem Template", 
        "Dispositivo Disparo", 
        "Segmento do Dispositivo", 
        "Email Operador", 
        "Data de Disparo", 
        "Dispositivo Recebido",
        "Nome do Cliente",
        "CPF/CNPJ",
        "Contrato",
        "Enviado", 
        "Confirmado", 
        "Falha", 
        "Leitura", 
        "Interação"
			];

      const csvContent = [headers, ...transactionArray];

      const csv = Papa.unparse(csvContent, {
        quotes: true,
        delimiter: ",",
      })

      const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(csvBlob)
      link.download = "Dados_Transacionados.csv"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Erro ao gerar CSV:", error)
    } finally {
      setLoading(false)
    }
	};

  const handleGenerateReportTransaction = async () => {
    setLoading(true)
    try {
      if (selectedCompanyId) {
        const selectedCompany = companies.find((company) => company.id === selectedCompanyId)
        if (selectedCompany) {
          console.log("Empresa selecionada", selectedCompany)
        }
      }

      await downloadCSVTransaction();
    } catch (error) {
      console.error("Erro ao gerar relatório:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    setLoading(true)
    try {
      if (selectedCompanyId) {
        const selectedCompany = companies.find((company) => company.id === selectedCompanyId)
        if (selectedCompany) {
          console.log("Empresa selecionada", selectedCompany)
        }
      }

      await downloadCSV()
    } catch (error) {
      console.error("Erro ao gerar relatório:", error)
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    setFilteredData({
      companies,
    })
  }, [companies])

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

  const handleGenerateCSV = async () => {

    setLoading(true)
    try {
      const templateData = await api.get("/relatories/templateReport", 
        {params: {
          companyIds: selectedCompanyId,
          dateTo: dateTo,
          dateFrom: dateFrom,

        }});
      
      const validTemplateData = templateData.data;

      const templateArray = validTemplateData.map(item => [
        item.dt_solicitacao_envio,
        item.canal,
        item.fornecedor,
        item.nome_template,
        item.conteudo_disparo,
        item.carteira,
        item.whatsapp_saida,
        item.qtd_disparos,
        item.flag_enviado,
        item.flag_confirmado,
        item.flag_leitura,
        item.flag_falha,
        item.flag_interacao,
      ]);

      const headers = [
        "Data_de_solicitação_de_envio",
        "Canal",
        "Fornecedor",
        "Nome_do_Template",
        "Conteúdo_do_disparo_inicial",
        "Carteira",
        "Whatsapp_saida",
        "Qtd_Disparos",
        "Enviado",
        "Confirmado",
        "Leitura",
        "Falha",
        "Interação",
      ]

      const templateContent = [headers, ...templateArray];

      const csv = Papa.unparse(templateContent, {
        quotes: true,
        delimiter: ",",
      })

      const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(csvBlob)
      link.download = "Templates.csv"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Erro ao gerar CSV:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainContainer>
      <Box className={classes.mainContainer}>
        <Typography variant="h4" className={classes.pageTitle}>
          Central de Relatórios
        </Typography>

        <Box className={classes.cardsContainer}>
          <Grid container spacing={3} justifyContent="center" className={classes.gridContainer}>
            <Grid item xs={12} sm={6} md={4}>
              <Card className={`${classes.card} ${classes.cardTemplate}`}>
                <Tooltip title="Relatórios detalhados sobre templates e campanhas">
                  <IconButton className={classes.infoIcon} size="small">
                    <FiInfo />
                  </IconButton>
                </Tooltip>
                <CardContent className={classes.cardContent}>
                  <div className={classes.cardHeader}>
                    <FiFileText className={`${classes.cardIcon} ${classes.iconTemplate}`} />
                    <Typography variant="h5" className={classes.title}>
                      {i18n.t("mainDrawer.listItems.templates")}
                    </Typography>
                  </div>

                  <Typography className={classes.description}>
                    Gere relatórios detalhados sobre os templates utilizados nas campanhas e acompanhe o desempenho de
                    cada modelo.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={() => setOpenTemplateModal(true)}
                    className={`${classes.button} ${classes.buttonTemplate}`}
                    fullWidth
                  >
                    {i18n.t("Relatório De Template")}
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card className={`${classes.card} ${classes.cardCsv}`}>
                <Tooltip title="Exportação completa de dados em formato CSV">
                  <IconButton className={classes.infoIcon} size="small">
                    <FiInfo />
                  </IconButton>
                </Tooltip>
                <CardContent className={classes.cardContent}>
                  <div className={classes.cardHeader}>
                    <BsFileSpreadsheet className={`${classes.cardIcon} ${classes.iconCsv}`} />
                    <Typography variant="h5" className={classes.title}>
                      {i18n.t("mainDrawer.listItems.csv")}
                    </Typography>
                  </div>

                  <Typography className={classes.description}>
                    Gere relatórios CSV completos com dados detalhados de todas as carteiras ou de uma carteira
                    específica para análise avançada.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={() => setOpenCSVModal(true)}
                    className={`${classes.button} ${classes.buttonCsv}`}
                    fullWidth
                  >
                    {i18n.t("Relatório CSV")}
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card className={`${classes.card} ${classes.cardShooting}`}>
                <Tooltip title="Análise de disparos e métricas de entrega">
                  <IconButton className={classes.infoIcon} size="small">
                    <FiInfo />
                  </IconButton>
                </Tooltip>
                <CardContent className={classes.cardContent}>
                  <div className={classes.cardHeader}>
                    <Send className={`${classes.cardIcon} ${classes.iconShooting}`} />
                    <Typography variant="h5" className={classes.title}>
                      {i18n.t("mainDrawer.listItems.shooting")}
                    </Typography>
                  </div>

                  <Typography className={classes.description}>
                    Visualize e analise todos os disparos realizados com métricas detalhadas de desempenho e
                    estatísticas de entrega por campanha.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={() => setOpenShootingModal(true)}
                    className={`${classes.button} ${classes.buttonShooting}`}
                    fullWidth
                  >
                    {i18n.t("Relatório De Disparo")}
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={6} style={{display: "none"}}>
              <Card className={`${classes.card} ${classes.cardHistory}`}>
                <Tooltip title="Histórico completo de conversas em PDF">
                  <IconButton className={classes.infoIcon} size="small">
                    <FiInfo />
                  </IconButton>
                </Tooltip>
                <CardContent className={classes.cardContent}>
                  <div className={classes.cardHeader}>
                    <FiMessageSquare className={`${classes.cardIcon} ${classes.iconHistory}`} />
                    <Typography variant="h5" className={classes.title}>
                      {i18n.t("mainDrawer.listItems.history")}
                    </Typography>
                  </div>


                  <Typography className={classes.description}>
                    Gere PDFs com o histórico completo de conversas entre operadores e clientes para análise detalhada e
                    documentação oficial.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={handleOpenHistoryModal}
                    className={`${classes.button} ${classes.buttonHistory}`}
                    fullWidth
                  >
                    {i18n.t("Histórico de Conversas")}
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={6}>
              <Card className={`${classes.card} ${classes.cardTransaction}`}>
                <Tooltip title="Histórico de dados transacionados para templates">
                  <IconButton className={classes.infoIcon} size="small">
                    <FiInfo />
                  </IconButton>
                </Tooltip>
                <CardContent className={classes.cardContent}>
                  <div className={classes.cardHeader}>
                    <FiMessageSquare className={`${classes.cardIcon} ${classes.iconTransaction}`} />
                    <Typography variant="h5" className={classes.title}>
                      {i18n.t("Dados Transacionados")}
                    </Typography>
                  </div>

                  <Typography className={classes.description}>
                    Exporte dados detalhados de todas as transações de templates.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={handleOpenPopup}
                    className={`${classes.button} ${classes.buttonTransaction}`}
                    fullWidth
                  >
                    {i18n.t("Exportar Dados")}
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
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
                    Gere relatórios detalhados sobre a produtividade dos operadores, incluindo conversas atendidas, mensagens enviadas e taxa de resolução.
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

            <Grid item xs={12} sm={6} md={4}>
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
                    Exporte relatórios completos de conversas com informações detalhadas sobre clientes, operadores, tabulações e métricas de atendimento.
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

        {/* Template Modal */}
        <Dialog
          open={openTemplateModal}
          maxWidth="sm"
          classes={{
            paper: `${classes.dialogPaper} ${classes.dialogPaperTemplate}`,
          }}
        >
          <DialogTitle className={classes.dialogTitleColored}>Filtros</DialogTitle>
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

              {user.companyId === 1 && (
              <FormControl fullWidth size="small" className={classes.formControl}>
                <InputLabel>Carteiras</InputLabel>
                <Select
                  multiple
                  value={selectedCompanyId}
                  onChange={handleCompanyChange}
                  renderValue={(selected) =>
                    selected.map((id) => filteredData.companies.find((c) => c.id === id)?.name).join(", ")
                  }
                  label="Carteiras"
                >
                  {filteredData.companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      <Checkbox checked={selectedCompanyId.includes(company.id)} />
                      <ListItemText primary={company.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              )}
            </form>
          </DialogContent>

          <DialogActions className={classes.dialogActionsPadded}>
            <Button onClick={() => setOpenTemplateModal(false)} size="small">
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={loading}
              onClick={handleGenerateCSV}
              size="small"
              className={`${classes.dialogButton} ${classes.dialogButtonTemplate}`}
            >
              Gerar
            </Button>
          </DialogActions>

          <Backdrop className={classes.loadingBackdrop} open={loading}>
            <Box className={classes.loadingBox}>
              <CircularProgress size={40} style={{ color: "#4caf50" }} />
              <Typography className={classes.loadingText}>Gerando relatório...</Typography>
            </Box>
          </Backdrop>
        </Dialog>

        <Dialog
  open={openShootingModal}
  onClose={handleCloseShootingModal}
  maxWidth="sm"
  classes={{
    paper: `${classes.dialogPaper} ${classes.dialogPaperShooting}`,
  }}
>
  <DialogTitle className={classes.dialogTitleColored}>Relatório de Disparos</DialogTitle>
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

      {user.companyId === 1 && (
      <FormControl fullWidth size="small" className={classes.formControl}>
        <InputLabel>Carteiras</InputLabel>
        <Select
          multiple
          value={selectedCompanyId}
          onChange={handleCompanyChange}
          renderValue={(selected) => selected.map((id) => companies.find((c) => c.id === id)?.name).join(", ")}
          label="Carteiras"
        >
          {companies.map((company) => (
            <MenuItem key={company.id} value={company.id}>
              <Checkbox checked={selectedCompanyId.includes(company.id)} />
              <ListItemText primary={company.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      )}
    </form>
  </DialogContent>

  <DialogActions className={classes.dialogActionsPadded}>
    <Button onClick={handleCloseShootingModal} size="small">
      Cancelar
    </Button>
    <Button
      variant="contained"
      disabled={loading}
      onClick={handleGenerateHistoryCSV}
      size="small"
      className={`${classes.dialogButton} ${classes.dialogButtonShooting}`}
    >
      Gerar
    </Button>
  </DialogActions>

  <Backdrop className={classes.loadingBackdrop} open={loading}>
    <Box className={classes.loadingBox}>
      <CircularProgress size={40} style={{ color: "#ff9800" }} />
      <Typography className={classes.loadingText}>Gerando relatório...</Typography>
    </Box>
  </Backdrop>
</Dialog>

        {/* CSV Modal */}
        <Dialog
          open={openCSVModal}
          maxWidth="sm"
          classes={{
            paper: `${classes.dialogPaper} ${classes.dialogPaperCsv}`,
          }}
        >
          <DialogTitle className={classes.dialogTitleColored}>Filtros</DialogTitle>
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

              {user.companyId === 1 && (
              <FormControl fullWidth size="small" className={classes.formControl}>
                <InputLabel>Carteiras</InputLabel>
                <Select
                  multiple
                  value={selectedCompanyId}
                  onChange={handleCompanyChange}
                  renderValue={(selected) => selected.map((id) => companies.find((c) => c.id === id)?.name).join(", ")}
                  label="Carteiras"
                >
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      <Checkbox checked={selectedCompanyId.includes(company.id)} />
                      <ListItemText primary={company.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              )}
            </form>
          </DialogContent>

          <DialogActions className={classes.dialogActionsPadded}>
            <Button onClick={() => setOpenCSVModal(false)} size="small">
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={loading}
              onClick={handleGenerateReport}
              size="small"
              className={`${classes.dialogButton} ${classes.dialogButtonCsv}`}
            >
              Gerar
            </Button>
          </DialogActions>

          <Backdrop className={classes.loadingBackdrop} open={loading}>
            <Box className={classes.loadingBox}>
              <CircularProgress size={40} style={{ color: "#2196f3" }} />
              <Typography className={classes.loadingText}>Gerando relatório...</Typography>
            </Box>
          </Backdrop>
        </Dialog>

        {/* Shooting Modal */}
        <Dialog
          open={openPopup}
          onClose={handleClosePopup}
          maxWidth="sm"
          classes={{
            paper: `${classes.dialogPaper} ${classes.dialogPaperShooting}`,
          }}
        >
          <DialogTitle className={classes.dialogTitleColored}>Filtros</DialogTitle>
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
              
              {user.companyId === 1 && (
              <FormControl fullWidth size="small" className={classes.formControl}>
                <InputLabel>Carteiras</InputLabel>
                <Select
                  multiple
                  value={selectedCompanyId}
                  onChange={handleCompanyChange}
                  renderValue={(selected) => selected.map((id) => companies.find((c) => c.id === id)?.name).join(", ")}
                  label="Carteiras"
                >
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      <Checkbox checked={selectedCompanyId.includes(company.id)} />
                      <ListItemText primary={company.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              )}
            </form>
          </DialogContent>

          <DialogActions className={classes.dialogActionsPadded}>
            <Button onClick={handleClosePopup} size="small">
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={loading}
              onClick={handleGenerateHistoryCSV}
              size="small"
              className={`${classes.dialogButton} ${classes.dialogButtonShooting}`}
            >
              Gerar
            </Button>
          </DialogActions>

          <Backdrop className={classes.loadingBackdrop} open={loading}>
            <Box className={classes.loadingBox}>
              <CircularProgress size={40} style={{ color: "#ff9800" }} />
              <Typography className={classes.loadingText}>Gerando relatório...</Typography>
            </Box>
          </Backdrop>
        </Dialog>

        <Dialog
          open={openPopup}
          onClose={handleClosePopup}
          maxWidth="sm"
          classes={{
            paper: `${classes.dialogPaper} ${classes.dialogPaperTransaction}`,
          }}
        >
          <DialogTitle className={classes.dialogTitleColored}>Filtros de Dados Transacionados</DialogTitle>
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
              
              {user.companyId === 1 && (
              <FormControl fullWidth size="small" className={classes.formControl}>
                <InputLabel>Carteiras</InputLabel>
                <Select
                  multiple
                  value={selectedCompanyId}
                  onChange={handleCompanyChange}
                  renderValue={(selected) => selected.map((id) => companies.find((c) => c.id === id)?.name).join(", ")}
                  label="Carteiras"
                >
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      <Checkbox checked={selectedCompanyId.includes(company.id)} />
                      <ListItemText primary={company.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              )}
            </form>
          </DialogContent>

          <DialogActions className={classes.dialogActionsPadded}>
            <Button onClick={handleClosePopup} size="small">
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={loading}
              onClick={handleGenerateReportTransaction}
              size="small"
              className={`${classes.dialogButton} ${classes.dialogButtonTransaction}`}
            >
              Exportar
            </Button>
          </DialogActions>

          <Backdrop className={classes.loadingBackdrop} open={loading}>
            <Box className={classes.loadingBox}>
              <CircularProgress size={40} style={{ color: "#e53935" }} />
              <Typography className={classes.loadingText}>Processando dados...</Typography>
            </Box>
          </Backdrop>
        </Dialog>

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

        <HistoryModal
          open={openHistoryModal}
          onClose={handleCloseHistoryModal}
          onGenerateReport={handleGenerateHistoryReport}
          loading={loading}
        />
      </Box>
    </MainContainer>
  )
}

export default Relatories