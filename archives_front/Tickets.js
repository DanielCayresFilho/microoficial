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
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import RefreshIcon from "@material-ui/icons/Refresh";
import SendIcon from "@material-ui/icons/Send";
import CloseIcon from "@material-ui/icons/CheckCircleOutline";
import AssignmentIndIcon from "@material-ui/icons/AssignmentInd";
import MessageIcon from "@material-ui/icons/Message";
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
    padding: theme.spacing(4),
    minHeight: "100vh",
    backgroundColor: theme.palette.background.default,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(3),
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  infoCard: {
    borderRadius: theme.spacing(2),
    boxShadow: theme.shadows[1],
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  messageList: {
    maxHeight: "60vh",
    overflowY: "auto",
    padding: theme.spacing(2),
    borderRadius: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  messageItem: {
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(1.5),
    maxWidth: "70%",
    wordBreak: "break-word",
    boxShadow: theme.shadows[1],
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
  },
  inboundMessage: {
    backgroundColor: theme.palette.grey[100],
    alignSelf: "flex-start",
  },
  outboundMessage: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    alignSelf: "flex-end",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  messageFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
  },
  presenceWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
    minWidth: 260,
  },
  presenceControls: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    alignItems: "center",
    justifyContent: "flex-end",
  },
  presenceChip: {
    fontWeight: 600,
  },
  emptyState: {
    padding: theme.spacing(8, 2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
  formContainer: {
    padding: theme.spacing(2),
    borderRadius: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  errorBanner: {
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1),
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.dark,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
  },
  stackColumn: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
  },
  stackRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  stackColumnSmall: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
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
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch (error) {
    return "Data inválida";
  }
};

const useOptionalConversationId = () => {
  try {
    const params = useParams();
    return params?.conversationId;
  } catch (error) {
    return undefined;
  }
};

const Tickets = ({ conversationId: conversationIdProp }) => {
  const classes = useStyles();
  const conversationIdFromRoute = useOptionalConversationId();
  const conversationId = conversationIdProp ?? conversationIdFromRoute;
  const { user } = useContext(AuthContext);
  const socketManager = useContext(SocketContext);
  const messagesEndRef = useRef(null);

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
  const heartbeatRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
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

  // Calcula a mensagem de bloqueio baseada no estado de elegibilidade
  const getBlockedMessage = useCallback(() => {
    if (!eligibility || canSendMessage) {
      return null;
    }

    if (lastMessageFromCustomer) {
      // Cliente respondeu, mas ainda está bloqueado (não deveria acontecer, mas por segurança)
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

  // Auto scroll para última mensagem
  const scrollToBottom = useCallback(() => {
    const node = messagesEndRef.current;
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, scrollToBottom]);

  const fetchConversation = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await whatsappMicroservice.getConversationById(
        conversationId
      );
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
  }, [conversationId]);

  const scheduleFetchConversation = useCallback(
    (delay = 0) => {
      if (!conversationId) {
        return;
      }

      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      if (delay === 0) {
        fetchConversation();
        return;
      }

      const timeout = setTimeout(() => {
        fetchConversation();
        fetchTimeoutRef.current = null;
      }, delay);

      fetchTimeoutRef.current = timeout;
    },
    [conversationId, fetchConversation]
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
    };
  }, [fetchConversation]);

  useEffect(() => {
    fetchTabulations();
  }, [fetchTabulations]);

  const sortedMessages = useMemo(() => {
    if (!conversation?.messages) {
      return [];
    }
    return [...conversation.messages].sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId) {
      return;
    }

    if (!operatorId) {
      toast.error("Identificador do operador não encontrado.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      await whatsappMicroservice.sendConversationMessage(conversationId, {
        text: messageText.trim(),
        operatorId,
      });
      setMessageText("");
      // Pequeno delay para garantir que a mensagem foi processada
      setTimeout(() => fetchConversation(), 100);
    } catch (err) {
      // Captura a mensagem de erro do backend (que já é mais amigável)
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        err?.error ||
        "Não foi possível enviar a mensagem. Tente novamente.";
      
      // Exibe a mensagem de erro do backend
      toast.error(errorMessage);
      setError(errorMessage);
      
      // Recarrega a conversa para atualizar o estado de elegibilidade
      setTimeout(() => fetchConversation(), 500);
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
      setCloseNotes("");
      setSelectedTabulation("");
      await fetchConversation();
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
      toast.success(!hasCpc ? "Contato marcado como CPC." : "Contato removido de CPC.");
      await fetchConversation();
    } catch (toggleError) {
      const message =
        toggleError?.message ||
        toggleError?.error ||
        "Não foi possível atualizar o status de CPC.";
      toast.error(message);
    } finally {
      setCpcLoading(false);
    }
  }, [conversationId, fetchConversation, hasCpc, operatorId]);

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
      console.log("📨 new_conversation recebido:", payload);
      const { conversation: convoPayload, message } = payload ?? {};
      if (!convoPayload?.id) {
        return;
      }

      // Verifica se é a conversa atual
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
      console.log("📨 new_message recebido:", payload);
      const {
        conversationId: payloadConversationId,
        message,
      } = payload ?? {};
      
      if (!message) {
        return;
      }

      // Se a mensagem é para esta conversa, atualiza imediatamente
      if (payloadConversationId === conversationId) {
        const isInboundMessage = message.direction === "INBOUND";
        
        setConversation((previous) => {
          if (!previous) {
            return {
              id: payloadConversationId,
              messages: [message],
              lastMessageAt: message.timestamp,
            };
          }

          const existingMessages = previous.messages ?? [];
          
          // Verifica duplicatas
          const alreadyExists = existingMessages.some(
            (item) =>
              (item.id && message.id && item.id === message.id) ||
              (item.wamid && message.wamid && item.wamid === message.wamid)
          );

          if (alreadyExists) {
            console.log("Mensagem duplicada ignorada:", message.id || message.wamid);
            return previous;
          }

          console.log("✅ Adicionando nova mensagem ao estado");
          return {
            ...previous,
            messages: [...existingMessages, message],
            lastMessageAt: message.timestamp,
          };
        });

        // Se a mensagem é do cliente, recarrega a conversa para atualizar elegibilidade
        if (isInboundMessage) {
          console.log("🔄 Mensagem do cliente recebida, recarregando conversa para atualizar elegibilidade");
          setTimeout(() => fetchConversation(), 300);
        }
      }
    };

    const handleUnassigned = (payload) => {
      console.log("📨 conversation:unassigned recebido:", payload);
      if (payload?.conversationId === conversationId) {
        scheduleFetchConversation(0);
      }
    };

    activeSocket.on("new_conversation", handleNewConversation);
    activeSocket.on("new_message", handleNewMessage);
    activeSocket.on("conversation:unassigned", handleUnassigned);

    return () => {
      activeSocket.off("new_conversation", handleNewConversation);
      activeSocket.off("new_message", handleNewMessage);
      activeSocket.off("conversation:unassigned", handleUnassigned);
    };
  }, [activeSocket, conversationId, scheduleFetchConversation]);

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

  const renderHeader = () => {
    if (!conversation) {
      return null;
    }

    return (
      <Card className={classes.infoCard}>
        <CardContent>
          <Box className={classes.stackColumn}>
            <Box className={classes.headerRow}>
              <Box>
                <Typography variant="h5" component="h2">
                  Conversa #{conversation.id}
                </Typography>
                <Typography color="textSecondary">
                  Cliente: {conversation.customerName ?? "Não identificado"} ·{" "}
                  {conversation.customerPhone}
                </Typography>
              </Box>
              <Box className={classes.stackRow}>
                <Chip
                  label={conversation.status}
                  color={
                    conversation.status === "OPEN" ? "primary" : "default"
                  }
                />
                <Chip
                  label={`Última atualização ${formatDateTime(
                    conversation.lastMessageAt
                  )}`}
                  variant="outlined"
                />
                {eligibility && (
                  <Chip
                    label={`Repescagens ${manualAttemptsCount}/${manualAttemptsLimit}`}
                    variant="outlined"
                    color={manualLimitReached ? "secondary" : "default"}
                  />
                )}
                {hasCpc && (
                  <Chip color="secondary" label="CPC ativo" />
                )}
                <Tooltip title="Atualizar conversa">
                  <IconButton onClick={fetchConversation}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Divider />

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography className={classes.sectionTitle}>
                  Dados do número
                </Typography>
                <Box className={classes.stackColumnSmall}>
                  <Typography variant="body2">
                    Telefone: {conversation.number?.phoneNumber ?? "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    Display: {conversation.number?.displayName ?? "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    Conta: {conversation.number?.account?.name ?? "N/A"}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography className={classes.sectionTitle}>
                  Operador responsável
                </Typography>
                <Box className={classes.stackColumnSmall}>
                  {conversation.operator ? (
                    <>
                      <Box className={classes.stackRow}>
                        <AssignmentIndIcon fontSize="small" />
                        <Typography variant="body2">
                          {conversation.operator.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        E-mail: {conversation.operator.email}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2">
                      Conversa sem operador atribuído.
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography className={classes.sectionTitle}>
                  Tabulação & Notas
                </Typography>
                <Box className={classes.stackColumnSmall}>
                  <Typography variant="body2">
                    Tabulação atual:{" "}
                    {conversation.tabulation
                      ? conversation.tabulation.name
                      : "Não definida"}
                  </Typography>
                  {conversation.notes && (
                    <Paper elevation={0} style={{ padding: "8px 12px" }}>
                      <Typography variant="body2">
                        {conversation.notes}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderMessages = () => {
    if (loading) {
      return (
        <Box className={classes.emptyState}>
          <CircularProgress />
          <Typography variant="body2" style={{ marginTop: 16 }}>
            Carregando histórico de mensagens...
          </Typography>
        </Box>
      );
    }

    if (!conversationId) {
      return (
        <Box className={classes.emptyState}>
          <MessageIcon fontSize="large" style={{ opacity: 0.4 }} />
          <Typography variant="body2" style={{ marginTop: 16 }}>
            Fique online para receber novos atendimentos ou selecione uma conversa da lista.
          </Typography>
        </Box>
      );
    }

    if (!sortedMessages.length) {
      return (
        <Box className={classes.emptyState}>
          <MessageIcon fontSize="large" style={{ opacity: 0.4 }} />
          <Typography variant="body2" style={{ marginTop: 16 }}>
            Nenhuma mensagem registrada para esta conversa.
          </Typography>
        </Box>
      );
    }

    return (
      <Box className={classes.messageList} display="flex" flexDirection="column" gridGap={16}>
        {sortedMessages.map((message) => {
          const isOutbound = message.direction === "OUTBOUND";
          return (
            <Box
              key={message.id || message.wamid || Math.random()}
              className={[
                classes.messageItem,
                isOutbound ? classes.outboundMessage : classes.inboundMessage,
              ].join(" ")}
            >
              <Typography variant="body1">
                {message.type === "text"
                  ? message.content?.text ?? ""
                  : `[${message.type}]`}
              </Typography>
              <Box className={classes.metaRow}>
                <Chip
                  size="small"
                  label={isOutbound ? "Enviada" : "Recebida"}
                  color={isOutbound ? "secondary" : "default"}
                />
                <Typography variant="caption">
                  Status: {message.status ?? "desconhecido"}
                </Typography>
                <Typography variant="caption">
                  {formatDateTime(message.timestamp)}
                </Typography>
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>
    );
  };

  const renderComposer = () => {
    if (!conversation || conversation.status !== "OPEN") {
      return null;
    }

    return (
      <Box className={classes.formContainer}>
        <Box className={classes.stackColumn}>
          {!canSendMessage && blockedMessage && (
            <Box
              style={{
                padding: "12px",
                backgroundColor: "#fff3cd",
                borderRadius: 8,
                border: "1px solid #ffecb5",
              }}
            >
              <Typography variant="body2" style={{ color: "#664d03" }}>
                {blockedMessage}
              </Typography>
            </Box>
          )}
          <Typography className={classes.sectionTitle}>
            Enviar nova mensagem
          </Typography>
          <TextField
            multiline
            minRows={3}
            variant="outlined"
            placeholder="Escreva uma mensagem para o cliente..."
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            onKeyPress={(event) => {
              if (event.key === 'Enter' && event.ctrlKey && !sending && messageText.trim()) {
                handleSendMessage();
              }
            }}
            disabled={sending || !canSendMessage}
          />
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="textSecondary">
              Ctrl+Enter para enviar
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleSendMessage}
              disabled={sending || !messageText.trim() || !canSendMessage}
            >
              Enviar
            </Button>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderCloseForm = () => {
    if (!conversation || conversation.status !== "OPEN") {
      return null;
    }

    return (
      <Box className={classes.formContainer}>
        <Box className={classes.stackColumn}>
          <Typography className={classes.sectionTitle}>
            Encerrar conversa
          </Typography>
          <TextField
            select
            label="Tabulação"
            SelectProps={{ native: true }}
            value={selectedTabulation}
            onChange={(event) => setSelectedTabulation(event.target.value)}
            variant="outlined"
            helperText="Selecione a tabulação correspondente ao desfecho da conversa."
          >
            <option value="">Selecione uma tabulação</option>
            {tabulations.map((tabulation) => (
              <option key={tabulation.id} value={tabulation.id}>
                {tabulation.name}
              </option>
            ))}
          </TextField>
          <TextField
            multiline
            minRows={2}
            label="Notas (opcional)"
            variant="outlined"
            value={closeNotes}
            onChange={(event) => setCloseNotes(event.target.value)}
            placeholder="Adicione observações importantes sobre o atendimento."
          />
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button
              variant={hasCpc ? "contained" : "outlined"}
              color="secondary"
              onClick={handleToggleCpc}
              disabled={cpcLoading}
            >
              {cpcLoading
                ? "Atualizando..."
                : hasCpc
                ? "Remover CPC"
                : "Marcar como CPC"}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CloseIcon />}
              onClick={handleCloseConversation}
              disabled={closing}
            >
              Encerrar atendimento
            </Button>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Box className={classes.headerRow}>
          <Box>
            <Typography variant="h4" component="h1">
              Detalhes da Conversa
            </Typography>
            <Typography color="textSecondary">
              Integração com vend.covenos.com.br · Microserviço oficial do
              WhatsApp Business
            </Typography>
          </Box>
          <Box className={classes.presenceWrapper}>
            <Box className={classes.presenceControls}>
              <Chip
                className={classes.presenceChip}
                color={isOnline ? "primary" : "default"}
                label={isOnline ? "Online" : "Offline"}
              />
              {presenceInfo?.expiresAt && (
                <Typography variant="caption" color="textSecondary">
                  Sessão expira em {formatDateTime(presenceInfo.expiresAt)}
                </Typography>
              )}
              {cpcMarkedAt && (
                <Typography variant="caption" color="textSecondary">
                  CPC registrado em {formatDateTime(cpcMarkedAt)}
                </Typography>
              )}
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchConversation}
                disabled={loading}
              >
                Recarregar
              </Button>
              <Button
                variant={isOnline ? "outlined" : "contained"}
                color={isOnline ? "secondary" : "primary"}
                onClick={isOnline ? handleGoOffline : handleGoOnline}
                disabled={presenceLoading}
              >
                {presenceLoading
                  ? "Atualizando..."
                  : isOnline
                  ? "Ficar offline"
                  : "Ficar online"}
              </Button>
            </Box>
          </Box>
        </Box>

        {error && (
          <Box className={classes.errorBanner}>
            <Typography variant="subtitle2">Erro</Typography>
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}
      </Box>

      {renderHeader()}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {renderMessages()}
        </Grid>
        <Grid item xs={12} md={4}>
          <Box display="flex" flexDirection="column" gridGap={24}>
            {renderComposer()}
            {renderCloseForm()}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Tickets;