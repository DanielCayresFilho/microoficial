import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import RefreshIcon from "@material-ui/icons/Refresh";
import SearchIcon from "@material-ui/icons/Search";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import FiberManualRecordIcon from "@material-ui/icons/FiberManualRecord";
import { formatDistanceToNow } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import io from "socket.io-client";
import {
  whatsappMicroservice,
  getActiveMicroserviceApiKey,
} from "../Connections/microserviceApi";
import Tickets from "../Tickets";
import { SocketContext } from "../../context/Socket/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0b141a 0%, #111b21 50%, #1f2c34 100%)",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    color: "#d1d7db",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    backgroundColor: "#202c33",
    borderRadius: 16,
    padding: theme.spacing(2),
    border: "1px solid #2a3942",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: theme.spacing(2),
    height: "calc(100vh - 220px)",
    [theme.breakpoints.down("lg")]: {
      gridTemplateColumns: "1fr",
      height: "auto",
    },
  },
  sidebar: {
    borderRadius: 18,
    border: "1px solid #2a3942",
    backgroundColor: "#111b21",
    display: "flex",
    flexDirection: "column",
    minHeight: 400,
    overflow: "hidden",
    boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
    color: "#e9edef",
  },
  sidebarHeader: {
    padding: theme.spacing(2),
    borderBottom: "1px solid #2a3942",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    color: "#8696a0",
  },
  searchInput: {
    width: "100%",
    "& input": {
      color: "#e9edef",
    },
    "& fieldset": {
      borderColor: "#2a3942",
    },
  },
  conversationList: {
    flex: 1,
    overflowY: "auto",
    backgroundImage:
      "url('https://www.transparenttextures.com/patterns/asfalt-dark.png')",
  },
  emptyState: {
    padding: theme.spacing(3),
    textAlign: "center",
    color: "#8696a0",
  },
  activeConversation: {
    backgroundColor: "#202c33",
    borderLeft: "4px solid #25d366",
  },
  statusDot: {
    fontSize: "0.8rem",
  },
  detailWrapper: {
    borderRadius: 18,
    border: "1px solid #2a3942",
    backgroundColor: "#0b141a",
    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  errorBanner: {
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1),
    backgroundColor: "#3b4252",
    color: "#fdd835",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
  },
  stackRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  newMessageIndicator: {
    backgroundColor: "#25d366",
    color: "#0b141a",
    minWidth: 22,
    height: 22,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 600,
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

const statusColor = {
  OPEN: "#4caf50",
  CLOSED: "#9e9e9e",
  PENDING_CLOSURE: "#ff9800",
};

const TicketsAdvanced = () => {
  const classes = useStyles();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [fallbackSocket, setFallbackSocket] = useState(null);
  const socketManager = useContext(SocketContext);
  const { user } = useContext(AuthContext);

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

  const companySocket = useMemo(() => {
    if (!socketManager || typeof socketManager.getSocket !== "function") {
      return null;
    }
    return companyId ? socketManager.getSocket(companyId) : socketManager.getSocket();
  }, [companyId, socketManager]);

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

  const loadConversations = useCallback(async () => {
    if (!operatorId) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const data = await whatsappMicroservice.getConversations({
        operatorId,
        includeClosed: false,
      });
      setConversations(Array.isArray(data) ? data : []);
      if (!selectedConversationId && data?.[0]?.id) {
        setSelectedConversationId(data[0].id);
      }
    } catch (err) {
      const message =
        err?.message ||
        err?.error ||
        "Não foi possível carregar os atendimentos ativos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [operatorId, selectedConversationId]);

  const upsertConversation = useCallback(
    (conversationPayload, message) => {
      if (!conversationPayload?.id) {
        return;
      }

      setConversations((previous) => {
        const existing = previous.find((item) => item.id === conversationPayload.id);

        const existingMessages = existing?.messages ?? [];
        const messageExists =
          message &&
          existingMessages.some(
            (item) =>
              (item.id && message.id && item.id === message.id) ||
              (item.wamid && message.wamid && item.wamid === message.wamid)
          );

        const mergedMessages = message
          ? messageExists
            ? existingMessages
            : [...existingMessages, message]
          : existingMessages.length
          ? existingMessages
          : conversationPayload.messages ?? [];

        const updated = {
          ...existing,
          ...conversationPayload,
          messages: mergedMessages,
          lastMessageAt:
            message?.timestamp ??
            conversationPayload.lastMessageAt ??
            existing?.lastMessageAt,
        };

        const others = previous.filter(
          (item) => item.id !== conversationPayload.id
        );
        
        // Ordena por última mensagem
        return [updated, ...others].sort((a, b) => {
          const dateA = new Date(a.lastMessageAt || 0);
          const dateB = new Date(b.lastMessageAt || 0);
          return dateB - dateA;
        });
      });

      // Adiciona indicador de nova mensagem se não for a conversa selecionada
      if (message && conversationPayload.id !== selectedConversationId && message.direction === "INBOUND") {
        setUnreadMessages((prev) => ({
          ...prev,
          [conversationPayload.id]: (prev[conversationPayload.id] || 0) + 1,
        }));
      }
    },
    [selectedConversationId]
  );

  // Limpa contador de não lidas quando seleciona uma conversa
  useEffect(() => {
    if (selectedConversationId) {
      setUnreadMessages((prev) => ({
        ...prev,
        [selectedConversationId]: 0,
      }));
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (!operatorId) {
      return;
    }
    loadConversations();
  }, [loadConversations, operatorId]);

  useEffect(() => {
    if (!activeSocket || !operatorId) {
      return undefined;
    }

    const handleNewConversation = (payload) => {
      console.log("📨 [TicketsAdvanced] new_conversation recebido:", payload);
      const { conversation, message } = payload ?? {};
      if (!conversation?.id) {
        return;
      }

      // Verifica se a conversa pertence ao operador
      const payloadOperatorId = conversation.operatorId
        ? String(conversation.operatorId)
        : null;
      
      // Se tem operatorId e não é o nosso, remove da lista
      if (payloadOperatorId && operatorId && payloadOperatorId !== operatorId) {
        setConversations((previous) =>
          previous.filter((item) => item.id !== conversation.id)
        );
        if (selectedConversationId === conversation.id) {
          setSelectedConversationId(null);
        }
        return;
      }

      // Atualiza ou adiciona a conversa
      upsertConversation(conversation, message);
      
      // Se não tinha conversa selecionada, seleciona esta
      if (!selectedConversationId) {
        setSelectedConversationId(conversation.id);
      }
    };

    const handleNewMessage = (payload) => {
      console.log("📨 [TicketsAdvanced] new_message recebido:", payload);
      const { conversationId, operatorId: payloadOperatorId, message } =
        payload ?? {};
      
      if (!conversationId || !message) {
        return;
      }

      // Para mensagens de clientes (INBOUND), não verificar operatorId
      if (message.direction === "INBOUND") {
        // Busca a conversa existente
        setConversations((previous) => {
          const existing = previous.find((item) => item.id === conversationId);
          if (!existing) {
            // Se não existe, adiciona uma conversa básica localmente
            // A conversa completa será carregada quando o usuário selecionar
            const newConversation = {
              id: conversationId,
              messages: [message],
              lastMessageAt: message.timestamp,
              status: "OPEN",
            };
            
            // Adiciona indicador de nova mensagem se não for a conversa selecionada
            if (conversationId !== selectedConversationId) {
              setUnreadMessages((prev) => ({
                ...prev,
                [conversationId]: (prev[conversationId] || 0) + 1,
              }));
            }
            
            // Ordena por última mensagem
            return [...previous, newConversation].sort((a, b) => {
              const dateA = new Date(a.lastMessageAt || 0);
              const dateB = new Date(b.lastMessageAt || 0);
              return dateB - dateA;
            });
          }
          
          // Atualiza a conversa existente
          return previous.map((conversation) => {
            if (conversation.id !== conversationId) return conversation;
            
            const existingMessages = conversation.messages ?? [];
            const messageExists = existingMessages.some(
              (item) =>
                (item.id && message.id && item.id === message.id) ||
                (item.wamid && message.wamid && item.wamid === message.wamid)
            );

            if (messageExists) return conversation;

            // Adiciona indicador de nova mensagem se não for a conversa selecionada
            if (conversationId !== selectedConversationId) {
              setUnreadMessages((prev) => ({
                ...prev,
                [conversationId]: (prev[conversationId] || 0) + 1,
              }));
            }

            return {
              ...conversation,
              messages: [...existingMessages, message],
              lastMessageAt: message.timestamp,
            };
          }).sort((a, b) => {
            const dateA = new Date(a.lastMessageAt || 0);
            const dateB = new Date(b.lastMessageAt || 0);
            return dateB - dateA;
          });
        });
      } else {
        // Para mensagens OUTBOUND, verifica o operatorId
        const normalizedPayloadOperatorId = payloadOperatorId
          ? String(payloadOperatorId)
          : null;
        
        if (operatorId && normalizedPayloadOperatorId && normalizedPayloadOperatorId !== operatorId) {
          return;
        }
        
        upsertConversation({ id: conversationId }, message);
      }
    };

    const handleUnassigned = (payload) => {
      console.log("📨 [TicketsAdvanced] conversation:unassigned recebido:", payload);
      // Não recarrega todas as conversas, apenas atualiza a conversa específica se necessário
      // A conversa será atualizada quando o usuário selecionar ou quando receber mensagem
      if (payload?.conversationId) {
        setConversations((previous) => {
          return previous.map((conversation) => {
            if (conversation.id === payload.conversationId) {
              return {
                ...conversation,
                operatorId: null,
                operator: null,
              };
            }
            return conversation;
          });
        });
      }
    };

    // Adiciona listener para todos os tipos de eventos de mensagem
    const handleMessageStatusUpdate = (payload) => {
      console.log("📨 [TicketsAdvanced] message:status recebido:", payload);
      const { conversationId, messageId, status } = payload ?? {};
      if (!conversationId || !messageId) return;
      
      setConversations((previous) =>
        previous.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          
          return {
            ...conversation,
            messages: (conversation.messages || []).map((msg) => {
              if (msg.id === messageId || msg.wamid === messageId) {
                return { ...msg, status };
              }
              return msg;
            }),
          };
        })
      );
    };

    activeSocket.on("new_conversation", handleNewConversation);
    activeSocket.on("new_message", handleNewMessage);
    activeSocket.on("conversation:unassigned", handleUnassigned);
    activeSocket.on("message:status", handleMessageStatusUpdate);
    
    // Adiciona listeners para possíveis variações de eventos
    activeSocket.on("message", handleNewMessage);
    activeSocket.on("conversation", handleNewConversation);

    return () => {
      activeSocket.off("new_conversation", handleNewConversation);
      activeSocket.off("new_message", handleNewMessage);
      activeSocket.off("conversation:unassigned", handleUnassigned);
      activeSocket.off("message:status", handleMessageStatusUpdate);
      activeSocket.off("message", handleNewMessage);
      activeSocket.off("conversation", handleNewConversation);
    };
  }, [
    activeSocket,
    operatorId,
    selectedConversationId,
    upsertConversation,
  ]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) {
      return conversations;
    }
    const term = search.toLowerCase();
    return conversations.filter((conversation) => {
      return [
        conversation.customerName,
        conversation.customerPhone,
        conversation.operator?.name,
        conversation.number?.phoneNumber,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [conversations, search]);

  const renderConversationItem = (conversation) => {
    const messages = Array.isArray(conversation.messages)
      ? conversation.messages
      : [];
    const lastMessage =
      messages.length > 0 ? messages[messages.length - 1] : undefined;
    const lastUpdate = conversation.lastMessageAt
      ? formatDistanceToNow(new Date(conversation.lastMessageAt), {
          addSuffix: true,
          locale: ptBR,
        })
      : "Sem histórico";

    const isSelected = selectedConversationId === conversation.id;
    const unreadCount = unreadMessages[conversation.id] || 0;
    const cpcMarked = Boolean(conversation.cpcMarkedAt);

    return (
      <ListItem
        key={conversation.id}
        button
        onClick={() => setSelectedConversationId(conversation.id)}
        className={isSelected ? classes.activeConversation : undefined}
        alignItems="flex-start"
      >
        <ListItemText
          primary={
            <Box className={classes.stackRow}>
              <Typography variant="subtitle1" style={{ fontWeight: unreadCount > 0 ? 600 : 400 }}>
                {conversation.customerName ?? conversation.customerPhone}
              </Typography>
              <FiberManualRecordIcon
                className={classes.statusDot}
                style={{ color: statusColor[conversation.status] || "#9e9e9e" }}
              />
              <Typography variant="caption">{conversation.status}</Typography>
              {unreadCount > 0 && (
                <Box className={classes.newMessageIndicator}>
                  {unreadCount}
                </Box>
              )}
              {cpcMarked && (
                <Chip label="CPC" size="small" color="secondary" />
              )}
            </Box>
          }
          secondary={
            <>
              <Typography variant="body2" color="textSecondary">
                {conversation.operator
                  ? `Operador: ${conversation.operator.name}`
                  : "Sem operador atribuído"}
              </Typography>
              <Typography 
                variant="body2" 
                color="textSecondary"
                style={{ fontWeight: unreadCount > 0 ? 600 : 400 }}
              >
                {lastMessage?.content?.text
                  ? lastMessage.content.text.substring(0, 60) + 
                    (lastMessage.content.text.length > 60 ? "..." : "")
                  : "Sem mensagens recentes"}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Atualizado {lastUpdate}
              </Typography>
            </>
          }
        />
        <ListItemSecondaryAction>
          <IconButton edge="end" size="small">
            <ChatBubbleOutlineIcon fontSize="small" />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Box className={classes.headerRow}>
          <Box>
            <Typography variant="h4">Central de Atendimentos</Typography>
            <Typography color="textSecondary">
              Converse com clientes através do microserviço oficial em
              vend.covenos.com.br. Selecione um atendimento para visualizar os
              detalhes e interagir pelo WhatsApp Business.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadConversations}
            disabled={loading}
          >
            Atualizar lista
          </Button>
        </Box>
        {error && (
          <Box className={classes.errorBanner}>
            <Typography variant="subtitle2">Erro</Typography>
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}
      </Box>

      <Box className={classes.layout}>
        <Paper className={classes.sidebar} elevation={0}>
          <Box className={classes.sidebarHeader}>
            <SearchIcon color="action" />
            <TextField
              placeholder="Buscar por nome, telefone ou operador..."
              variant="outlined"
              size="small"
              className={classes.searchInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Box>
          <Divider />
          <List className={classes.conversationList}>
            {loading && (
              <Box className={classes.emptyState}>
                Carregando conversas em andamento...
              </Box>
            )}
            {!loading && !filteredConversations.length && (
              <Box className={classes.emptyState}>
                Nenhum atendimento encontrado.
              </Box>
            )}
            {!loading &&
              filteredConversations.map((conversation) =>
                renderConversationItem(conversation)
              )}
          </List>
        </Paper>

        <Box className={classes.detailWrapper}>
          <Tickets conversationId={selectedConversationId || undefined} />
        </Box>
      </Box>
    </Box>
  );
};

export default TicketsAdvanced;