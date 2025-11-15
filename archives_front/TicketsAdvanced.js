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
  Avatar,
  Badge,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import RefreshIcon from "@material-ui/icons/Refresh";
import SearchIcon from "@material-ui/icons/Search";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import FiberManualRecordIcon from "@material-ui/icons/FiberManualRecord";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import Brightness7Icon from "@material-ui/icons/Brightness7";
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
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: theme.palette.type === 'dark' ? "#0a1014" : "#e4ddd7",
  },
  header: {
    height: 60,
    backgroundColor: theme.palette.type === 'dark' ? "#202c33" : "#00a884",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  headerTitle: {
    color: "#ffffff",
    fontWeight: 500,
  },
  mainContainer: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  // Painel esquerdo - Lista de conversas
  sidebar: {
    width: 400,
    backgroundColor: theme.palette.type === 'dark' ? "#111b21" : "#ffffff",
    display: "flex",
    flexDirection: "column",
    borderRight: theme.palette.type === 'dark' ? "1px solid #2a3942" : "1px solid #d1d7db",
  },
  sidebarHeader: {
    height: 60,
    backgroundColor: theme.palette.type === 'dark' ? "#202c33" : "#f0f2f5",
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.palette.type === 'dark' ? "#2a3942" : "#ffffff",
    borderRadius: 8,
    "& .MuiOutlinedInput-root": {
      height: 40,
      "& fieldset": {
        border: "none",
      },
      "&:hover fieldset": {
        border: "none",
      },
      "&.Mui-focused fieldset": {
        border: "none",
      },
    },
    "& input": {
      fontSize: 14,
      color: theme.palette.type === 'dark' ? "#e9edef" : "#3b4a54",
      "&::placeholder": {
        color: theme.palette.type === 'dark' ? "#8696a0" : "#667781",
      },
    },
  },
  conversationList: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: theme.palette.type === 'dark' ? "#111b21" : "#ffffff",
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
  conversationItem: {
    height: 72,
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    borderBottom: theme.palette.type === 'dark' ? "1px solid #2A3942" : "1px solid #E9EDEF",  // Borda
    "&:hover": {
      backgroundColor: theme.palette.type === 'dark' ? "#202C33" : "#F5F6F6",  // Hover
    },
  },
  activeConversation: {
    // Fundo padrão de conversa SELECIONADA (caso não esteja sobrescrito no style inline)
    // No código mais embaixo, o fundo selecionado é controlado também pelo style do <ListItem>
    backgroundColor: theme.palette.type === 'dark' ? "#2A3942" : "#E9F5F3",  // Selecionado
  },
  conversationAvatar: {
    width: 48,
    height: 48,
    backgroundColor: theme.palette.type === 'dark' ? "#00A884" : "#00A884",  // Avatar
    color: "#FFFFFF",
    fontSize: 18,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 400,
    // COR DO NOME DO CONTATO na lista (esquerda)
    // OBS: quando a conversa está selecionada, a cor pode ser sobrescrita no style inline do <Typography>
    color: theme.palette.type === 'dark' ? "#E9EDEF" : "#111B21",  // Nome do contato
    marginBottom: 2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  conversationLastMessage: {
    fontSize: 14,
    // COR DA ÚLTIMA MENSAGEM na lista (texto cinza)
    color: theme.palette.type === 'dark' ? "#8696A0" : "#667781",  // Última mensagem
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  conversationTime: {
    fontSize: 12,
    // COR DO HORÁRIO na lista (canto direito)
    color: theme.palette.type === 'dark' ? "#8696A0" : "#667781",  // Horário
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: "#25d366",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 600,
    minWidth: 20,
    height: 20,
  },
  // Painel central - Chat
  chatContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.type === 'dark' ? "#0a1014" : "#efeae2",
    position: "relative",
  },
  // Painel direito - Informações
  infoPanel: {
    width: 400,
    backgroundColor: theme.palette.type === 'dark' ? "#111b21" : "#f0f2f5",
    borderLeft: theme.palette.type === 'dark' ? "1px solid #2a3942" : "1px solid #d1d7db",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  infoPanelHeader: {
    backgroundColor: theme.palette.type === 'dark' ? "#202c33" : "#ffffff",
    padding: "20px",
    textAlign: "center",
    borderBottom: theme.palette.type === 'dark' ? "1px solid #2a3942" : "1px solid #e9edef",
  },
  infoPanelContent: {
    padding: "20px",
  },
  themeToggle: {
    color: "#ffffff",
  },
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

const CLOSED_STATUS = "CLOSED";

const normalizeConversations = (list = []) => {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .filter((conversation) => {
      const status = String(conversation?.status || "").toUpperCase();
      return status !== CLOSED_STATUS;
    })
    .sort((a, b) => {
      const dateA = new Date(a.lastMessageAt || 0);
      const dateB = new Date(b.lastMessageAt || 0);
      return dateB - dateA;
    });
};

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

const TicketsAdvanced = () => {
  const classes = useStyles();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [fallbackSocket, setFallbackSocket] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('whatsapp-theme');
    return saved === 'dark';
  });
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

  const handleThemeToggle = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('whatsapp-theme', newMode ? 'dark' : 'light');
  };

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
      const sanitized = normalizeConversations(Array.isArray(data) ? data : []);
      setConversations(sanitized);
      const hasSelected = sanitized.some(
        (conversation) => conversation.id === selectedConversationId
      );
      if (!hasSelected) {
        setSelectedConversationId(sanitized[0]?.id ?? null);
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
        
        return normalizeConversations([updated, ...others]);
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
      const payloadStatus = String(conversation.status || "").toUpperCase();
      if (payloadStatus === CLOSED_STATUS) {
        setConversations((previous) =>
          previous.filter((item) => item.id !== conversation.id)
        );
        if (selectedConversationId === conversation.id) {
          setSelectedConversationId(null);
        }
        return;
      }

      upsertConversation(conversation, message);
      
      // Se não tinha conversa selecionada, seleciona esta
      if (!selectedConversationId) {
        setSelectedConversationId(conversation.id);
      }
    };

    const handleNewMessage = (payload) => {
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
            return normalizeConversations([...previous, newConversation]);
          }
          
          // Atualiza a conversa existente
          return normalizeConversations(previous.map((conversation) => {
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
          }));
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

    const handleMessageStatusUpdate = (payload) => {
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

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    // Se for hoje, mostra apenas a hora
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    // Se for ontem
    if (diff < 48 * 60 * 60 * 1000 && date.getDate() === now.getDate() - 1) {
      return "Ontem";
    }
    // Se for mais antigo, mostra a data
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const renderConversationItem = (conversation) => {
    const messages = Array.isArray(conversation.messages)
      ? conversation.messages
      : [];
    const lastMessage =
      messages.length > 0 ? messages[messages.length - 1] : undefined;
    const isSelected = selectedConversationId === conversation.id;
    const unreadCount = unreadMessages[conversation.id] || 0;

    return (
      <ListItem
        key={conversation.id}
        className={`${classes.conversationItem} ${isSelected ? classes.activeConversation : ""}`}
        onClick={() => setSelectedConversationId(conversation.id)}
        style={{
          // Fundo do item na BARRA LATERAL ESQUERDA
          // darkMode: altere aqui as cores de selecionado / não selecionado
          backgroundColor: darkMode
            ? (isSelected ? "#202c33" : "#111b21")
            : (isSelected ? "#E9F5F3" : "#ffffff"),
        }}
      >
        <Avatar className={classes.conversationAvatar}>
          {getInitials(conversation.customerName || conversation.customerPhone)}
        </Avatar>
        <Box className={classes.conversationContent}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              className={classes.conversationName}
              style={{
                fontWeight: unreadCount > 0 ? 600 : 400,
                // COR DO NOME do contato na lista
                // darkMode: use uma cor clara para bom contraste
                color: darkMode
                  ? "#E9EDEF"
                  : "#111b21",
              }}
            >
              {conversation.customerName || conversation.customerPhone}
            </Typography>
            <Typography
              className={classes.conversationTime}
              style={{
                // COR DO HORÁRIO na lista
                color: darkMode
                  ? "#8696A0"
                  : "#667781",
                marginLeft: 8,
              }}
            >
              {formatTime(conversation.lastMessageAt)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              className={classes.conversationLastMessage}
              style={{
                fontWeight: unreadCount > 0 ? 500 : 400,
                // COR DO TRECHO DA ÚLTIMA MENSAGEM
                // darkMode: cor levemente mais clara que o horário
                color: darkMode
                  ? "#CFD9DE"
                  : "#667781",
              }}
            >
              {lastMessage?.content?.text || "Clique para iniciar conversa"}
            </Typography>
            {unreadCount > 0 && (
              <Badge badgeContent={unreadCount} classes={{ badge: classes.unreadBadge }} />
            )}
          </Box>
        </Box>
      </ListItem>
    );
  };

  const handleCustomerProfileSaved = useCallback(
    (updatedConversation) => {
      if (!updatedConversation?.id) {
        loadConversations();
        return;
      }

      setConversations((previous) =>
        normalizeConversations(
          previous.map((conversation) => {
            if (conversation.id !== updatedConversation.id) {
              return conversation;
            }
            const updatedName =
              updatedConversation.customerProfile?.name ||
              updatedConversation.customerName ||
              conversation.customerName;
            return {
              ...conversation,
              customerName: updatedName,
              customerProfile:
                updatedConversation.customerProfile ?? conversation.customerProfile,
            };
          })
        )
      );

      loadConversations();
    },
    [loadConversations]
  );

  const handleConversationClosed = useCallback(
    (conversationId) => {
      if (!conversationId) {
        loadConversations();
        return;
      }

      let fallbackSelection = null;
      setConversations((previous) => {
        const filtered = previous.filter(
          (conversation) => conversation.id !== conversationId
        );
        fallbackSelection = filtered[0]?.id ?? null;
        return normalizeConversations(filtered);
      });

      setUnreadMessages((prev) => {
        if (!(conversationId in prev)) {
          return prev;
        }
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });

      setSelectedConversationId((current) => {
        if (current !== conversationId) {
          return current;
        }
        return fallbackSelection;
      });
    },
    [loadConversations]
  );

  return (
    <Box className={classes.root} style={{ backgroundColor: darkMode ? "#0a1014" : "#e4ddd7" }}>
      <Box className={classes.header} style={{ backgroundColor: darkMode ? "#202c33" : "#00a884" }}>
        <Typography className={classes.headerTitle}>
          WhatsApp Business
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={handleThemeToggle} className={classes.themeToggle}>
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadConversations}
            disabled={loading}
            style={{ color: "#ffffff", borderColor: "#ffffff" }}
            size="small"
          >
            Atualizar
          </Button>
        </Box>
      </Box>

      <Box className={classes.mainContainer}>
        {/* Painel esquerdo - Lista de conversas */}
        <Box className={classes.sidebar} style={{ 
          backgroundColor: darkMode ? "#111b21" : "#ffffff",
          borderRight: darkMode ? "1px solid #2a3942" : "1px solid #d1d7db"
        }}>
          <Box className={classes.sidebarHeader} style={{ backgroundColor: darkMode ? "#202c33" : "#f0f2f5" }}>
            <TextField
              placeholder="Pesquisar ou começar nova conversa"
              variant="outlined"
              className={classes.searchInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              InputProps={{
                startAdornment: <SearchIcon style={{ color: darkMode ? "#8696a0" : "#54656f", marginRight: 10 }} />,
              }}
              style={{ backgroundColor: darkMode ? "#2a3942" : "#ffffff" }}
            />
          </Box>
          
          <List className={classes.conversationList} style={{ backgroundColor: darkMode ? "#111b21" : "#ffffff" }}>
            {loading && (
              <Box className={classes.emptyState}>
                <Typography variant="body2">Carregando conversas...</Typography>
              </Box>
            )}
            {!loading && !filteredConversations.length && (
              <Box className={classes.emptyState}>
                <Typography variant="body2">Nenhuma conversa encontrada</Typography>
              </Box>
            )}
            {!loading &&
              filteredConversations.map((conversation) =>
                renderConversationItem(conversation)
              )}
          </List>
        </Box>

        {/* Painel central - Chat */}
        <Box
          className={classes.chatContainer}
          style={{
            backgroundColor: darkMode ? "#0a1014" : "#efeae2",
            backgroundImage: darkMode ? WHATSAPP_DARK_BG : WHATSAPP_LIGHT_BG,
            backgroundRepeat: "repeat",
            backgroundSize: "400px",
          }}
        >
          {selectedConversationId ? (
            <Tickets
              conversationId={selectedConversationId}
              darkMode={darkMode}
              onCustomerProfileSaved={handleCustomerProfileSaved}
              onConversationClosed={handleConversationClosed}
            />
          ) : (
            <Box className={classes.emptyState}>
              <Typography variant="h6" gutterBottom>
                WhatsApp Business
              </Typography>
              <Typography variant="body2">
                Selecione uma conversa para começar
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TicketsAdvanced;