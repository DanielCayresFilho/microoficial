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
    // Formata incluindo segundos para melhor precisão
    return format(new Date(value), "dd/MM/yyyy HH:mm:ss");
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
      // Usa scroll suave apenas quando necessário, instantâneo quando substituindo mensagem
      node.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, []);

  // CRÍTICO: Scroll apenas quando o número de mensagens aumenta (nova mensagem)
  // Não faz scroll quando uma mensagem existente é atualizada (ex: status, substituição)
  const previousMessagesCountRef = useRef(0);
  
  useEffect(() => {
    const currentMessagesCount = conversation?.messages?.length || 0;
    const previousCount = previousMessagesCountRef.current;
    
    // Só faz scroll se o número de mensagens aumentou (nova mensagem adicionada)
    // Não faz scroll se apenas uma mensagem existente foi atualizada
    if (currentMessagesCount > previousCount) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
    
    // Atualiza a referência
    previousMessagesCountRef.current = currentMessagesCount;
  }, [conversation?.messages?.length, scrollToBottom]);
  
  // Scroll inicial quando a conversa é carregada
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
      
      // CORREÇÃO: Garante que todas as mensagens tenham direction definida
      if (data?.messages && Array.isArray(data.messages)) {
        data.messages = data.messages.map(msg => {
          // Se já tem direction válida, mantém
          if (msg.direction === "INBOUND" || msg.direction === "OUTBOUND") {
            return msg;
          }
          
          // Tenta inferir a direção baseado em outros campos
          let inferredDirection = "INBOUND"; // padrão
          
          // Se tem operatorId, é mensagem do operador (OUTBOUND)
          if (msg.operatorId || msg.sentBy === operatorId || msg.from === operatorId) {
            inferredDirection = "OUTBOUND";
          }
          // Se tem customerPhone como remetente, é do cliente (INBOUND)
          else if (msg.from && data.customerPhone && msg.from.includes(data.customerPhone.replace(/\D/g, ''))) {
            inferredDirection = "INBOUND";
          }
          // Se tem status típico de mensagem enviada, provavelmente é OUTBOUND
          else if (msg.status === "SENT" || msg.status === "READ" || msg.status === "DELIVERED") {
            inferredDirection = "OUTBOUND";
          }
          
          console.log(`📍 Direção inferida para mensagem: ${inferredDirection}`, {
            text: msg.content?.text?.substring(0, 30),
            operatorId: msg.operatorId,
            status: msg.status,
            from: msg.from
          });
          
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

  // Memoiza mensagens ordenadas - Ordena por timestamp crescente (mais antigas primeiro)
  const sortedMessages = useMemo(() => {
    if (!conversation?.messages || !Array.isArray(conversation.messages)) {
      return [];
    }
    
    // Ordena por timestamp crescente: mais antigas primeiro, mais novas por último
    // Isso garante que as mensagens apareçam em ordem cronológica (antigas no topo, novas embaixo)
    return [...conversation.messages].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      
      // Se timestamps são iguais, ordena por ID para estabilidade
      if (timeA === timeB) {
        const idA = a.id || a.wamid || "";
        const idB = b.id || b.wamid || "";
        return idA.localeCompare(idB);
      }
      
      // Ordena crescente: timeA < timeB = mensagem A vem antes de B
      return timeA - timeB;
    });
  }, [conversation?.messages]);

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

    // Limpa o campo imediatamente para melhor UX
    setMessageText("");

    try {
      await whatsappMicroservice.sendConversationMessage(conversationId, {
        text: messageToSend,
        operatorId,
      });
      
      // A mensagem real será recebida via WebSocket e aparecerá automaticamente
      // Não criamos mensagem otimista - aguardamos a mensagem real do servidor
      
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || 
                          "Não foi possível enviar a mensagem. Tente novamente.";
      
      toast.error(errorMessage);
      setError(errorMessage);
      setMessageText(messageToSend); // Restaura o texto em caso de erro
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
      console.log("📨 new_conversation recebido:", payload);
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
      console.log("📨 new_message recebido:", payload);
      const { conversationId: msgConvId, message } = payload || {};
      
      if (!message || msgConvId !== conversationId) {
        return;
      }
      
      // CORREÇÃO CRÍTICA: Garante que a mensagem sempre tem direction válida
      // Se não tiver direction, tenta inferir, mas confia principalmente no backend
      if (!message.direction || (message.direction !== "INBOUND" && message.direction !== "OUTBOUND")) {
        console.warn("⚠️ Mensagem sem direction válida, tentando inferir:", {
          id: message.id,
          wamid: message.wamid,
          operatorId: message.operatorId,
          status: message.status,
        });
        
        // Se a mensagem tem operatorId ou foi enviada pelo operador, é OUTBOUND
        if (message.operatorId || payload?.operatorId) {
          message.direction = "OUTBOUND";
        } 
        // Se não tem operatorId e tem status SENT/DELIVERED/READ, provavelmente é OUTBOUND (do operador)
        else if (message.status === "SENT" || message.status === "DELIVERED" || message.status === "READ") {
          message.direction = "OUTBOUND";
        } 
        // Caso contrário, assume INBOUND (do cliente)
        else {
          message.direction = "INBOUND";
        }
        
        console.log(`📨 Direction inferida como ${message.direction} para mensagem:`, message.content?.text?.substring(0, 30));
      }
      
      const isInboundMessage = message.direction === "INBOUND";
      
      // Função helper para normalizar timestamp
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
        const messageDirection = message.direction; // Já garantido acima
        const messageId = message.id;
        const messageWamid = message.wamid;
        
        // Verifica duplicata por ID ou wamid
        const isDuplicate = existingMessages.some(m => {
          // Verifica por ID exato
          if (messageId && m.id && m.id === messageId) return true;
          // Verifica por wamid exato
          if (messageWamid && m.wamid && m.wamid === messageWamid) return true;
          return false;
        });
        
        if (isDuplicate) {
          console.log("⚠️ Mensagem duplicada ignorada:", messageId || messageWamid);
          return prev;
        }
        
        // Adiciona nova mensagem (não há mais mensagens otimistas para substituir)
        const messageWithDirection = {
          ...message,
          direction: messageDirection, // Garante direction correto (INBOUND ou OUTBOUND)
        };
        
        // Adiciona a nova mensagem e reordena por timestamp
        const updatedMessages = [...existingMessages, messageWithDirection];
        
        // REORDENA por timestamp para garantir ordem cronológica correta
        updatedMessages.sort((a, b) => {
          const timeA = getTimestamp(a);
          const timeB = getTimestamp(b);
          
          if (timeA !== timeB) {
            return timeA - timeB; // Ordena crescente (antigas primeiro)
          }
          
          // Se timestamps são iguais, ordena por ID para estabilidade
          const idA = a.id || a.wamid || "";
          const idB = b.id || b.wamid || "";
          return idA.localeCompare(idB);
        });
        
        // Atualiza campos da conversa baseado na direção
        const updated = {
          ...prev,
          messages: updatedMessages,
          lastMessageAt: messageTimestamp > getTimestamp(prev) ? message.timestamp : prev.lastMessageAt,
        };
        
        // Atualiza campos específicos baseado na direção
        if (isInboundMessage) {
          updated.lastCustomerMessageAt = message.timestamp;
          
          // Atualiza elegibilidade quando cliente responde
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
          
          // Atualiza elegibilidade quando operador envia mensagem
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
        
        console.log("✅ Mensagem adicionada/atualizada:", {
          direction: messageDirection,
          totalMessages: updatedMessages.length,
          timestamp: message.timestamp,
        });
        
        return updated;
      });
      
      // Agenda atualização de elegibilidade se for mensagem INBOUND
      if (isInboundMessage) {
        scheduleFetchEligibility(800);
      }
    };

    const handleUnassigned = (payload) => {
      console.log("📨 conversation:unassigned recebido:", payload);
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

    // VERSÃO SIMPLIFICADA DO handleMessageStatusUpdate
    const handleMessageStatusUpdate = (payload) => {
      console.log("📨 message:status recebido:", payload);
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

    // RENDERIZAÇÃO DAS MENSAGENS COM LABELS "OPERADOR" E "CLIENTE"
    // IMPORTANTE: sortedMessages já está ordenado por timestamp crescente (antigas primeiro)
    return (
      <Box 
        className={classes.messageList} 
        display="flex" 
        flexDirection="column" 
        style={{
          gap: 16,
          // Garante que as mensagens aparecem em ordem normal (não invertida)
          flexDirection: "column",
        }}
      >
        {sortedMessages.map((message, index) => {
          // Determina se é mensagem do operador de forma mais robusta
          let isOutbound = false;
          
          // Verifica primeiro pelo campo direction
          if (message.direction === "OUTBOUND") {
            isOutbound = true;
          } else if (message.direction === "INBOUND") {
            isOutbound = false;
          } else {
            // Se não tem direction ou está indefinido, tenta inferir
            // Mensagem com ID temporário é sempre do operador
            if (message.id?.startsWith("temp-")) {
              isOutbound = true;
            } 
            // Se tem operatorId na mensagem, é do operador
            else if (message.operatorId) {
              isOutbound = true;
            }
            // Se tem status SENT ou READ e não tem direction, provavelmente é do operador
            else if (message.status === "SENT" || message.status === "READ") {
              isOutbound = true;
            }
            // Se não conseguir determinar, assume que é do cliente
            else {
              isOutbound = false;
            }
            
            console.warn("⚠️ Mensagem sem direction definida, inferindo:", {
              id: message.id,
              wamid: message.wamid,
              inferredOutbound: isOutbound,
              text: message.content?.text?.substring(0, 30)
            });
          }
          
          const messageKey = message.id || message.wamid || `msg-${index}-${message.timestamp}`;
          const senderLabel = isOutbound ? "OPERADOR" : "CLIENTE";
          
          return (
            <Box
              key={messageKey}
              display="flex"
              flexDirection="column"
              style={{
                marginBottom: 16,
                alignItems: isOutbound ? "flex-end" : "flex-start",
              }}
            >
              {/* LABEL "OPERADOR" ou "CLIENTE" acima da mensagem */}
              <Typography
                variant="caption"
                style={{
                  fontWeight: 600,
                  color: isOutbound ? "#1976d2" : "#388e3c",
                  marginBottom: 4,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {senderLabel}
              </Typography>
              
              {/* CONTEÚDO DA MENSAGEM */}
              <Box
                className={[
                  classes.messageItem,
                  isOutbound ? classes.outboundMessage : classes.inboundMessage,
                ].join(" ")}
                style={{
                  maxWidth: "70%",
                  borderRadius: 8,
                  padding: "12px 16px",
                  backgroundColor: isOutbound ? "#e3f2fd" : "#f1f8e9",
                  border: `1px solid ${isOutbound ? "#90caf9" : "#aed581"}`,
                }}
              >
                <Typography 
                  variant="body1" 
                  style={{ 
                    marginBottom: 8,
                    color: isOutbound ? "#000000" : undefined, // Texto preto para mensagens do operador
                  }}
                >
                  {message.type === "text"
                    ? message.content?.text || "[Mensagem sem conteúdo]"
                    : `[${message.type}]`}
                </Typography>
                <Box 
                  className={classes.metaRow}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  style={{
                    marginTop: 8,
                    fontSize: "0.75rem",
                    color: "#666",
                  }}
                >
                  <Box display="flex" alignItems="center" gridGap={8}>
                    <Chip
                      size="small"
                      label={isOutbound ? "Enviada" : "Recebida"}
                      color={isOutbound ? "secondary" : "default"}
                      style={{ height: 20, fontSize: "0.65rem" }}
                    />
                    {message.status && (
                      <Typography variant="caption">
                        {message.status === "PENDING" ? "Enviando..." : message.status}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption">
                    {formatDateTime(message.timestamp)}
                  </Typography>
                </Box>
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