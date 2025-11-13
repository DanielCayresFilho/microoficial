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

  // Função para atualizar apenas a elegibilidade (sem recarregar a conversa inteira)
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

  // Nota: A elegibilidade já vem na resposta do getConversationById, 
  // então não precisamos buscá-la separadamente após carregar a conversa.
  // Apenas atualizamos quando necessário (após mensagens via socket).

  useEffect(() => {
    fetchTabulations();
  }, [fetchTabulations]);

  // Memoiza mensagens ordenadas para evitar recálculos desnecessários
  // Usa referência direta do array de mensagens para evitar recálculos quando apenas o status muda
  const sortedMessages = useMemo(() => {
    if (!conversation?.messages || !Array.isArray(conversation.messages)) {
      return [];
    }
    // Cria uma cópia ordenada das mensagens (ordenação estável)
    const messages = [...conversation.messages];
    messages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      // Se os timestamps forem iguais, ordena por ID para estabilidade
      const idA = a.id || a.wamid || '';
      const idB = b.id || b.wamid || '';
      return idA.localeCompare(idB);
    });
    return messages;
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
    
    // Cria uma mensagem otimista (temporária) para aparecer imediatamente
    const optimisticMessageId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage = {
      id: optimisticMessageId,
      wamid: null,
      type: "text",
      direction: "OUTBOUND",
      content: {
        text: messageToSend,
      },
      timestamp: new Date().toISOString(),
      status: "PENDING", // Status temporário
      conversationId,
    };

    // Adiciona a mensagem otimista imediatamente ao estado na posição correta
    setConversation((previous) => {
      if (!previous || previous.id !== conversationId) {
        return previous;
      }

      const existingMessages = previous.messages ?? [];
      
      // Verifica se a mensagem otimista já existe (evita duplicatas)
      const alreadyExists = existingMessages.some(
        (item) => item.id === optimisticMessageId
      );

      if (alreadyExists) {
        return previous;
      }

      // Função helper para normalizar timestamp
      const getTimestamp = (msg) => {
        if (!msg.timestamp) return 0;
        const ts = new Date(msg.timestamp).getTime();
        return isNaN(ts) ? 0 : ts;
      };

      // Insere a mensagem otimista na posição correta baseada no timestamp
      const optimisticTimestamp = getTimestamp(optimisticMessage);
      const insertIndex = existingMessages.findIndex(
        (item) => getTimestamp(item) > optimisticTimestamp
      );
      
      const updatedMessages = insertIndex === -1
        ? [...existingMessages, optimisticMessage]
        : [
            ...existingMessages.slice(0, insertIndex),
            optimisticMessage,
            ...existingMessages.slice(insertIndex),
          ];

      // Atualiza a conversa com a mensagem otimista na posição correta
      // O scroll automático será acionado pelo useEffect que observa conversation?.messages
      return {
        ...previous,
        messages: updatedMessages,
        lastMessageAt: optimisticMessage.timestamp,
        lastAgentMessageAt: optimisticMessage.timestamp,
      };
    });

    setMessageText(""); // Limpa o campo após adicionar a mensagem otimista

    try {
      await whatsappMicroservice.sendConversationMessage(conversationId, {
        text: messageToSend,
        operatorId,
      });
      
      // A mensagem real será atualizada via socket quando chegar
      // Removemos a mensagem otimista quando a real chegar (no handleNewMessage)
      // A elegibilidade será atualizada localmente quando a mensagem real chegar via socket
      // Não precisa buscar do backend, pois a mensagem real virá com todos os dados
      
      // Timeout para limpar mensagem otimista se a real não chegar em 10 segundos
      // Apenas remove do estado local, sem recarregar a conversa (tudo em tempo real)
      setTimeout(() => {
        setConversation((previous) => {
          if (!previous || previous.id !== conversationId) {
            return previous;
          }

          const existingMessages = previous.messages ?? [];
          const hasOptimisticMessage = existingMessages.some(
            (item) => item.id === optimisticMessageId
          );

          // Se a mensagem otimista ainda existe, significa que a real não chegou
          // Apenas remove do estado local (a mensagem real chegará via socket quando disponível)
          if (hasOptimisticMessage) {
            console.warn("⚠️ Mensagem otimista não foi substituída após 10s, removendo do estado local");
            const filteredMessages = existingMessages.filter(
              (item) => item.id !== optimisticMessageId
            );
            
            return {
              ...previous,
              messages: filteredMessages,
            };
          }

          return previous;
        });
      }, 10000); // 10 segundos
    } catch (err) {
      // Captura a mensagem de erro do backend (que já é mais amigável)
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        err?.error ||
        "Não foi possível enviar a mensagem. Tente novamente.";
      
      // Remove a mensagem otimista em caso de erro
      setConversation((previous) => {
        if (!previous || previous.id !== conversationId) {
          return previous;
        }

        const existingMessages = previous.messages ?? [];
        const filteredMessages = existingMessages.filter(
          (item) => item.id !== optimisticMessageId
        );

        return {
          ...previous,
          messages: filteredMessages,
        };
      });
      
      // Exibe a mensagem de erro do backend
      toast.error(errorMessage);
      setError(errorMessage);
      
      // Restaura o texto da mensagem em caso de erro
      setMessageText(messageToSend);
      
      // Em caso de erro, a elegibilidade será atualizada quando o operador tentar enviar novamente
      // Não precisa buscar do backend imediatamente, pois o erro já foi tratado
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
      
      // Atualiza o estado local sem recarregar a conversa inteira
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
      
      // A atualização completa virá via socket (se o backend emitir evento)
      // Não recarrega para evitar reload
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
      
      // Atualiza o estado local sem recarregar a conversa inteira
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
        console.warn("⚠️ Mensagem recebida sem conteúdo:", payload);
        return;
      }

      // Garante que a mensagem tem direção definida
      if (!message.direction || (message.direction !== "INBOUND" && message.direction !== "OUTBOUND")) {
        console.warn("⚠️ Mensagem sem direção válida:", message);
        // Tenta inferir a direção baseado no operador
        // Se não temos como inferir, ignora a mensagem
        return;
      }

      // Se a mensagem é para esta conversa, atualiza imediatamente
      if (payloadConversationId === conversationId) {
        const isInboundMessage = message.direction === "INBOUND";
        
        console.log(`📨 Processando mensagem ${isInboundMessage ? "INBOUND" : "OUTBOUND"}:`, {
          id: message.id,
          wamid: message.wamid,
          timestamp: message.timestamp,
          direction: message.direction,
          text: message.content?.text?.substring(0, 50),
        });
        
        setConversation((previous) => {
          if (!previous) {
            return {
              id: payloadConversationId,
              messages: [message],
              lastMessageAt: message.timestamp,
              [isInboundMessage ? "lastCustomerMessageAt" : "lastAgentMessageAt"]: message.timestamp,
            };
          }

          const existingMessages = previous.messages ?? [];
          
          // Função helper para normalizar timestamp
          const getTimestamp = (msg) => {
            if (!msg.timestamp) return 0;
            const ts = new Date(msg.timestamp).getTime();
            return isNaN(ts) ? 0 : ts;
          };
          
          // Verifica duplicatas por ID, wamid, ou combinação de texto + direção + timestamp próximo
          const messageId = message.id;
          const messageWamid = message.wamid;
          const messageTimestamp = getTimestamp(message);
          const messageText = message.content?.text?.trim();
          const messageDirection = message.direction;
          
          const alreadyExists = existingMessages.some((item) => {
            // Verifica por ID exato
            if (messageId && item.id && item.id === messageId) {
              return true;
            }
            // Verifica por wamid exato
            if (messageWamid && item.wamid && item.wamid === messageWamid) {
              return true;
            }
            // Verifica se é uma mensagem otimista que já foi substituída
            if (item.id?.startsWith("temp-") && messageText && item.direction === messageDirection) {
              const itemText = item.content?.text?.trim();
              if (itemText === messageText) {
                const itemTimestamp = getTimestamp(item);
                // Se o timestamp está muito próximo (dentro de 5 segundos), provavelmente é a mesma mensagem
                if (Math.abs(messageTimestamp - itemTimestamp) < 5000) {
                  return true;
                }
              }
            }
            return false;
          });

          if (alreadyExists) {
            console.log("⚠️ Mensagem duplicada ignorada:", {
              id: messageId || messageWamid,
              direction: messageDirection,
              text: messageText?.substring(0, 30),
            });
            return previous;
          }

          // Se é uma mensagem OUTBOUND (do operador), tenta substituir a mensagem otimista
          if (!isInboundMessage && message.type === "text" && messageText) {
            // Busca por mensagem otimista que corresponda ao texto e direção
            const optimisticMessageIndex = existingMessages.findIndex(
              (item) =>
                item.id?.startsWith("temp-") &&
                item.direction === "OUTBOUND" &&
                item.type === "text" &&
                item.content?.text &&
                item.content.text.trim() === messageText &&
                (item.status === "PENDING" || !item.status)
            );

            if (optimisticMessageIndex !== -1) {
              // Substitui a mensagem otimista pela mensagem real
              console.log("✅ Substituindo mensagem otimista pela mensagem real:", {
                optimisticId: existingMessages[optimisticMessageIndex].id,
                realId: messageId || messageWamid,
                direction: messageDirection,
              });
              
              // Remove a mensagem otimista primeiro
              const messagesWithoutOptimistic = existingMessages.filter(
                (item, index) => index !== optimisticMessageIndex
              );
              
              // Remove outras mensagens otimistas duplicadas com o mesmo texto (se houver)
              const messagesWithoutDuplicates = messagesWithoutOptimistic.filter(
                (item) => {
                  // Mantém mensagens que não são otimistas duplicadas
                  if (!item.id?.startsWith("temp-")) {
                    return true;
                  }
                  // Remove outras mensagens otimistas com o mesmo texto, direção e timestamp próximo
                  if (
                    item.direction === "OUTBOUND" &&
                    item.type === "text" &&
                    item.content?.text &&
                    item.content.text.trim() === messageText
                  ) {
                    const itemTimestamp = getTimestamp(item);
                    // Se o timestamp está muito próximo (dentro de 10 segundos), remove
                    if (Math.abs(messageTimestamp - itemTimestamp) < 10000) {
                      return false;
                    }
                  }
                  return true;
                }
              );
              
              // Insere a mensagem real na posição correta baseada no timestamp
              const insertIndex = messagesWithoutDuplicates.findIndex(
                (item) => getTimestamp(item) > messageTimestamp
              );
              
              const updatedMessages = insertIndex === -1
                ? [...messagesWithoutDuplicates, message]
                : [
                    ...messagesWithoutDuplicates.slice(0, insertIndex),
                    message,
                    ...messagesWithoutDuplicates.slice(insertIndex),
                  ];
              
              // Garante que a mensagem tem a direção correta
              const finalMessage = {
                ...message,
                direction: messageDirection, // Força a direção correta
              };
              
              // Substitui a mensagem inserida pela versão final com direção garantida
              const finalMessages = updatedMessages.map((msg) => {
                // Substitui a mensagem que corresponde ao ID ou wamid pela versão final
                if (msg.id === messageId || msg.wamid === messageWamid) {
                  return finalMessage;
                }
                return msg;
              });
              
              // Ordena novamente por timestamp para garantir ordem correta
              finalMessages.sort((a, b) => {
                const timeA = getTimestamp(a);
                const timeB = getTimestamp(b);
                if (timeA !== timeB) {
                  return timeA - timeB;
                }
                // Se os timestamps forem iguais, ordena por ID para estabilidade
                const idA = a.id || a.wamid || "";
                const idB = b.id || b.wamid || "";
                return idA.localeCompare(idB);
              });
              
              const updated = {
                ...previous,
                messages: finalMessages,
                lastMessageAt: messageTimestamp > getTimestamp(previous) ? message.timestamp : previous.lastMessageAt,
                lastAgentMessageAt: message.timestamp,
              };
              
              console.log("✅ Mensagem otimista substituída e reordenada:", {
                totalMessages: finalMessages.length,
                direction: messageDirection,
                insertIndex: insertIndex === -1 ? "final" : insertIndex,
                finalOrder: finalMessages.map((m, i) => ({
                  index: i,
                  direction: m.direction,
                  timestamp: m.timestamp,
                  text: m.content?.text?.substring(0, 20),
                })),
              });
              
              return updated;
            }
          }

          console.log("✅ Adicionando nova mensagem ao estado (não é substituição)");
          
          // Garante que a mensagem tem a direção correta antes de inserir
          const messageWithDirection = {
            ...message,
            direction: messageDirection, // Força a direção correta
          };
          
          // Insere a mensagem na posição correta baseada no timestamp
          const insertIndex = existingMessages.findIndex(
            (item) => getTimestamp(item) > messageTimestamp
          );
          
          const updatedMessages = insertIndex === -1
            ? [...existingMessages, messageWithDirection]
            : [
                ...existingMessages.slice(0, insertIndex),
                messageWithDirection,
                ...existingMessages.slice(insertIndex),
              ];
          
          // Ordena novamente por timestamp para garantir ordem correta (caso algum timestamp esteja incorreto)
          updatedMessages.sort((a, b) => {
            const timeA = getTimestamp(a);
            const timeB = getTimestamp(b);
            if (timeA !== timeB) {
              return timeA - timeB;
            }
            // Se os timestamps forem iguais, ordena por ID para estabilidade
            const idA = a.id || a.wamid || "";
            const idB = b.id || b.wamid || "";
            return idA.localeCompare(idB);
          });
          
          // Atualiza a conversa com a nova mensagem na posição correta
          const updated = {
            ...previous,
            messages: updatedMessages,
            lastMessageAt: messageTimestamp > getTimestamp(previous) ? message.timestamp : previous.lastMessageAt,
          };

          // Se a mensagem é do cliente, atualiza lastCustomerMessageAt localmente
          if (isInboundMessage) {
            updated.lastCustomerMessageAt = message.timestamp;
            
            // Atualiza a elegibilidade localmente quando o cliente responde
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
            } else {
              scheduleFetchEligibility(800);
            }
          } else {
            // Se a mensagem é do operador, atualiza lastAgentMessageAt localmente
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

          console.log("✅ Mensagem adicionada na posição correta:", {
            insertIndex: insertIndex === -1 ? "final" : insertIndex,
            totalMessages: updatedMessages.length,
            direction: messageDirection,
            timestamp: message.timestamp,
            finalOrder: updatedMessages.map((m, i) => ({
              index: i,
              direction: m.direction,
              timestamp: m.timestamp,
              text: m.content?.text?.substring(0, 20),
            })),
          });

          return updated;
        });
      }
    };

    const handleUnassigned = (payload) => {
      console.log("📨 conversation:unassigned recebido:", payload);
      if (payload?.conversationId === conversationId) {
        // Atualiza o estado local se necessário (sem recarregar a conversa)
        // A conversa será atualizada via socket quando necessário
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
      console.log("📨 message:status recebido:", payload);
      const { conversationId: payloadConversationId, messageId, status, wamid } = payload ?? {};
      
      if (!payloadConversationId || (!messageId && !wamid) || !status) {
        return;
      }

      // Se a atualização é para esta conversa, atualiza apenas o status da mensagem específica
      // Atualização otimizada: apenas atualiza o status sem recriar toda a estrutura
      if (payloadConversationId === conversationId) {
        setConversation((previous) => {
          if (!previous || previous.id !== conversationId || !previous.messages) {
            return previous;
          }

          const existingMessages = previous.messages;
          
          // Verifica se alguma mensagem precisa ser atualizada
          const needsUpdate = existingMessages.some(
            (msg) => {
              // Compara por ID
              if (messageId && msg.id && msg.id === messageId) {
                return msg.status !== status;
              }
              // Compara por wamid
              if (wamid && msg.wamid && msg.wamid === wamid) {
                return msg.status !== status;
              }
              // Compara messageId com wamid
              if (messageId && msg.wamid && msg.wamid === messageId) {
                return msg.status !== status;
              }
              // Compara wamid com id
              if (wamid && msg.id && msg.id === wamid) {
                return msg.status !== status;
              }
              return false;
            }
          );

          // Se nenhuma mensagem precisa ser atualizada, retorna o estado anterior (evita re-render)
          if (!needsUpdate) {
            return previous;
          }

          // Atualiza apenas o status da mensagem específica (sem recarregar a conversa)
          const updatedMessages = existingMessages.map((msg) => {
            // Compara por ID
            if (messageId && msg.id && msg.id === messageId) {
              return { ...msg, status, ...(wamid && !msg.wamid ? { wamid } : {}) };
            }
            // Compara por wamid
            if (wamid && msg.wamid && msg.wamid === wamid) {
              return { ...msg, status };
            }
            // Compara messageId com wamid
            if (messageId && msg.wamid && msg.wamid === messageId) {
              return { ...msg, status, ...(wamid && !msg.wamid ? { wamid } : {}) };
            }
            // Compara wamid com id
            if (wamid && msg.id && msg.id === wamid) {
              return { ...msg, status };
            }
            // Mantém a mensagem inalterada
            return msg;
          });

          console.log("✅ Status da mensagem atualizado em tempo real (sem reload):", messageId || wamid, "->", status);

          // Retorna novo objeto apenas se houve mudança (React otimiza isso)
          return {
            ...previous,
            messages: updatedMessages,
          };
        });
      }
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

    return (
      <Box className={classes.messageList} display="flex" flexDirection="column" gridGap={16}>
        {sortedMessages.map((message, index) => {
          // Garante que a mensagem tem direção válida
          // Se não tiver, tenta inferir baseado em outras propriedades ou assume INBOUND
          let messageDirection = message.direction;
          if (!messageDirection || (messageDirection !== "INBOUND" && messageDirection !== "OUTBOUND")) {
            // Se a mensagem tem ID temporário (temp-), provavelmente é OUTBOUND (do operador)
            if (message.id?.startsWith("temp-")) {
              messageDirection = "OUTBOUND";
            } else {
              // Por padrão, assume INBOUND se não conseguir determinar
              messageDirection = "INBOUND";
              console.warn("⚠️ Mensagem sem direção válida, assumindo INBOUND:", {
                id: message.id,
                wamid: message.wamid,
                index,
              });
            }
          }
          
          const isOutbound = messageDirection === "OUTBOUND";
          
          // Chave estável para evitar recriação de componentes quando apenas o status muda
          const messageKey = message.id || message.wamid || `temp-${message.timestamp}-${messageDirection}-${index}`;
          
          return (
            <Box
              key={messageKey}
              className={[
                classes.messageItem,
                isOutbound ? classes.outboundMessage : classes.inboundMessage,
              ].join(" ")}
              title={`Direção: ${messageDirection} | Timestamp: ${message.timestamp} | ID: ${message.id || message.wamid || "temp"}`}
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
                {/* Debug: mostra a direção da mensagem (pode remover depois) */}
                {process.env.NODE_ENV === "development" && (
                  <Typography variant="caption" style={{ fontSize: "10px", opacity: 0.6 }}>
                    [{messageDirection}]
                  </Typography>
                )}
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