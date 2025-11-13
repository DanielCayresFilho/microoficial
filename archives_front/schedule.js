import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import LinearProgress from "@material-ui/core/LinearProgress";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import Box from "@material-ui/core/Box";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import RefreshIcon from "@material-ui/icons/Refresh";
import PauseIcon from "@material-ui/icons/Pause";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import { whatsappMicroservice } from "../Connections/microserviceApi";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(3),
    borderRadius: 16,
    marginBottom: theme.spacing(3),
  },
  formSection: {
    marginBottom: theme.spacing(4),
  },
  fileInput: {
    display: "none",
  },
  fileLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(1),
    cursor: "pointer",
  },
  helperCard: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: 12,
    backgroundColor: theme.palette.grey[100],
  },
  campaignsList: {
    marginTop: theme.spacing(2),
  },
  campaignItem: {
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(2),
  },
}));

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch (error) {
    return "-";
  }
};

const Schedules = () => {
  const classes = useStyles();
  const [accounts, setAccounts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templatesError, setTemplatesError] = useState(false);
  const [campaigns, setCampaigns] = useState([]);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedNumberId, setSelectedNumberId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [rateLimit, setRateLimit] = useState(50);
  const [csvFile, setCsvFile] = useState(null);

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState({
    id: null,
    action: null,
  });

  const isActionLoading = (id, action) =>
    actionLoading.id === id && actionLoading.action === action;

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const data = await whatsappMicroservice.getAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      const message =
        error?.message ||
        error?.error ||
        "Não foi possível carregar as contas. Verifique a API Key.";
      toast.error(message);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadTemplates = async (numberId) => {
    setLoadingTemplates(true);
    try {
      const params = numberId ? { numberId } : undefined;
      const data = await whatsappMicroservice.getTemplates(params);
      setTemplates(Array.isArray(data) ? data : []);
      setTemplatesError(false);
    } catch (error) {
      setTemplatesError(true);
      console.warn("Falha ao buscar templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const data = await whatsappMicroservice.getCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Falha ao carregar campanhas:", error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadTemplates();
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedNumberId) {
      loadTemplates(selectedNumberId);
    }
  }, [selectedNumberId]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const availableNumbers = useMemo(
    () => selectedAccount?.numbers ?? [],
    [selectedAccount]
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId),
    [templates, templateId]
  );

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (availableNumbers.length > 0) {
      setSelectedNumberId(availableNumbers[0].id);
    } else {
      setSelectedNumberId("");
    }
  }, [availableNumbers]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCsvFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Selecione um arquivo CSV válido.");
      return;
    }

    setCsvFile(file);
  };

  const resetForm = () => {
    setCampaignName("");
    setCampaignDescription("");
    setRateLimit(50);
    setTemplateId("");
    setCsvFile(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!campaignName.trim()) {
      toast.error("Informe um nome para a campanha.");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Selecione uma conta WhatsApp.");
      return;
    }

    if (!selectedNumberId) {
      toast.error("Selecione um número.");
      return;
    }

    if (!templateId.trim()) {
      toast.error("Informe o ID do template (Meta).");
      return;
    }

    if (!csvFile) {
      toast.error("Anexe um arquivo CSV com os destinatários.");
      return;
    }

    setSubmitting(true);
    setUploading(false);

    try {
      const payload = {
        name: campaignName.trim(),
        description: campaignDescription.trim() || undefined,
        templateId: templateId.trim(),
        accountId: selectedAccountId,
        numberId: selectedNumberId,
        rateLimit: rateLimit ? Number(rateLimit) : undefined,
      };

      const campaign = await whatsappMicroservice.createCampaign(payload);

      setUploading(true);
      await whatsappMicroservice.uploadCampaignCsv(campaign.id, csvFile);
      toast.success("Campanha criada e CSV enviado com sucesso!");
      resetForm();

      const data = await whatsappMicroservice.getCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      const message =
        error?.message ||
        error?.error ||
        "Não foi possível criar a campanha. Verifique os dados informados.";
      toast.error(message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const refreshCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const data = await whatsappMicroservice.getCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      const message =
        error?.message ||
        error?.error ||
        "Não foi possível atualizar a lista de campanhas.";
      toast.error(message);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const withCampaignAction = async (campaignId, action, fn, successMessage) => {
    setActionLoading({ id: campaignId, action });
    try {
      await fn();
      if (successMessage) {
        toast.success(successMessage);
      }
      await refreshCampaigns();
    } catch (error) {
      const message =
        error?.message ||
        error?.error ||
        "Não foi possível executar a ação. Tente novamente.";
      toast.error(message);
    } finally {
      setActionLoading({ id: null, action: null });
    }
  };

  const handlePauseCampaign = (campaignId) =>
    withCampaignAction(campaignId, "pause", () => whatsappMicroservice.pauseCampaign(campaignId), "Campanha pausada.");

  const handleResumeCampaign = (campaignId) =>
    withCampaignAction(campaignId, "resume", () => whatsappMicroservice.resumeCampaign(campaignId), "Campanha retomada.");

  const handleDeleteCampaign = (campaignId) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Tem certeza que deseja excluir esta campanha?")
    ) {
      return;
    }
    return withCampaignAction(
      campaignId,
      "delete",
      () => whatsappMicroservice.deleteCampaign(campaignId),
      "Campanha excluída."
    );
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>Campanhas WhatsApp</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={refreshCampaigns}
            disabled={loadingCampaigns}
          >
            Atualizar campanhas
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" className={classes.sectionTitle}>
            1. Configuração da campanha
          </Typography>
          <Grid container spacing={3} className={classes.formSection}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nome da campanha"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                fullWidth
                required
                disabled={submitting}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Descrição (opcional)"
                value={campaignDescription}
                onChange={(event) => setCampaignDescription(event.target.value)}
                fullWidth
                disabled={submitting}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                SelectProps={{ native: true }}
                label="Conta WhatsApp"
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                fullWidth
                required
                disabled={loadingAccounts || submitting}
                helperText={
                  loadingAccounts
                    ? "Carregando contas..."
                    : "Selecione a conta vinculada ao número."
                }
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.businessId}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                SelectProps={{ native: true }}
                label="Número remetente"
                value={selectedNumberId}
                onChange={(event) => setSelectedNumberId(event.target.value)}
                fullWidth
                required
                disabled={!availableNumbers.length || submitting}
                helperText={
                  availableNumbers.length
                    ? "Número autenticado que enviará a campanha."
                    : "Nenhum número vinculado à conta selecionada."
                }
              >
                {availableNumbers.map((number) => (
                  <option key={number.id} value={number.id}>
                    {number.displayName || number.phoneNumber}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select={templates.length > 0}
                SelectProps={{ native: true }}
                label={
                  templates.length > 0
                    ? "Template aprovado (Meta)"
                    : "ID do template (Meta)"
                }
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                fullWidth
                required
                disabled={submitting}
                helperText={
                  templatesError
                    ? "Não foi possível listar templates. Informe o ID manualmente."
                    : templates.length > 0
                    ? "Selecione o template utilizado na campanha."
                    : "Digite o ID do template registrado no microserviço."
                }
              >
                {templates.length > 0 ? (
                  <>
                    <option value="">Selecione um template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} · {template.language}
                      </option>
                    ))}
                  </>
                ) : undefined}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="ID do template (manual)"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                fullWidth
                disabled={submitting}
                helperText="Use este campo para sobrescrever o ID selecionado ou informar manualmente."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Rate limit (mensagens/min)"
                type="number"
                inputProps={{ min: 1 }}
                value={rateLimit}
                onChange={(event) => setRateLimit(event.target.value)}
                fullWidth
                disabled={submitting}
              />
            </Grid>
          </Grid>

          {selectedTemplate && (
            <Paper elevation={0} className={classes.helperCard}>
              <Typography variant="subtitle1" gutterBottom>
                Variáveis do template selecionado
              </Typography>
              {selectedTemplate.variables?.length ? (
                <Typography variant="body2">
                  {selectedTemplate.variables.join(", ")}
                </Typography>
              ) : (
                <Typography variant="body2">
                  Este template não possui variáveis dinâmicas.
                </Typography>
              )}
            </Paper>
          )}

          <Divider style={{ margin: "32px 0" }} />

          <Typography variant="h6" className={classes.sectionTitle}>
            2. Arquivo CSV
          </Typography>

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <input
                accept=".csv"
                className={classes.fileInput}
                id="campaign-csv-input"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="campaign-csv-input" className={classes.fileLabel}>
                <Button
                  variant="outlined"
                  color="primary"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={submitting}
                >
                  Selecionar arquivo CSV
                </Button>
                <Typography variant="body2">
                  {csvFile ? csvFile.name : "Nenhum arquivo selecionado"}
                </Typography>
              </label>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="textSecondary">
                O arquivo deve conter uma coluna com o telefone do destinatário
                (ex.: phone, telefone, celular). Outras colunas podem ser
                usadas como variáveis do template.
              </Typography>
            </Grid>
          </Grid>

          <Divider style={{ margin: "32px 0" }} />

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={submitting}
            >
              Criar campanha e enviar CSV
            </Button>
            <Button
              variant="outlined"
              color="default"
              onClick={() => refreshCampaigns()}
              disabled={loadingCampaigns}
            >
              Atualizar lista
            </Button>
          </Box>

          {(submitting || uploading) && <LinearProgress style={{ marginTop: 24 }} />}
        </form>
      </Paper>

      <Paper className={classes.mainPaper}>
        <Typography variant="h6" className={classes.sectionTitle}>
          Campanhas recentes
        </Typography>
        {loadingCampaigns ? (
          <LinearProgress />
        ) : campaigns.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            Nenhuma campanha cadastrada até o momento.
          </Typography>
        ) : (
          <div className={classes.campaignsList}>
            {campaigns.map((campaign) => (
              <div key={campaign.id} className={classes.campaignItem}>
                <Typography variant="subtitle1" gutterBottom>
                  {campaign.name}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">
                      <strong>Status:</strong> {campaign.status}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Rate limit:</strong> {campaign.rateLimit} msg/min
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">
                      <strong>Template:</strong> {campaign.template?.name ?? "-"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Número:</strong>{" "}
                      {campaign.number?.displayName ??
                        campaign.number?.phoneNumber ??
                        "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">
                      <strong>Criada em:</strong>{" "}
                      {formatDateTime(campaign.createdAt)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Atualizada em:</strong>{" "}
                      {formatDateTime(campaign.updatedAt)}
                    </Typography>
                  </Grid>
                </Grid>
                <Box marginTop={2}>
                  <Grid container spacing={1}>
                    {campaign.status === "PROCESSING" && (
                      <Grid item>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PauseIcon />}
                          onClick={() => handlePauseCampaign(campaign.id)}
                          disabled={isActionLoading(campaign.id, "pause")}
                        >
                          {isActionLoading(campaign.id, "pause")
                            ? "Pausando..."
                            : "Pausar"}
                        </Button>
                      </Grid>
                    )}
                    {campaign.status === "PAUSED" && (
                      <Grid item>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleResumeCampaign(campaign.id)}
                          disabled={isActionLoading(campaign.id, "resume")}
                        >
                          {isActionLoading(campaign.id, "resume")
                            ? "Retomando..."
                            : "Retomar"}
                        </Button>
                      </Grid>
                    )}
                    {campaign.status !== "CANCELLED" && (
                      <Grid item>
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          disabled={isActionLoading(campaign.id, "delete")}
                        >
                          {isActionLoading(campaign.id, "delete")
                            ? "Excluindo..."
                            : "Excluir"}
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </div>
            ))}
          </div>
        )}
      </Paper>
    </MainContainer>
  );
};

export default Schedules;