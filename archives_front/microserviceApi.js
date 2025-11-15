import axios from "axios";

const DEFAULT_BASE_URL = "https://vend.covenos.com.br/api";
const API_KEY_STORAGE_KEY = "WHATSAPP_MICROSERVICE_API_KEY";

const resolveBaseUrl = () => {
  const envBaseUrl =
    process.env.REACT_APP_WHATSAPP_API_BASE_URL ||
    process.env.NEXT_PUBLIC_WHATSAPP_API_BASE_URL ||
    process.env.WHATSAPP_API_BASE_URL;
  return (envBaseUrl && envBaseUrl.trim()) || DEFAULT_BASE_URL;
};

const resolveInitialApiKey = () => {
  const envKey =
    process.env.REACT_APP_WHATSAPP_API_KEY ||
    process.env.NEXT_PUBLIC_WHATSAPP_API_KEY ||
    process.env.WHATSAPP_API_KEY;

  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  if (typeof window !== "undefined") {
    const storedKey = window.localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey && storedKey.trim()) {
      return storedKey.trim();
    }
  }

  return undefined;
};

const createClient = (apiKey) => {
  const client = axios.create({
    baseURL: resolveBaseUrl(),
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    withCredentials: false,
  });

  client.interceptors.request.use((config) => {
    if (!config.headers["X-API-Key"]) {
      const runtimeKey =
        resolveInitialApiKey() ||
        (typeof window !== "undefined"
          ? window.localStorage.getItem(API_KEY_STORAGE_KEY)
          : undefined);

      if (runtimeKey) {
        config.headers["X-API-Key"] = runtimeKey;
      }
    }
    return config;
  });

  return client;
};

let activeApiKey = resolveInitialApiKey();
let httpClient = createClient(activeApiKey);

export const setMicroserviceApiKey = (apiKey, persist = false) => {
  activeApiKey = apiKey ? apiKey.trim() : undefined;
  httpClient = createClient(activeApiKey);

  if (typeof window !== "undefined") {
    if (persist && activeApiKey) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, activeApiKey);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }
};

const unwrap = (promise) =>
  promise.then((response) => response.data ?? response).catch((error) => {
    if (error.response?.data) {
      throw error.response.data;
    }

    throw error;
  });

export const whatsappMicroservice = {
  getHealth: () => unwrap(httpClient.get("/health")),

  getAccounts: () => unwrap(httpClient.get("/accounts")),
  getAccountById: (accountId) =>
    unwrap(httpClient.get(`/accounts/${accountId}`)),
  createAccount: (payload) => unwrap(httpClient.post("/accounts", payload)),
  updateAccount: (accountId, payload) =>
    unwrap(httpClient.put(`/accounts/${accountId}`, payload)),
  deleteAccount: (accountId) => unwrap(httpClient.delete(`/accounts/${accountId}`)),

  addNumberToAccount: (accountId, payload) =>
    unwrap(httpClient.post(`/accounts/${accountId}/numbers`, payload)),
  getAccountNumbers: (accountId) =>
    unwrap(httpClient.get(`/accounts/${accountId}/numbers`)),
  updateAccountNumber: (accountId, numberId, payload) =>
    unwrap(httpClient.put(`/accounts/${accountId}/numbers/${numberId}`, payload)),
  deleteAccountNumber: (accountId, numberId) =>
    unwrap(httpClient.delete(`/accounts/${accountId}/numbers/${numberId}`)),

  getTemplates: (params) =>
    unwrap(httpClient.get("/templates", { params })),
  createTemplate: (payload) => unwrap(httpClient.post("/templates", payload)),
  deleteTemplate: (templateId) =>
    unwrap(httpClient.delete(`/templates/${templateId}`)),
  getOperators: (params) => unwrap(httpClient.get("/operators", { params })),
  getOperatorById: (operatorId) =>
    unwrap(httpClient.get(`/operators/${operatorId}`)),
  createOperator: (payload) => unwrap(httpClient.post("/operators", payload)),
  updateOperator: (operatorId, payload) =>
    unwrap(httpClient.put(`/operators/${operatorId}`, payload)),
  deleteOperator: (operatorId) =>
    unwrap(httpClient.delete(`/operators/${operatorId}`)),
  setOperatorOnline: (operatorId, payload) =>
    unwrap(httpClient.post(`/operators/${operatorId}/online`, payload)),
  setOperatorOffline: (operatorId) =>
    unwrap(httpClient.delete(`/operators/${operatorId}/online`)),
  sendOperatorHeartbeat: (operatorId) =>
    unwrap(httpClient.post(`/operators/${operatorId}/heartbeat`)),
  getOnlineOperators: (params) =>
    unwrap(httpClient.get("/operators/status/online", { params })),

  getTabulations: (params) => unwrap(httpClient.get("/tabulations", { params })),
  createTabulation: (payload) =>
    unwrap(httpClient.post("/tabulations", payload)),
  updateTabulation: (tabulationId, payload) =>
    unwrap(httpClient.put(`/tabulations/${tabulationId}`, payload)),
  deleteTabulation: (tabulationId) =>
    unwrap(httpClient.delete(`/tabulations/${tabulationId}`)),

  getConversations: (params) =>
    unwrap(httpClient.get("/conversations", { params })),
  getConversationById: (conversationId) =>
    unwrap(httpClient.get(`/conversations/${conversationId}`)),
  getConversationStats: (params) =>
    unwrap(httpClient.get("/conversations/stats", { params })),
  sendConversationMessage: (conversationId, payload) =>
    unwrap(httpClient.post(`/conversations/${conversationId}/messages`, payload)),
  closeConversation: (conversationId, payload) =>
    unwrap(httpClient.post(`/conversations/${conversationId}/close`, payload)),
  getConversationEligibility: (conversationId) =>
    unwrap(httpClient.get(`/conversations/${conversationId}/eligibility`)),
  markConversationCpc: (conversationId, payload) =>
    unwrap(httpClient.post(`/conversations/${conversationId}/cpc`, payload)),
  assignConversationOperator: (conversationId, operatorId) =>
    unwrap(
      httpClient.put(`/conversations/${conversationId}/assign`, {
        operatorId,
      })
    ),
  updateConversationCustomerProfile: (conversationId, payload) =>
    unwrap(httpClient.put(`/conversations/${conversationId}/customer-profile`, payload)),

  getCampaigns: (params) => unwrap(httpClient.get("/campaigns", { params })),
  getCampaignById: (campaignId) =>
    unwrap(httpClient.get(`/campaigns/${campaignId}`)),
  getCampaignStats: (campaignId) =>
    unwrap(httpClient.get(`/campaigns/${campaignId}/stats`)),
  createCampaign: (payload) => unwrap(httpClient.post("/campaigns", payload)),
  uploadCampaignCsv: (campaignId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(
      httpClient.post(`/campaigns/${campaignId}/upload-csv`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  },
  pauseCampaign: (campaignId) =>
    unwrap(httpClient.post(`/campaigns/${campaignId}/pause`)),
  resumeCampaign: (campaignId) =>
    unwrap(httpClient.post(`/campaigns/${campaignId}/resume`)),
  deleteCampaign: (campaignId) =>
    unwrap(httpClient.delete(`/campaigns/${campaignId}`)),
};

export const getActiveMicroserviceApiKey = () => activeApiKey;



