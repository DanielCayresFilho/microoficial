import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemSecondaryAction,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import RefreshIcon from "@material-ui/icons/Refresh";
import FilterListIcon from "@material-ui/icons/FilterList";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import PhoneIcon from "@material-ui/icons/Phone";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import { format } from "date-fns";
import { whatsappMicroservice } from "./microserviceApi";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(4),
    minHeight: "100vh",
    backgroundColor: theme.palette.background.default,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  actionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  searchInput: {
    width: "100%",
    maxWidth: 360,
  },
  gridContainer: {
    marginTop: theme.spacing(2),
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: theme.spacing(2),
    boxShadow: theme.shadows[2],
  },
  cardHeader: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  cardContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
  },
  numbersStack: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
  },
  numberItem: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(1),
    border: `1px solid ${theme.palette.grey[200]}`,
    backgroundColor: theme.palette.background.paper,
  },
  emptyState: {
    padding: theme.spacing(12, 4),
    textAlign: "center",
    borderRadius: theme.spacing(2),
    border: `1px dashed ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(12, 2),
    gap: theme.spacing(2),
  },
  statusChip: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 600,
  },
  footerActions: {
    display: "flex",
    justifyContent: "space-between",
    gap: theme.spacing(1),
  },
  errorBanner: {
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1),
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.dark,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  successBanner: {
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1),
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.dark,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  smallText: {
    color: theme.palette.text.secondary,
    fontSize: "0.875rem",
  },
  stackRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  stackColumn: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
  },
  dialogContent: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    minWidth: 400,
  },
}));

const API_BASE_URL =
  process.env.REACT_APP_WHATSAPP_API_BASE_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_API_BASE_URL ||
  process.env.WHATSAPP_API_BASE_URL ||
  "https://vend.covenos.com.br/api";

const formatPhoneNumber = (value) => {
  if (!value) return "Número não informado";
  const sanitized = value.replace(/\D/g, "");
  if (sanitized.length < 10) {
    return value;
  }
  return `+${sanitized}`;
};

const formatDate = (value) => {
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch (error) {
    return "Data indisponível";
  }
};

const statusColorMap = {
  true: "primary",
  false: "default",
};

const Connections = () => {
  const classes = useStyles();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [openNumberDialog, setOpenNumberDialog] = useState(false);
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedNumberForTemplates, setSelectedNumberForTemplates] = useState(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [addingNumber, setAddingNumber] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesList, setTemplatesList] = useState([]);
  const [deletingTemplateId, setDeletingTemplateId] = useState(null);
  
  // Form states
  const [accountForm, setAccountForm] = useState({
    name: "",
    businessId: "",
    accessToken: "",
  });
  
  const [numberForm, setNumberForm] = useState({
    phoneNumber: "",
    phoneNumberId: "",
    displayName: "",
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    language: "",
    templateId: "",
    category: "MARKETING",
    status: "APPROVED",
  });

  const resetTemplateForm = () =>
    setTemplateForm({
      name: "",
      language: "",
      templateId: "",
      category: "MARKETING",
      status: "APPROVED",
    });

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await whatsappMicroservice.getAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err?.message ||
        err?.error ||
        "Não foi possível carregar as contas do microserviço.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    if (!searchTerm) {
      return accounts;
    }

    const term = searchTerm.trim().toLowerCase();
    return accounts.filter((account) => {
      const numbersMatch =
        account.numbers?.some((number) =>
          [number.phoneNumber, number.displayName, number.phoneNumberId]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(term))
        ) ?? false;

      return (
        account.name?.toLowerCase().includes(term) ||
        account.businessId?.toLowerCase().includes(term) ||
        numbersMatch
      );
    });
  }, [accounts, searchTerm]);

  const handleOpenAccountDialog = () => {
    setAccountForm({ name: "", businessId: "", accessToken: "" });
    setOpenAccountDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseAccountDialog = () => {
    setOpenAccountDialog(false);
    setAccountForm({ name: "", businessId: "", accessToken: "" });
  };

  const handleOpenNumberDialog = (account) => {
    setSelectedAccount(account);
    setNumberForm({ phoneNumber: "", phoneNumberId: "", displayName: "" });
    setOpenNumberDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseNumberDialog = () => {
    setOpenNumberDialog(false);
    setSelectedAccount(null);
    setNumberForm({ phoneNumber: "", phoneNumberId: "", displayName: "" });
  };

  const handleCreateAccount = async () => {
    setCreatingAccount(true);
    setError(null);
    setSuccess(null);

    try {
      await whatsappMicroservice.createAccount(accountForm);
      setSuccess("Conta criada com sucesso!");
      handleCloseAccountDialog();
      await fetchAccounts();
    } catch (err) {
      setError(err.message || err.error || "Erro ao criar conta");
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleAddNumber = async () => {
    setAddingNumber(true);
    setError(null);
    setSuccess(null);

    try {
      await whatsappMicroservice.addNumberToAccount(
        selectedAccount.id,
        numberForm
      );
      setSuccess("Número adicionado com sucesso!");
      handleCloseNumberDialog();
      await fetchAccounts();
    } catch (err) {
      setError(err.message || err.error || "Erro ao adicionar número");
    } finally {
      setAddingNumber(false);
    }
  };

  const fetchTemplatesForNumber = async (numberId) => {
    setTemplatesLoading(true);
    setError(null);
    try {
      const data = await whatsappMicroservice.getTemplates({ numberId });
      setTemplatesList(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err?.message ||
        err?.error ||
        "Não foi possível carregar os templates do número.";
      setError(message);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleOpenTemplateManager = async (account, number) => {
    setSelectedAccount(account);
    setSelectedNumberForTemplates(number);
    resetTemplateForm();
    setOpenTemplateDialog(true);
    setError(null);
    setSuccess(null);
    await fetchTemplatesForNumber(number.id);
  };

  const handleCloseTemplateDialog = () => {
    setOpenTemplateDialog(false);
    setSelectedNumberForTemplates(null);
    resetTemplateForm();
    setTemplatesList([]);
    setDeletingTemplateId(null);
  };

  const handleCreateTemplate = async () => {
    if (!selectedNumberForTemplates) {
      return;
    }

    if (!templateForm.name.trim() || !templateForm.language.trim()) {
      setError("Informe o nome e a linguagem do template.");
      return;
    }

    setCreatingTemplate(true);
    setError(null);
    setSuccess(null);

    try {
      await whatsappMicroservice.createTemplate({
        name: templateForm.name.trim(),
        language: templateForm.language.trim(),
        templateId:
          templateForm.templateId?.trim() || templateForm.name.trim(),
        category: templateForm.category?.trim() || "MARKETING",
        status: templateForm.status?.trim() || "APPROVED",
        numberId: selectedNumberForTemplates.id,
        variables: [],
      });
      setSuccess("Template criado com sucesso!");
      resetTemplateForm();
      await fetchTemplatesForNumber(selectedNumberForTemplates.id);
    } catch (err) {
      setError(err.message || err.error || "Erro ao criar template");
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!selectedNumberForTemplates) {
      return;
    }

    setDeletingTemplateId(templateId);
    setError(null);
    setSuccess(null);
    try {
      await whatsappMicroservice.deleteTemplate(templateId);
      setSuccess("Template removido com sucesso!");
      await fetchTemplatesForNumber(selectedNumberForTemplates.id);
    } catch (err) {
      setError(err.message || err.error || "Erro ao remover template");
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const renderNumbers = (account, numbers = []) => {
    if (!numbers.length) {
      return (
        <Typography className={classes.smallText}>
          Esta conta ainda não possui números cadastrados.
        </Typography>
      );
    }

    return (
      <Box className={classes.numbersStack}>
        {numbers.map((number) => (
          <Box key={number.id} className={classes.numberItem}>
            <Box display="flex" alignItems="center" gridGap={8}>
              <WhatsAppIcon fontSize="small" color="action" />
              <Typography variant="subtitle2">
                {formatPhoneNumber(number.phoneNumber)}
              </Typography>
            </Box>
            <Typography className={classes.smallText}>
              ID do número: {number.phoneNumberId}
            </Typography>
            {number.displayName && (
              <Typography className={classes.smallText}>
                Nome exibido: {number.displayName}
              </Typography>
            )}
            <Box className={classes.stackRow}>
              <Chip
                size="small"
                label={`Qualidade: ${number.qualityRating ?? "N/A"}`}
                color="default"
              />
              <Chip
                size="small"
                label={number.isActive ? "Ativo" : "Inativo"}
                color={statusColorMap[number.isActive] || "default"}
                className={classes.statusChip}
              />
            </Box>
            <Typography className={classes.smallText}>
              Criado em: {formatDate(number.createdAt)}
            </Typography>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              marginTop={1}
            >
              <Typography className={classes.smallText}>
                Templates vinculados: {number._count?.templates ?? 0}
              </Typography>
              <Button
                size="small"
                color="primary"
                onClick={() => handleOpenTemplateManager(account, number)}
              >
                Gerenciar templates
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box className={classes.loadingState}>
          <CircularProgress />
          <Typography variant="body1">
            Carregando contas vinculadas ao WhatsApp Business...
          </Typography>
        </Box>
      );
    }

    if (!filteredAccounts.length) {
      return (
        <Box className={classes.emptyState}>
          <Typography variant="h6" gutterBottom>
            Nenhuma conta encontrada
          </Typography>
          <Typography className={classes.smallText} gutterBottom>
            Cadastre uma conta através do fluxo de Embedded Signup do WhatsApp
            ou informe manualmente os dados obtidos pelo time de Meta.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAccountDialog}
            style={{ marginTop: 16 }}
          >
            Adicionar Conta
          </Button>
        </Box>
      );
    }

    return (
      <Grid container spacing={3} className={classes.gridContainer}>
        {filteredAccounts.map((account) => (
          <Grid item xs={12} sm={6} lg={4} key={account.id}>
            <Card className={classes.card}>
              <CardHeader
                className={classes.cardHeader}
                title={
                  <Box className={classes.stackRow}>
                    <Typography variant="h6">{account.name}</Typography>
                    <Chip
                      size="small"
                      label={account.isActive ? "Ativa" : "Inativa"}
                      color={statusColorMap[account.isActive] || "default"}
                      className={classes.statusChip}
                    />
                  </Box>
                }
                subheader={`Business ID: ${account.businessId}`}
                action={
                  <Tooltip title="Informações complementares">
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              />
              <CardContent className={classes.cardContent}>
                <Box className={classes.stackColumn}>
                  <Typography variant="body2">
                    Última atualização: {formatDate(account.updatedAt)}
                  </Typography>
                  <Typography variant="body2">
                    Total de campanhas: {account._count?.campaigns ?? 0}
                  </Typography>
                </Box>

                <Divider />

                <Typography variant="subtitle2">
                  Números vinculados ({account.numbers?.length ?? 0})
                </Typography>

                {renderNumbers(account, account.numbers)}
              </CardContent>
              <CardActions className={classes.footerActions}>
                <Button
                  size="small"
                  color="primary"
                  startIcon={<PhoneIcon />}
                  onClick={() => handleOpenNumberDialog(account)}
                >
                  Adicionar Número
                </Button>
                <Button
                  size="small"
                  color="primary"
                  href={`${API_BASE_URL}/accounts/${account.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver no Microserviço
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Box className={classes.titleRow}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Conexões WhatsApp Business
            </Typography>
            <Typography className={classes.smallText}>
              Integração ativa com o microserviço oficial do WhatsApp em{" "}
              <strong>vend.covenos.com.br</strong>. Gerencie contas, números e
              acompanhe o status de cada conexão.
            </Typography>
          </Box>
          <Box className={classes.stackRow}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenAccountDialog}
            >
              Adicionar Conta
            </Button>
            <Tooltip title="Aplicar filtros (em breve)">
              <span>
                <Button
                  variant="outlined"
                  color="default"
                  startIcon={<FilterListIcon />}
                  disabled
                >
                  Filtros
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              color="default"
              startIcon={<RefreshIcon />}
              onClick={fetchAccounts}
              disabled={loading}
            >
              Atualizar
            </Button>
          </Box>
        </Box>

        <Box className={classes.actionRow}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Buscar por conta, Business ID ou número..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={classes.searchInput}
            InputProps={{
              startAdornment: (
                <SearchIcon
                  fontSize="small"
                  style={{ marginRight: 8, color: "#9e9e9e" }}
                />
              ),
            }}
          />
        </Box>

        {error && (
          <Box className={classes.errorBanner}>
            <InfoOutlinedIcon fontSize="small" />
            <Box>
              <Typography variant="subtitle2">Erro</Typography>
              <Typography className={classes.smallText}>{error}</Typography>
            </Box>
          </Box>
        )}

        {success && (
          <Box className={classes.successBanner}>
            <InfoOutlinedIcon fontSize="small" />
            <Box>
              <Typography variant="subtitle2">Sucesso</Typography>
              <Typography className={classes.smallText}>{success}</Typography>
            </Box>
          </Box>
        )}
      </Box>

      {renderContent()}

      {/* Dialog para adicionar conta */}
      <Dialog
        open={openAccountDialog}
        onClose={handleCloseAccountDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adicionar Nova Conta</DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <TextField
            label="Nome da Conta"
            variant="outlined"
            fullWidth
            value={accountForm.name}
            onChange={(e) =>
              setAccountForm({ ...accountForm, name: e.target.value })
            }
            placeholder="Ex: Meu Negócio"
            required
          />
          <TextField
            label="Business ID (WABA ID)"
            variant="outlined"
            fullWidth
            value={accountForm.businessId}
            onChange={(e) =>
              setAccountForm({ ...accountForm, businessId: e.target.value })
            }
            placeholder="Ex: 123456789012345"
            required
          />
          <TextField
            label="Access Token"
            variant="outlined"
            fullWidth
            value={accountForm.accessToken}
            onChange={(e) =>
              setAccountForm({ ...accountForm, accessToken: e.target.value })
            }
            placeholder="Token de acesso fornecido pela Meta"
            required
            type="password"
          />
          <Typography variant="caption" className={classes.smallText}>
            * Todos os campos são obrigatórios. Obtenha esses dados no{" "}
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
            >
              Meta for Developers
            </a>
            .
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAccountDialog} color="default">
            Cancelar
          </Button>
          <Button
            onClick={handleCreateAccount}
            color="primary"
            variant="contained"
            disabled={
              creatingAccount ||
              !accountForm.name ||
              !accountForm.businessId ||
              !accountForm.accessToken
            }
          >
            {creatingAccount ? <CircularProgress size={20} /> : "Criar Conta"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para adicionar número */}
      <Dialog
        open={openNumberDialog}
        onClose={handleCloseNumberDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Adicionar Número à Conta {selectedAccount?.name}
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <TextField
            label="Número de Telefone"
            variant="outlined"
            fullWidth
            value={numberForm.phoneNumber}
            onChange={(e) =>
              setNumberForm({ ...numberForm, phoneNumber: e.target.value })
            }
            placeholder="Ex: +5511999999999"
            required
            helperText="Formato: +[código do país][DDD][número]"
          />
          <TextField
            label="Phone Number ID"
            variant="outlined"
            fullWidth
            value={numberForm.phoneNumberId}
            onChange={(e) =>
              setNumberForm({ ...numberForm, phoneNumberId: e.target.value })
            }
            placeholder="Ex: 123456789012345"
            required
            helperText="ID fornecido pela API do WhatsApp Business"
          />
          <TextField
            label="Nome de Exibição (Opcional)"
            variant="outlined"
            fullWidth
            value={numberForm.displayName}
            onChange={(e) =>
              setNumberForm({ ...numberForm, displayName: e.target.value })
            }
            placeholder="Ex: Atendimento Principal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNumberDialog} color="default">
            Cancelar
          </Button>
          <Button
            onClick={handleAddNumber}
            color="primary"
            variant="contained"
            disabled={
              addingNumber ||
              !numberForm.phoneNumber ||
              !numberForm.phoneNumberId
            }
          >
            {addingNumber ? <CircularProgress size={20} /> : "Adicionar Número"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para gerenciar templates */}
      <Dialog
        open={openTemplateDialog}
        onClose={handleCloseTemplateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Templates para o número{" "}
          {selectedNumberForTemplates?.displayName ||
            formatPhoneNumber(selectedNumberForTemplates?.phoneNumber ?? "")}
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <Typography variant="subtitle1">Adicionar novo template</Typography>
          <TextField
            label="Nome do template"
            variant="outlined"
            fullWidth
            value={templateForm.name}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, name: e.target.value })
            }
            placeholder="Ex: hello_world"
            required
          />
          <TextField
            label="Linguagem"
            variant="outlined"
            fullWidth
            value={templateForm.language}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, language: e.target.value })
            }
            placeholder="Ex: en_US"
            required
          />
          <TextField
            label="Template ID (opcional)"
            variant="outlined"
            fullWidth
            value={templateForm.templateId}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, templateId: e.target.value })
            }
            placeholder="ID registrado na Meta. Se vazio, usamos o nome."
          />
          <TextField
            label="Categoria (opcional)"
            variant="outlined"
            fullWidth
            value={templateForm.category}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, category: e.target.value })
            }
            placeholder="MARKETING, UTILITY..."
          />
          <TextField
            label="Status (opcional)"
            variant="outlined"
            fullWidth
            value={templateForm.status}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, status: e.target.value })
            }
            placeholder="APPROVED, PENDING..."
          />
          <Box display="flex" justifyContent="flex-end">
            <Button
              onClick={handleCreateTemplate}
              color="primary"
              variant="contained"
              disabled={
                creatingTemplate ||
                !templateForm.name.trim() ||
                !templateForm.language.trim()
              }
            >
              {creatingTemplate ? <CircularProgress size={20} /> : "Adicionar"}
            </Button>
          </Box>

          <Divider />

          <Typography variant="subtitle1">Templates cadastrados</Typography>
          {templatesLoading ? (
            <LinearProgress />
          ) : templatesList.length === 0 ? (
            <Typography className={classes.smallText}>
              Nenhum template vinculado a este número.
            </Typography>
          ) : (
            <List dense>
              {templatesList.map((template) => (
                <ListItem key={template.id}>
                  <ListItemText
                    primary={`${template.name} (${template.language})`}
                    secondary={`Template ID: ${template.templateId}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={deletingTemplateId === template.id}
                    >
                      {deletingTemplateId === template.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <DeleteOutlineIcon />
                      )}
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTemplateDialog} color="default">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Connections;