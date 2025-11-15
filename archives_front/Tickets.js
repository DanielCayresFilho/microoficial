import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  Avatar,
} from "@material-ui/core";
import MenuItem from "@material-ui/core/MenuItem";
import { makeStyles } from "@material-ui/core/styles";
import RefreshIcon from "@material-ui/icons/Refresh";
import SendIcon from "@material-ui/icons/Send";
import CloseIcon from "@material-ui/icons/CheckCircleOutline";
import AssignmentIndIcon from "@material-ui/icons/AssignmentInd";
import MessageIcon from "@material-ui/icons/Message";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import InsertEmoticonIcon from "@material-ui/icons/InsertEmoticon";
import MicIcon from "@material-ui/icons/Mic";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import SearchIcon from "@material-ui/icons/Search";
import DoneIcon from "@material-ui/icons/Done";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import { format } from "date-fns";
import io from "socket.io-client";
import {
  whatsappMicroservice,
  getActiveMicroserviceApiKey,
} from "../Connections/microserviceApi";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";
import { SocketContext } from "../../context/Socket/SocketContext";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative",
  },
  // Header do chat - estilo WhatsApp
  chatHeader: {
    height: 60,
    backgroundColor: theme.palette.type === 'dark' ? "#202c33" : "#f0f2f5",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    zIndex: 100,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    backgroundColor: theme.palette.type === 'dark' ? "#6a7175" : "#dfe5e7",
    color: "#ffffff",
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 500,
    color: theme.palette.type === 'dark' ? "#e9edef" : "#111b21",
    lineHeight: "21px",
  },
  headerStatus: {
    fontSize: 13,
    color: theme.palette.type === 'dark' ? "#8696a0" : "#667781",
    lineHeight: "19px",
  },
  headerActions: {
    display: "flex",
    gap: 10,
  },
  headerIconButton: {
    color: theme.palette.type === 'dark' ? "#aebac1" : "#54656f",
    padding: 8,
  },
  // Container principal com 2 painéis
  mainContainer: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
    position: "relative",
  },
  // Área do chat
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  // Lista de mensagens - estilo WhatsApp
  messageList: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "20px 0",
    backgroundColor: theme.palette.type === 'dark' ? "#0a1014" : "#efeae2",
    position: "relative",
    "&::-webkit-scrollbar": {
      width: 6,
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      background: theme.palette.type === 'dark' ? "#374045" : "#cccccc",
    },
  },
  // Container de mensagem
  messageRow: {
    display: "flex",
    padding: "2px 0",
    paddingLeft: "9%",
    paddingRight: "9%",
    "&.inbound": {
      justifyContent: "flex-start",
    },
    "&.outbound": {
      justifyContent: "flex-end",
    },
  },
  // Balão de mensagem - estilo WhatsApp
  messageBubble: {
    position: "relative",
    maxWidth: "65%",
    borderRadius: 8,
    padding: "8px 12px",
    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    "&.inbound": {
      backgroundColor: theme.palette.type === 'dark' ? "#202c33" : "#ffffff",
      borderTopLeftRadius: 0,
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: -8,
        width: 0,
        height: 0,
        borderStyle: "solid",
        borderWidth: "0 8px 10px 0",
        borderColor: `transparent ${theme.palette.type === 'dark' ? "#202c33" : "#ffffff"} transparent transparent`,
      },
    },
    "&.outbound": {
      backgroundColor: theme.palette.type === 'dark' ? "#005c4b" : "#d9fdd3",
      borderTopRightRadius: 0,
      "&::after": {
        content: '""',
        position: "absolute",
        top: 0,
        right: -8,
        width: 0,
        height: 0,
        borderStyle: "solid",
        borderWidth: "0 0 10px 8px",
        borderColor: `transparent transparent transparent ${theme.palette.type === 'dark' ? "#005c4b" : "#d9fdd3"}`,
      },
    },
  },
  messageText: {
    fontSize: 14.2,
    lineHeight: "19px",
    color: theme.palette.type === 'dark' ? "#e9edef" : "#111b21",
    margin: 0,
    wordBreak: "break-word",
  },
  messageTime: {
    fontSize: 11,
    color: theme.palette.type === 'dark' ? "#8696a0" : "#667781",
    marginLeft: 4,
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
  },
  messageStatus: {
    width: 16,
    height: 11,
    color: theme.palette.type === 'dark' ? "#53bdeb" : "#53bdeb",
  },
  // Barra de input - estilo WhatsApp
  inputBar: {
    backgroundColor: theme.palette.type === 'dark' ? "#202c33" : "#f0f2f5",
    padding: "10px 16px",
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    borderTop: theme.palette.type === 'dark' ? "1px solid #2a3942" : "1px solid #e9edef",
  },
  inputContainer: {
    flex: 1,
    backgroundColor: theme.palette.type === 'dark' ? "#2a3942" : "#ffffff",
    borderRadius: 25,
    display: "flex",
    alignItems: "flex-end",
    padding: "5px 14px",
  },
  messageInput: {
    flex: 1,
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    resize: "none",
    fontFamily: "inherit",
    fontSize: 15,
    lineHeight: "20px",
    maxHeight: 100,
    overflowY: "auto",
    color: theme.palette.type === 'dark' ? "#e9edef" : "#3b4a54",
    "&::placeholder": {
      color: theme.palette.type === 'dark' ? "#8696a0" : "#667781",
    },
  },
  inputIconButton: {
    color: theme.palette.type === 'dark' ? "#8696a0" : "#54656f",
    padding: 8,
  },
  sendButton: {
    backgroundColor: theme.palette.type === 'dark' ? "#005c4b" : "#00a884",
    color: "#ffffff",
    padding: 10,
    "&:hover": {
      backgroundColor: theme.palette.type === 'dark' ? "#06846b" : "#00a884",
    },
  },
  // Painel direito - Informações
  infoPanel: {
    width: 380,
    backgroundColor: theme.palette.type === 'dark' ? "#1a2329" : "#f0f2f5",
    borderLeft: theme.palette.type === 'dark' ? "1px solid #3b4a54" : "1px solid #e9edef",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  infoPanelHeader: {
    backgroundColor: theme.palette.type === 'dark' ? "#232d36" : "#ffffff",
    padding: "20px",
    textAlign: "center",
    borderBottom: theme.palette.type === 'dark' ? "1px solid #3b4a54" : "1px solid #e9edef",
  },
  infoPanelAvatar: {
    width: 80,
    height: 80,
    margin: "0 auto 16px",
    backgroundColor: theme.palette.type === 'dark' ? "#00a884" : "#dfe5e7",
    color: "#ffffff",
    fontSize: 36,
  },
  infoPanelSection: {
    backgroundColor: theme.palette.type === 'dark' ? "#232d36" : "#ffffff",
    marginBottom: 10,
    padding: "14px 20px",
    borderRadius: 8,
    border: theme.palette.type === 'dark' ? "1px solid #3b4a54" : "none",
  },
  infoPanelLabel: {
    fontSize: 14,
    color: theme.palette.type === 'dark' ? "#aebac1" : "#00a884",
    marginBottom: 8,
  },
  infoPanelValue: {
    fontSize: 16,
    color: theme.palette.type === 'dark' ? "#e9edef" : "#111b21",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    // Títulos das seções do painel direito:
    // "Dados do Cliente", "Status CPC" e "Encerrar Conversa"
    color: theme.palette.type === 'dark' ? "#00d9a6" : "#00a884",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Estados vazios
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.type === 'dark' ? "#667781" : "#54656f",
    padding: 40,
    textAlign: "center",
  },
  // Indicador de online/offline
  presenceChip: {
    backgroundColor: theme.palette.type === 'dark' ? "#00d9a6" : "#00a884",
    color: theme.palette.type === 'dark' ? "#111b21" : "#ffffff",
    fontSize: 12,
    fontWeight: 600,
  },
  // Formulário
  formField: {
    marginBottom: 16,
    "& .MuiOutlinedInput-root": {
      // Fundo dos inputs (Nome, Contrato, CPF, Tabulação, Observações)
      backgroundColor: theme.palette.type === 'dark' ? "#1a2329" : "#ffffff",
      borderRadius: 8,
      "& fieldset": {
        // Borda padrão dos campos
        borderColor: theme.palette.type === 'dark' ? "#3b4a54" : "#e9edef",
        borderWidth: 1.5,
      },
      "&:hover fieldset": {
        // Borda ao passar o mouse
        borderColor: theme.palette.type === 'dark' ? "#00d9a6" : "#00a884",
      },
      "&.Mui-focused fieldset": {
        // Borda em foco (verde WhatsApp)
        borderColor: theme.palette.type === 'dark' ? "#00d9a6" : "#00a884",
        borderWidth: 2,
      },
    },
    // Campos de texto (valores digitados) de "Nome", "Contrato" e "CPF"
    "& input": {
      color: theme.palette.type === 'dark' ? "#e9edef" : "#111b21",
      backgroundColor: theme.palette.type === 'dark' ? "#1a2329" : "#ffffff",
    },
    "& textarea": {
      color: theme.palette.type === 'dark' ? "#e9edef" : "#111b21",
      backgroundColor: theme.palette.type === 'dark' ? "#1a2329" : "#ffffff",
    },
    // Labels "Nome", "Contrato" e "CPF"
    "& label": {
      color: (props) => (props.type === 'dark' ? "#aebac1" : "#667781"),
      backgroundColor: "transparent",
      fontWeight: 500,
    },
    "& label.Mui-focused": {
      color: theme.palette.type === 'dark' ? "#00d9a6" : "#00a884",
    },
    "& .MuiFormHelperText-root": {
      color: theme.palette.type === 'dark' ? "#8696a0" : "#667781",
    },
  },
  // Label externo para campos
  fieldLabel: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 8,
    color: theme.palette.type === 'dark' ? "#e9edef" : "#111b21",
    display: "block",
  },
  // Banner de erro/bloqueio
  warningBanner: {
    margin: "0 16px 10px",
    padding: "12px 16px",
    backgroundColor: theme.palette.type === 'dark' ? "#3a2f1a" : "#fff5e6",
    borderRadius: 8,
    border: theme.palette.type === 'dark' ? "1px solid #665a3d" : "1px solid #ffd79c",
  },
  warningText: {
    fontSize: 13,
    color: theme.palette.type === 'dark' ? "#ffcb77" : "#8b6914",
  },
}));

const DEFAULT_SOCKET_URL = "https://vend.covenos.com.br";

const resolveSocketBaseUrl = () => {
  const envUrl =
    process.env.REACT_APP_WHATSAPP_SOCKET_URL ||
    process.env.NEXT_PUBLIC_WHATSAPP_SOCKET_URL ||
    process.env.WHATSAPP_SOCKET_URL ||
    process.env.REACT_APP_WHATSAPP_API_BASE_URL ||
    process.env.NEXT_PUBLIC_WHATSAPP_API_BASE_URL ||
    process.env.WHATSAPP_API_BASE_URL;

  if (!envUrl) {
    return DEFAULT_SOCKET_URL;
  }

  try {
    const parsed = new URL(envUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    const normalized = envUrl.replace(/\/$/, "");
    if (normalized.endsWith("/api")) {
      const trimmed = normalized.slice(0, -4);
      return trimmed || DEFAULT_SOCKET_URL;
    }
    return normalized || DEFAULT_SOCKET_URL;
  }
};

const SOCKET_BASE_URL = resolveSocketBaseUrl();
const SOCKET_HOST_SIGNATURE = SOCKET_BASE_URL.replace(/^https?:\/\//, "").toLowerCase();
const GLOBAL_SOCKET_KEY = "__vendOfficialMicroserviceSocket";

const WHATSAPP_LIGHT_BG =
  'url("https://web.whatsapp.com/img/bg-chat-tile_3b737797b77b7508b49a99446d6ac11d.png")';
const WHATSAPP_DARK_BG =
  'url("https://web.whatsapp.com/img/bg-chat-tile-dark_e534b4729b044c2b27a26ddfd4e52ca5.png")';

const isSocketPointingToMicroservice = (socket) => {
  if (!socket || !socket.io) {
    return false;
  }

  const references = [
    socket.io?.opts?.hostname,
    socket.io?.opts?.host,
    socket.io?.opts?.forceBaseUrl,
    socket.io?.uri,
    socket.nsp,
    socket.io?.engine?.hostname,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return references.some((value) => value.includes(SOCKET_HOST_SIGNATURE));
};

const formatDateTime = (value) => {
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm:ss");
  } catch (error) {
    return "Data inválida";
  }
};

const formatMessageTime = (value) => {
  try {
    return format(new Date(value), "HH:mm");
  } catch (error) {
    return "";
  }
};

const formatCpf = (value) => {
  if (!value) {
    return "";
  }

  const digits = String(value).replace(/\D/g, "");
  if (digits.length !== 11) {
    return value;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const useOptionalConversationId = () => {
  try {
    const params = useParams();
    return params?.conversationId;
  } catch (error) {
    return undefined;
  }
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const Tickets = ({
  conversationId: conversationIdProp,
  darkMode = false,
  onCustomerProfileSaved,
  onConversationClosed,
}) => {
  const classes = useStyles({ type: darkMode ? 'dark' : 'light' });
  const conversationIdFromRoute = useOptionalConversationId();
  const conversationId = conversationIdProp ?? conversationIdFromRoute;
  const { user } = useContext(AuthContext);
  const socketManager = useContext(SocketContext);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  const resolveFromStorage = (key) => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(key);
  };

  const rawCompanyId =
    user?.companyId ??
    (() => {
      const stored = resolveFromStorage("companyId");
      return stored ? Number(stored) : null;
    })();

  const rawUserId =
    user?.operatorId ??
    user?.id ??
    resolveFromStorage("operatorId") ??
    resolveFromStorage("userId");

  const operatorId = rawUserId ? String(rawUserId) : null;
  const companyId = rawCompanyId ?? null;

  const [isOnline, setIsOnline] = useState(false);
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [presenceInfo, setPresenceInfo] = useState(null);

  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const [selectedTabulation, setSelectedTabulation] = useState("");
  const [tabulations, setTabulations] = useState([]);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    contract: "",
    cpf: "",
  });
  const [isSavingCustomerProfile, setIsSavingCustomerProfile] = useState(false);
  const [customerFormDirty, setCustomerFormDirty] = useState(false);
  const heartbeatRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const eligibilityTimeoutRef = useRef(null);
  const [fallbackSocket, setFallbackSocket] = useState(null);
  const [cpcLoading, setCpcLoading] = useState(false);

  const companySocket = useMemo(() => {
    if (!socketManager || typeof socketManager.getSocket !== "function") {
      return null;
    }
    return companyId ? socketManager.getSocket(companyId) : socketManager.getSocket();
  }, [socketManager, companyId]);

  useEffect(() => {
    if (companySocket && isSocketPointingToMicroservice(companySocket)) {
      setFallbackSocket(null);
      return;
    }

    if (typeof window === "undefined") {
      return undefined;
    }

    const existing = window[GLOBAL_SOCKET_KEY];
    if (existing && isSocketPointingToMicroservice(existing)) {
      setFallbackSocket(existing);
      return () => {};
    }

    const apiKey = getActiveMicroserviceApiKey();
    const socket = io(SOCKET_BASE_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      auth: apiKey ? { apiKey } : undefined,
      query: apiKey ? { apiKey } : undefined,
    });

    if (typeof window !== "undefined") {
      window[GLOBAL_SOCKET_KEY] = socket;
    }
    setFallbackSocket(socket);

    return () => {
      if (
        typeof window !== "undefined" &&
        window[GLOBAL_SOCKET_KEY] === socket &&
        socket.disconnected
      ) {
        delete window[GLOBAL_SOCKET_KEY];
      }
    };
  }, [companySocket]);

  const activeSocket = useMemo(() => {
    if (companySocket && isSocketPointingToMicroservice(companySocket)) {
      return companySocket;
    }
    return fallbackSocket;
  }, [companySocket, fallbackSocket]);

  const parseDate = useCallback((value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  const eligibility = conversation?.eligibility ?? null;
  const manualBlockedUntil = parseDate(eligibility?.blockedUntil);
  const cpcMarkedAt = parseDate(conversation?.cpcMarkedAt);
  const canSendMessage =
    eligibility?.canSend === undefined ? true : Boolean(eligibility?.canSend);
  const manualAttemptsCount = eligibility?.attemptsCount ?? 0;
  const manualAttemptsLimit = eligibility?.attemptsLimit ?? 2;
  const manualLimitReached = Boolean(eligibility?.limitReached);
  const isBlockedByTime = Boolean(eligibility?.isBlockedByTime);
  const lastMessageFromCustomer = Boolean(eligibility?.lastMessageFromCustomer);
  const hasCpc = Boolean(cpcMarkedAt);
  const canSaveCustomerProfile =
    Boolean(conversationId) && customerFormDirty && !isSavingCustomerProfile;

  const getBlockedMessage = useCallback(() => {
    if (!eligibility || canSendMessage) {
      return null;
    }

    if (lastMessageFromCustomer) {
      return "Aguarde o cliente responder. Caso não responda em até 3 horas, você poderá enviar uma nova mensagem.";
    }

    if (isBlockedByTime && manualBlockedUntil) {
      const now = new Date();
      const hoursUntil = Math.ceil((manualBlockedUntil.getTime() - now.getTime()) / (1000 * 60 * 60));
      if (hoursUntil > 0) {
        return `Aguarde o cliente responder. Caso não responda em até ${hoursUntil} hora(s), você poderá enviar uma nova mensagem.`;
      }
    }

    if (manualLimitReached) {
      return "Você já atingiu o limite de repescagens. Aguarde o cliente responder para poder enviar novas mensagens. Caso não responda em até 3 horas, você poderá tentar novamente.";
    }

    return "Não é possível enviar mensagem no momento. Aguarde o cliente responder ou tente novamente mais tarde.";
  }, [eligibility, canSendMessage, lastMessageFromCustomer, isBlockedByTime, manualBlockedUntil, manualLimitReached]);

  const blockedMessage = getBlockedMessage();

  const scrollToBottom = useCallback(() => {
    const node = messagesEndRef.current;
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, []);

  const previousMessagesCountRef = useRef(0);
  
  useEffect(() => {
    const currentMessagesCount = conversation?.messages?.length || 0;
    const previousCount = previousMessagesCountRef.current;
    
    if (currentMessagesCount > previousCount) {
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
    
    previousMessagesCountRef.current = currentMessagesCount;
  }, [conversation?.messages?.length, scrollToBottom]);
  
  useEffect(() => {
    if (conversation && conversation.messages && conversation.messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [conversationId, scrollToBottom]);

  const fetchConversation = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await whatsappMicroservice.getConversationById(
        conversationId
      );
      
      if (data?.messages && Array.isArray(data.messages)) {
        data.messages = data.messages.map(msg => {
          if (msg.direction === "INBOUND" || msg.direction === "OUTBOUND") {
            return msg;
          }
          
          let inferredDirection = "INBOUND";
          
          if (msg.operatorId || msg.sentBy === operatorId || msg.from === operatorId) {
            inferredDirection = "OUTBOUND";
          }
          else if (msg.from && data.customerPhone && msg.from.includes(data.customerPhone.replace(/\D/g, ''))) {
            inferredDirection = "INBOUND";
          }
          else if (msg.status === "SENT" || msg.status === "READ" || msg.status === "DELIVERED") {
            inferredDirection = "OUTBOUND";
          }
          
          return {
            ...msg,
            direction: inferredDirection
          };
        });
      }
      
      setConversation(data);
    } catch (err) {
      const message =
        err?.message ||
        err?.error ||
        "Não foi possível carregar a conversa.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [conversationId, operatorId]);

  const fetchEligibility = useCallback(async () => {
    if (!conversationId) return;

    try {
      const eligibilityData = await whatsappMicroservice.getConversationEligibility(conversationId);
      setConversation((previous) => {
        if (!previous || previous.id !== conversationId) {
          return previous;
        }
        return {
          ...previous,
          eligibility: eligibilityData,
        };
      });
    } catch (err) {
      console.warn("Falha ao buscar elegibilidade:", err?.message || err);
    }
  }, [conversationId]);

  const scheduleFetchEligibility = useCallback(
    (delay = 500) => {
      if (!conversationId) {
        return;
      }

      if (eligibilityTimeoutRef.current) {
        clearTimeout(eligibilityTimeoutRef.current);
      }

      const timeout = setTimeout(() => {
        fetchEligibility();
        eligibilityTimeoutRef.current = null;
      }, delay);

      eligibilityTimeoutRef.current = timeout;
    },
    [conversationId, fetchEligibility]
  );

  const fetchTabulations = useCallback(async () => {
    try {
      const data = await whatsappMicroservice.getTabulations();
      setTabulations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Falha ao buscar tabulações:", err);
    }
  }, []);

  useEffect(() => {
    fetchConversation();
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (eligibilityTimeoutRef.current) {
        clearTimeout(eligibilityTimeoutRef.current);
      }
    };
  }, [fetchConversation]);

  useEffect(() => {
    fetchTabulations();
  }, [fetchTabulations]);

  useEffect(() => {
    if (!conversation) {
      setCustomerForm({
        name: "",
        contract: "",
        cpf: "",
      });
      setCustomerFormDirty(false);
      return;
    }

    setCustomerForm({
      name:
        conversation.customerProfile?.name ??
        conversation.customerName ??
        "",
      contract:
        conversation.customerProfile?.contract ??
        conversation.customerContract ??
        "",
      cpf:
        conversation.customerProfile?.cpf ??
        conversation.customerCpf ??
        "",
    });
    setCustomerFormDirty(false);
  }, [conversation?.id, conversation?.customerProfile, conversation]);

  const sortedMessages = useMemo(() => {
    if (!conversation?.messages || !Array.isArray(conversation.messages)) {
      return [];
    }
    
    return [...conversation.messages].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      
      if (timeA === timeB) {
        const idA = a.id || a.wamid || "";
        const idB = b.id || b.wamid || "";
        return idA.localeCompare(idB);
      }
      
      return timeA - timeB;
    });
  }, [conversation?.messages]);

  const handleCustomerFieldChange = (field) => (event) => {
    const value = event?.target?.value ?? "";
    setCustomerForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setCustomerFormDirty(true);
  };

  const handleSaveCustomerProfile = async (event) => {
    if (event) {
      event.preventDefault();
    }

    if (!conversationId) {
      return;
    }

    setIsSavingCustomerProfile(true);
    try {
      const payload = {
        name: customerForm.name?.trim() || undefined,
        contract: customerForm.contract?.trim() || undefined,
        cpf: customerForm.cpf?.trim() || undefined,
      };
      const updated = await whatsappMicroservice.updateConversationCustomerProfile(
        conversationId,
        payload
      );
      setConversation(updated);
      if (typeof onCustomerProfileSaved === "function") {
        onCustomerProfileSaved(updated);
      }
      toast.success("Dados do cliente atualizados.");
      setCustomerFormDirty(false);
    } catch (err) {
      const message =
        err?.message ||
        err?.error ||
        "Não foi possível salvar os dados do cliente.";
      toast.error(message);
    } finally {
      setIsSavingCustomerProfile(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId) {
      return;
    }

    if (!operatorId) {
      toast.error("Identificador do operador não encontrado.");
      return;
    }

    const messageToSend = messageText.trim();
    setSending(true);
    setError(null);

    setMessageText("");

    try {
      await whatsappMicroservice.sendConversationMessage(conversationId, {
        text: messageToSend,
        operatorId,
      });
      
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || 
                          "Não foi possível enviar a mensagem. Tente novamente.";
      
      toast.error(errorMessage);
      setError(errorMessage);
      setMessageText(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!conversationId || !selectedTabulation) {
      setError("Tabulação obrigatória para encerrar a conversa.");
      return;
    }

    setClosing(true);
    setError(null);

    try {
      await whatsappMicroservice.closeConversation(conversationId, {
        tabulationId: selectedTabulation,
        notes: closeNotes.trim() || undefined,
      });
      
      setConversation((previous) => {
        if (!previous || previous.id !== conversationId) {
          return previous;
        }
        return {
          ...previous,
          status: "CLOSED",
          tabulationId: selectedTabulation,
          notes: closeNotes.trim() || previous.notes,
          closedAt: new Date().toISOString(),
        };
      });
      
      if (typeof onConversationClosed === "function") {
        onConversationClosed(conversationId);
      }

      setCloseNotes("");
      setSelectedTabulation("");
      
    } catch (err) {
      const message =
        err?.message ||
        err?.error ||
        "Não foi possível encerrar a conversa. Verifique os dados informados.";
      setError(message);
    } finally {
      setClosing(false);
    }
  };

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const handleGoOffline = useCallback(async () => {
    if (!operatorId) {
      toast.error("Identificador do operador não encontrado.");
      return;
    }

    setPresenceLoading(true);
    try {
      await whatsappMicroservice.setOperatorOffline(operatorId);
      setIsOnline(false);
      setPresenceInfo(null);
      clearHeartbeat();
      if (activeSocket) {
        activeSocket.emit("operator:leave", { operatorId });
      }
      toast.info("Você está offline.");
    } catch (offlineError) {
      const message =
        offlineError?.message ||
        offlineError?.error ||
        "Não foi possível ficar offline. Tente novamente.";
      toast.error(message);
    } finally {
      setPresenceLoading(false);
    }
  }, [activeSocket, clearHeartbeat, operatorId]);

  const handleGoOnline = useCallback(async () => {
    if (!operatorId) {
      toast.error("Identificador do operador não encontrado.");
      return;
    }

    setPresenceLoading(true);
    try {
      const payload = {
        connectedUrl:
          typeof window !== "undefined" ? window.location.href : undefined,
        name: user?.name || user?.username || undefined,
        email: user?.email || undefined,
      };

      const presence =
        await whatsappMicroservice.setOperatorOnline(operatorId, payload);
      setIsOnline(true);
      setPresenceInfo(presence);
      const socketToUse = activeSocket;
      if (socketToUse) {
        const emitJoin = () => socketToUse.emit("operator:join", { operatorId });
        if (socketToUse.connected) {
          emitJoin();
        } else {
          socketToUse.once("connect", emitJoin);
        }
      }
      toast.success("Você está online e pronto para receber atendimentos.");
    } catch (onlineError) {
      const message =
        onlineError?.message ||
        onlineError?.error ||
        "Não foi possível ficar online. Verifique os dados informados.";
      toast.error(message);
    } finally {
      setPresenceLoading(false);
    }
  }, [activeSocket, operatorId, user]);

  const handleToggleCpc = useCallback(async () => {
    if (!conversationId || !operatorId) {
      toast.error("Não foi possível identificar a conversa ou o operador.");
      return;
    }

    setCpcLoading(true);
    try {
      await whatsappMicroservice.markConversationCpc(conversationId, {
        value: !hasCpc,
        operatorId,
      });
      
      setConversation((previous) => {
        if (!previous || previous.id !== conversationId) {
          return previous;
        }
        return {
          ...previous,
          cpcMarkedAt: !hasCpc ? new Date().toISOString() : null,
        };
      });
      
      toast.success(!hasCpc ? "Contato marcado como CPC." : "Contato removido de CPC.");
    } catch (toggleError) {
      const message =
        toggleError?.message ||
        toggleError?.error ||
        "Não foi possível atualizar o status de CPC.";
      toast.error(message);
    } finally {
      setCpcLoading(false);
    }
  }, [conversationId, hasCpc, operatorId]);

  useEffect(() => {
    if (!isOnline || !operatorId) {
      clearHeartbeat();
      return;
    }

    const sendHeartbeat = async () => {
      try {
        await whatsappMicroservice.sendOperatorHeartbeat(operatorId);
      } catch (heartbeatError) {
        clearHeartbeat();
        setIsOnline(false);
        setPresenceInfo(null);
        const message =
          heartbeatError?.message ||
          heartbeatError?.error ||
          "Conexão com o microserviço perdida. Fique online novamente.";
        toast.error(message);
      }
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 4 * 60 * 1000);
    heartbeatRef.current = interval;

    return () => {
      clearHeartbeat();
    };
  }, [clearHeartbeat, isOnline, operatorId]);

  useEffect(() => {
    if (!activeSocket || !operatorId || !isOnline) {
      return undefined;
    }

    const emitJoin = () => activeSocket.emit("operator:join", { operatorId });

    if (activeSocket.connected) {
      emitJoin();
    }

    activeSocket.on("connect", emitJoin);

    return () => {
      activeSocket.off("connect", emitJoin);
    };
  }, [activeSocket, isOnline, operatorId]);

  useEffect(() => {
    if (!activeSocket || !operatorId) {
      return undefined;
    }

    const handleDisconnect = () => {
      setIsOnline(false);
      setPresenceInfo(null);
      clearHeartbeat();
    };

    activeSocket.on("disconnect", handleDisconnect);

    return () => {
      activeSocket.off("disconnect", handleDisconnect);
    };
  }, [activeSocket, clearHeartbeat, operatorId]);

  useEffect(() => {
    if (!activeSocket || !conversationId) {
      return undefined;
    }

    const handleNewConversation = (payload) => {
      const { conversation: convoPayload, message } = payload ?? {};
      if (!convoPayload?.id) {
        return;
      }

      if (convoPayload.id !== conversationId) {
        return;
      }

      setConversation((previous) => {
        const baseConversation =
          previous && previous.id === convoPayload.id ? previous : convoPayload;
        const existingMessages = baseConversation?.messages ?? [];
        
        if (message) {
          const messageExists = existingMessages.some(
            (item) =>
              (item.id && message.id && item.id === message.id) ||
              (item.wamid && message.wamid && item.wamid === message.wamid)
          );

          if (!messageExists) {
            return {
              ...baseConversation,
              ...convoPayload,
              messages: [...existingMessages, message],
              lastMessageAt: message.timestamp ?? baseConversation?.lastMessageAt,
            };
          }
        }

        return {
          ...baseConversation,
          ...convoPayload,
        };
      });
    };

    const handleNewMessage = (payload) => {
      const { conversationId: msgConvId, message } = payload || {};
      
      if (!message || msgConvId !== conversationId) {
        return;
      }
      
      if (!message.direction || (message.direction !== "INBOUND" && message.direction !== "OUTBOUND")) {
        if (message.operatorId || payload?.operatorId) {
          message.direction = "OUTBOUND";
        } 
        else if (message.status === "SENT" || message.status === "DELIVERED" || message.status === "READ") {
          message.direction = "OUTBOUND";
        } 
        else {
          message.direction = "INBOUND";
        }
      }
      
      const isInboundMessage = message.direction === "INBOUND";
      
      const getTimestamp = (msg) => {
        if (!msg?.timestamp) return 0;
        const ts = new Date(msg.timestamp).getTime();
        return isNaN(ts) ? 0 : ts;
      };
      
      setConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev;
        
        const existingMessages = prev.messages || [];
        const messageTimestamp = getTimestamp(message);
        const messageText = message.content?.text?.trim();
        const messageDirection = message.direction;
        const messageId = message.id;
        const messageWamid = message.wamid;
        
        const isDuplicate = existingMessages.some(m => {
          if (messageId && m.id && m.id === messageId) return true;
          if (messageWamid && m.wamid && m.wamid === messageWamid) return true;
          return false;
        });
        
        if (isDuplicate) {
          return prev;
        }
        
        const messageWithDirection = {
          ...message,
          direction: messageDirection,
        };
        
        const updatedMessages = [...existingMessages, messageWithDirection];
        
        updatedMessages.sort((a, b) => {
          const timeA = getTimestamp(a);
          const timeB = getTimestamp(b);
          
          if (timeA !== timeB) {
            return timeA - timeB;
          }
          
          const idA = a.id || a.wamid || "";
          const idB = b.id || b.wamid || "";
          return idA.localeCompare(idB);
        });
        
        const updated = {
          ...prev,
          messages: updatedMessages,
          lastMessageAt: messageTimestamp > getTimestamp(prev) ? message.timestamp : prev.lastMessageAt,
        };
        
        if (isInboundMessage) {
          updated.lastCustomerMessageAt = message.timestamp;
          
          if (updated.eligibility) {
            updated.eligibility = {
              ...updated.eligibility,
              canSend: true,
              attemptsCount: 0,
              limitReached: false,
              isBlockedByTime: false,
              blockedUntil: null,
              windowStart: null,
              lastMessageFromCustomer: true,
              lastCustomerMessageAt: message.timestamp,
            };
          }
        } else {
          updated.lastAgentMessageAt = message.timestamp;
          
          if (updated.eligibility) {
            const currentAttempts = updated.eligibility.attemptsCount || 0;
            updated.eligibility = {
              ...updated.eligibility,
              attemptsCount: Math.min(currentAttempts + 1, updated.eligibility.attemptsLimit || 2),
              lastAgentMessageAt: message.timestamp,
              lastMessageFromCustomer: false,
            };
          }
        }
        
        return updated;
      });
      
      if (isInboundMessage) {
        scheduleFetchEligibility(800);
      }
    };

    const handleUnassigned = (payload) => {
      if (payload?.conversationId === conversationId) {
        setConversation((previous) => {
          if (!previous || previous.id !== conversationId) {
            return previous;
          }
          return {
            ...previous,
            operatorId: null,
            operator: null,
          };
        });
      }
    };

    const handleMessageStatusUpdate = (payload) => {
      const { conversationId: msgConvId, messageId, status, wamid } = payload || {};
      
      if (!msgConvId || (!messageId && !wamid) || !status || msgConvId !== conversationId) {
        return;
      }
      
      setConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev;
        
        const messages = prev.messages || [];
        const updatedMessages = messages.map(msg => {
          if ((messageId && msg.id === messageId) || 
              (wamid && msg.wamid === wamid) ||
              (messageId && msg.wamid === messageId) ||
              (wamid && msg.id === wamid)) {
            return { ...msg, status };
          }
          return msg;
        });
        
        return { ...prev, messages: updatedMessages };
      });
    };

    activeSocket.on("new_conversation", handleNewConversation);
    activeSocket.on("new_message", handleNewMessage);
    activeSocket.on("conversation:unassigned", handleUnassigned);
    activeSocket.on("message:status", handleMessageStatusUpdate);

    return () => {
      activeSocket.off("new_conversation", handleNewConversation);
      activeSocket.off("new_message", handleNewMessage);
      activeSocket.off("conversation:unassigned", handleUnassigned);
      activeSocket.off("message:status", handleMessageStatusUpdate);
    };
  }, [activeSocket, conversationId, scheduleFetchEligibility]);

  useEffect(() => {
    return () => {
      if (operatorId && isOnline) {
        clearHeartbeat();
        whatsappMicroservice
          .setOperatorOffline(operatorId)
          .catch((error) =>
            console.warn(
              "Falha ao encerrar sessão do operador durante desmontagem:",
              error?.message || error
            )
          );
        if (activeSocket) {
          activeSocket.emit("operator:leave", { operatorId });
        }
      }
    };
  }, [activeSocket, clearHeartbeat, isOnline, operatorId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessageStatus = (status) => {
    if (!status || status === "PENDING") {
      return <DoneIcon className={classes.messageStatus} style={{ color: darkMode ? "#8696a0" : "#96a3ab" }} />;
    }
    if (status === "SENT" || status === "DELIVERED") {
      return <DoneAllIcon className={classes.messageStatus} style={{ color: darkMode ? "#8696a0" : "#96a3ab" }} />;
    }
    if (status === "READ") {
      return <DoneAllIcon className={classes.messageStatus} style={{ color: "#53bdeb" }} />;
    }
    return null;
  };

  const renderMessages = () => {
    if (loading) {
      return (
        <Box className={classes.emptyState}>
          <CircularProgress size={40} style={{ color: darkMode ? "#8696a0" : "#00a884" }} />
          <Typography variant="body2" style={{ marginTop: 16 }}>
            Carregando mensagens...
          </Typography>
        </Box>
      );
    }

    if (!conversationId) {
      return (
        <Box className={classes.emptyState}>
          <MessageIcon fontSize="large" style={{ opacity: 0.3, fontSize: 100, marginBottom: 20 }} />
          <Typography variant="h6" gutterBottom>
            Vend - WhatsApp Oficial
          </Typography>
          <Typography variant="body2">
            Selecione uma conversa para começar
          </Typography>
        </Box>
      );
    }

    if (!sortedMessages.length) {
      return (
        <Box className={classes.emptyState}>
          <MessageIcon fontSize="large" style={{ opacity: 0.3, fontSize: 80, marginBottom: 20 }} />
          <Typography variant="body2">
            Sem mensagens nesta conversa
          </Typography>
        </Box>
      );
    }

    return (
      <Box 
        className={classes.messageList} 
        style={{
          backgroundColor: darkMode ? "#0a1014" : "#efeae2",
          backgroundImage: darkMode ? WHATSAPP_DARK_BG : WHATSAPP_LIGHT_BG,
          backgroundRepeat: "repeat",
          backgroundSize: "400px",
          backgroundAttachment: "fixed"
        }}
      >
        {sortedMessages.map((message, index) => {
          let isOutbound = false;
          
          if (message.direction === "OUTBOUND") {
            isOutbound = true;
          } else if (message.direction === "INBOUND") {
            isOutbound = false;
          } else {
            if (message.id?.startsWith("temp-")) {
              isOutbound = true;
            } 
            else if (message.operatorId) {
              isOutbound = true;
            }
            else if (message.status === "SENT" || message.status === "READ") {
              isOutbound = true;
            }
            else {
              isOutbound = false;
            }
          }
          
          const messageKey = message.id || message.wamid || `msg-${index}-${message.timestamp}`;
          
          return (
            <Box
              key={messageKey}
              className={`${classes.messageRow} ${isOutbound ? 'outbound' : 'inbound'}`}
            >
              <Box
                className={`${classes.messageBubble} ${isOutbound ? 'outbound' : 'inbound'}`}
                style={{
                  backgroundColor: isOutbound 
                    ? (darkMode ? "#005c4b" : "#d9fdd3")
                    : (darkMode ? "#202c33" : "#ffffff")
                }}
              >
                <Typography 
                  className={classes.messageText}
                  style={{
                    color: darkMode ? "#e9edef" : "#111b21"
                  }}
                >
                  {message.type === "text"
                    ? message.content?.text || "[Mensagem sem conteúdo]"
                    : `[${message.type}]`}
                </Typography>
                <Box display="flex" alignItems="center" justifyContent="flex-end" marginTop="4px">
                  <Typography 
                    className={classes.messageTime}
                    style={{
                      color: darkMode ? "#8696a0" : "#667781"
                    }}
                  >
                    {formatMessageTime(message.timestamp)}
                  </Typography>
                  {isOutbound && renderMessageStatus(message.status)}
                </Box>
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>
    );
  };

  if (!conversation) {
    return (
      <Box className={classes.root}>
        {renderMessages()}
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      <Box className={classes.mainContainer}>
        {/* Área do chat */}
        <Box className={classes.chatArea}>
          {/* Header do chat */}
          <Box className={classes.chatHeader} style={{
            backgroundColor: darkMode ? "#202c33" : "#f0f2f5"
          }}>
            <Avatar className={classes.headerAvatar}>
              {getInitials(conversation.customerName || conversation.customerPhone)}
            </Avatar>
            <Box className={classes.headerInfo}>
              <Typography className={classes.headerName} style={{
                color: darkMode ? "#e9edef" : "#111b21"
              }}>
                {conversation.customerName || conversation.customerPhone}
              </Typography>
              <Typography className={classes.headerStatus} style={{
                color: darkMode ? "#8696a0" : "#667781"
              }}>
                {conversation.customerPhone}
                {conversation.operator && ` • Atendido por ${conversation.operator.name}`}
              </Typography>
            </Box>
            <Box className={classes.headerActions}>
              <IconButton className={classes.headerIconButton} style={{
                color: darkMode ? "#aebac1" : "#54656f"
              }}>
                <SearchIcon />
              </IconButton>
              <IconButton 
                className={classes.headerIconButton}
                onClick={fetchConversation}
                style={{
                  color: darkMode ? "#aebac1" : "#54656f"
                }}
              >
                <RefreshIcon />
              </IconButton>
              <IconButton className={classes.headerIconButton} style={{
                color: darkMode ? "#aebac1" : "#54656f"
              }}>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Área de mensagens */}
          {renderMessages()}

          {/* Banner de bloqueio */}
          {!canSendMessage && blockedMessage && (
            <Box className={classes.warningBanner} style={{
              backgroundColor: darkMode ? "#3a2f1a" : "#fff5e6",
              border: darkMode ? "1px solid #665a3d" : "1px solid #ffd79c"
            }}>
              <Typography className={classes.warningText} style={{
                color: darkMode ? "#ffcb77" : "#8b6914"
              }}>
                {blockedMessage}
              </Typography>
            </Box>
          )}

          {/* Barra de input */}
          {conversation.status === "OPEN" && (
            <Box className={classes.inputBar} style={{
              backgroundColor: darkMode ? "#202c33" : "#f0f2f5",
              borderTop: darkMode ? "1px solid #2a3942" : "1px solid #e9edef"
            }}>
              <IconButton className={classes.inputIconButton} style={{
                color: darkMode ? "#8696a0" : "#54656f"
              }}>
                <InsertEmoticonIcon />
              </IconButton>
              <IconButton className={classes.inputIconButton} style={{
                color: darkMode ? "#8696a0" : "#54656f"
              }}>
                <AttachFileIcon />
              </IconButton>
              <Box className={classes.inputContainer} style={{
                backgroundColor: darkMode ? "#2a3942" : "#ffffff"
              }}>
                <textarea
                  ref={messageInputRef}
                  className={classes.messageInput}
                  placeholder="Digite uma mensagem"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending || !canSendMessage}
                  rows="1"
                  style={{
                    color: darkMode ? "#e9edef" : "#3b4a54"
                  }}
                />
              </Box>
              <IconButton 
                className={classes.sendButton}
                onClick={handleSendMessage}
                disabled={sending || !messageText.trim() || !canSendMessage}
                style={{
                  backgroundColor: darkMode ? "#005c4b" : "#00a884"
                }}
              >
                {messageText.trim() ? <SendIcon /> : <MicIcon />}
              </IconButton>
            </Box>
          )}
        </Box>

        {/* Painel direito - Informações */}
        <Box className={classes.infoPanel} style={{
          backgroundColor: darkMode ? "#1a2329" : "#f0f2f5",
          borderLeft: darkMode ? "1px solid #3b4a54" : "1px solid #e9edef"
        }}>
          <Box className={classes.infoPanelHeader} style={{
            backgroundColor: darkMode ? "#232d36" : "#ffffff",
            borderBottom: darkMode ? "1px solid #3b4a54" : "1px solid #e9edef"
          }}>
            <Avatar className={classes.infoPanelAvatar}>
              {getInitials(conversation.customerName || conversation.customerPhone)}
            </Avatar>
            <Typography variant="h6" style={{ 
              color: darkMode ? "#e9edef" : "#111b21",
              fontWeight: 600
            }}>
              {conversation.customerName || "Cliente"}
            </Typography>
            <Typography variant="body2" style={{ color: darkMode ? "#aebac1" : "#667781" }}>
              {conversation.customerPhone}
            </Typography>
          </Box>

          <Box style={{ padding: 20 }}>
            {/* Status Online/Offline */}
            <Box marginBottom={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
                <Chip
                  className={classes.presenceChip}
                  label={isOnline ? "🟢 Online" : "⚫ Offline"}
                  size="small"
                  style={{
                    backgroundColor: isOnline 
                      ? (darkMode ? "#00d9a6" : "#00a884") 
                      : (darkMode ? "#3b4a54" : "#667781"),
                    color: isOnline 
                      ? (darkMode ? "#111b21" : "#ffffff")
                      : "#ffffff",
                    fontWeight: 600,
                    padding: "4px 8px"
                  }}
                />
                <Button
                  variant={isOnline ? "outlined" : "contained"}
                  size="small"
                  onClick={isOnline ? handleGoOffline : handleGoOnline}
                  disabled={presenceLoading}
                  style={{
                    borderColor: isOnline ? (darkMode ? "#ff6b6b" : "#d32f2f") : (darkMode ? "#00d9a6" : "#00a884"),
                    borderWidth: 2,
                    color: isOnline 
                      ? (darkMode ? "#ff6b6b" : "#d32f2f") 
                      : (darkMode ? "#111b21" : "#ffffff"),
                    backgroundColor: isOnline
                      ? "transparent"
                      : (darkMode ? "#00d9a6" : "#00a884"),
                    boxShadow: isOnline
                      ? "none"
                      : (darkMode ? "0 2px 8px rgba(0, 217, 166, 0.35)" : "0 2px 8px rgba(0, 168, 132, 0.35)"),
                    fontWeight: 600
                  }}
                >
                  {presenceLoading
                    ? "Aguarde..."
                    : isOnline
                    ? "Ficar Offline"
                    : "Ficar Online"}
                </Button>
              </Box>
            </Box>

            <Divider style={{ backgroundColor: darkMode ? "#3b4a54" : "#e9edef", marginBottom: 20 }} />

            {/* Informações do cliente */}
            <Box className={classes.infoPanelSection} style={{
              backgroundColor: darkMode ? "#232d36" : "#ffffff",
              border: darkMode ? "1px solid #3b4a54" : "none"
            }}>
              <Typography className={classes.sectionTitle} style={{
                color: darkMode ? "#00d9a6" : "#00a884"
              }}>
                Dados do Cliente
              </Typography>
              <form onSubmit={handleSaveCustomerProfile}>
                <Box marginBottom={2}>
                  <Typography className={classes.fieldLabel} style={{
                    color: darkMode ? "#e9edef" : "#111b21"
                  }}>
                    Nome
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={customerForm.name}
                    onChange={handleCustomerFieldChange("name")}
                    disabled={isSavingCustomerProfile}
                    placeholder="Digite o nome do cliente"
                    InputProps={{
                      style: {
                        backgroundColor: darkMode ? "#1a2329" : "#ffffff",
                        color: darkMode ? "#e9edef" : "#111b21",
                      }
                    }}
                    className={classes.formField}
                  />
                </Box>
                <Box marginBottom={2}>
                  <Typography className={classes.fieldLabel} style={{
                    color: darkMode ? "#e9edef" : "#111b21"
                  }}>
                    Contrato
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={customerForm.contract}
                    onChange={handleCustomerFieldChange("contract")}
                    disabled={isSavingCustomerProfile}
                    placeholder="Digite o número do contrato"
                    InputProps={{
                      style: {
                        backgroundColor: darkMode ? "#1a2329" : "#ffffff",
                        color: darkMode ? "#e9edef" : "#111b21",
                      }
                    }}
                    className={classes.formField}
                  />
                </Box>
                <Box marginBottom={2}>
                  <Typography className={classes.fieldLabel} style={{
                    color: darkMode ? "#e9edef" : "#111b21"
                  }}>
                    CPF
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={customerForm.cpf}
                    onChange={handleCustomerFieldChange("cpf")}
                    disabled={isSavingCustomerProfile}
                    placeholder="Digite o CPF (somente números)"
                    helperText="Somente números"
                    InputProps={{
                      style: {
                        backgroundColor: darkMode ? "#1a2329" : "#ffffff",
                        color: darkMode ? "#e9edef" : "#111b21",
                      }
                    }}
                    FormHelperTextProps={{
                      style: {
                        color: darkMode ? "#8696a0" : "#667781",
                      }
                    }}
                    className={classes.formField}
                  />
                </Box>
                <Box display="flex" justifyContent="flex-end" marginTop={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!canSaveCustomerProfile}
                    size="small"
                    style={{
                      backgroundColor: darkMode ? "#00d9a6" : "#00a884",
                      color: darkMode ? "#111b21" : "#ffffff",
                      fontWeight: 600,
                      boxShadow: darkMode ? "0 2px 8px rgba(0, 217, 166, 0.35)" : "0 2px 8px rgba(0, 168, 132, 0.35)",
                      "&:hover": {
                        backgroundColor: darkMode ? "#00c494" : "#008f6f"
                      }
                    }}
                  >
                    {isSavingCustomerProfile ? "Salvando..." : "Salvar"}
                  </Button>
                </Box>
              </form>
            </Box>

            {/* CPC */}
            <Box className={classes.infoPanelSection} style={{
              backgroundColor: darkMode ? "#232d36" : "#ffffff",
              border: darkMode ? "1px solid #3b4a54" : "none"
            }}>
              <Typography className={classes.sectionTitle} style={{
                color: darkMode ? "#00d9a6" : "#00a884"
              }}>
                Status CPC
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" style={{ 
                  color: darkMode ? "#e9edef" : "#111b21",
                  fontWeight: 500
                }}>
                  {hasCpc ? "Marcado como CPC" : "Não é CPC"}
                </Typography>
                <Button
                  variant={hasCpc ? "contained" : "outlined"}
                  size="small"
                  onClick={handleToggleCpc}
                  disabled={cpcLoading}
                  style={{
                    backgroundColor: hasCpc ? "#d32f2f" : "transparent",
                    borderColor: darkMode ? "#00d9a6" : "#00a884",
                    borderWidth: 2,
                    color: hasCpc ? "#ffffff" : (darkMode ? "#00d9a6" : "#00a884"),
                    fontWeight: 600
                  }}
                >
                  {cpcLoading
                    ? "Aguarde..."
                    : hasCpc
                    ? "Remover CPC"
                    : "Marcar como CPC"}
                </Button>
              </Box>
            </Box>

            {/* Encerramento */}
            {conversation.status === "OPEN" && (
              <Box className={classes.infoPanelSection} style={{
                backgroundColor: darkMode ? "#232d36" : "#ffffff",
                border: darkMode ? "1px solid #3b4a54" : "none"
              }}>
                <Typography className={classes.sectionTitle} style={{
                  color: darkMode ? "#00d9a6" : "#00a884"
                }}>
                  Encerrar Conversa
                </Typography>
                <Box marginBottom={2}>
                  <Typography className={classes.fieldLabel} style={{
                    color: darkMode ? "#e9edef" : "#111b21"
                  }}>
                    Tabulação
                  </Typography>
                  <TextField
                    fullWidth
                    select
                    SelectProps={{
                      MenuProps: {
                        getContentAnchorEl: null,
                        anchorOrigin: {
                          vertical: "bottom",
                          horizontal: "left",
                        },
                        PaperProps: {
                          style: {
                            backgroundColor: darkMode ? "#232d36" : "#ffffff",
                            color: darkMode ? "#e9edef" : "#111b21",
                            border: darkMode ? "1px solid #3b4a54" : "none",
                          },
                        },
                      },
                      style: {
                        color: darkMode ? "#e9edef" : "#111b21",
                        backgroundColor: darkMode ? "#1a2329" : "#ffffff",
                        borderRadius: 8,
                        padding: "10px 12px",
                      },
                    }}
                    InputProps={{
                      style: {
                        backgroundColor: darkMode ? "#1a2329" : "#ffffff",
                        color: darkMode ? "#e9edef" : "#111b21",
                      },
                    }}
                    value={selectedTabulation}
                    onChange={(event) => setSelectedTabulation(event.target.value)}
                    variant="outlined"
                    size="small"
                    placeholder="Selecione uma opção"
                    className={classes.formField}
                  >
                    <MenuItem
                      value=""
                      style={{
                        backgroundColor: darkMode ? "#232d36" : "#ffffff",
                        color: darkMode ? "#8696a0" : "#667781",
                        fontStyle: "italic",
                      }}
                    >
                      Selecione uma tabulação
                    </MenuItem>
                    {tabulations.map((tabulation) => (
                      <MenuItem
                        key={tabulation.id}
                        value={tabulation.id}
                        style={{
                          backgroundColor: darkMode ? "#232d36" : "#ffffff",
                          color: darkMode ? "#e9edef" : "#111b21",
                          "&:hover": {
                            backgroundColor: darkMode ? "#1a2329" : "#f0f2f5",
                          }
                        }}
                      >
                        {tabulation.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box marginBottom={2}>
                  <Typography className={classes.fieldLabel} style={{
                    color: darkMode ? "#e9edef" : "#111b21"
                  }}>
                    Observações
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    variant="outlined"
                    value={closeNotes}
                    onChange={(event) => setCloseNotes(event.target.value)}
                    placeholder="Adicione observações sobre o atendimento..."
                    InputProps={{
                      style: {
                        backgroundColor: darkMode ? "#1a2329" : "#ffffff",
                        color: darkMode ? "#e9edef" : "#111b21",
                      }
                    }}
                    className={classes.formField}
                  />
                </Box>
                <Box display="flex" justifyContent="flex-end" marginTop={2}>
                  <Button
                    variant="contained"
                    startIcon={<CloseIcon />}
                    onClick={handleCloseConversation}
                    disabled={closing || !selectedTabulation}
                    size="small"
                    style={{
                      backgroundColor: darkMode ? "#ff6b6b" : "#d32f2f",
                      color: "#ffffff",
                      fontWeight: 600,
                      boxShadow: "0 2px 8px rgba(211, 47, 47, 0.35)"
                    }}
                  >
                    {closing ? "Encerrando..." : "Encerrar"}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Tickets;