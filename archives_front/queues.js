import React, { useEffect, useReducer, useState, useContext } from "react";

import {
  Button,
  FormControl,
  IconButton,
  makeStyles,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@material-ui/core";
import { FiEdit3 } from "react-icons/fi";
import { GoTrash } from "react-icons/go";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { DeleteOutline, Edit } from "@material-ui/icons";
import QueueModal from "../../components/QueueModal";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import { SocketContext } from "../../context/Socket/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  customTableCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_QUEUES") {
    const queues = action.payload;
    const newQueues = [];

    queues.forEach((queue) => {
      const queueIndex = state.findIndex((q) => q.id === queue.id);
      if (queueIndex !== -1) {
        state[queueIndex] = queue;
      } else {
        newQueues.push(queue);
      }
    });

    return [...state, ...newQueues];
  }

  if (action.type === "UPDATE_QUEUES") {
    const queue = action.payload;
    const queueIndex = state.findIndex((u) => u.id === queue.id);

    console.log("Queue", queue);

    if (queueIndex !== -1) {
      state[queueIndex] = queue;
      return [...state];
    } else {
      return [queue, ...state];
    }
  }

  if (action.type === "DELETE_QUEUE") {
    const queueId = action.payload;
    const queueIndex = state.findIndex((q) => q.id === queueId);
    if (queueIndex !== -1) {
      state.splice(queueIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const Queues = () => {
  const classes = useStyles();

  const [queues, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);

  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [searchParam, setSearchParam] = useState("");

  const socketManager = useContext(SocketContext);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user?.companyId === 1) {
      const fetchCompanies = async () => {
        try {
          const endpoint = "/companies/list";
          const { data } = await api.get(endpoint);
          setCompanies(Array.isArray(data) ? data : []);
        } 		catch (err) {
          if (err.response && err.response.data && err.response.data.message) {
            toastError(err.response.data.message);
        } else {
            toastError(err);
        }
      }
      };
      fetchCompanies();
    }
  }, [user?.companyId]);


  useEffect(() => {
    dispatch({ type: "RESET" }); // Resetar o estado de filas
    setLoading(true); // Indicar que a requisição começou
  
    const delayDebounceFn = setTimeout(() => {
      const fetchQueues = async () => {
        try {
          const endpoint =
            user.companyId === 1
              ? selectedCompanyId
                ? `/queue?companyId=${selectedCompanyId}&search=${searchParam}` 
                : `/queue?search=${searchParam}` 
              : `/queue/company?search=${searchParam}`; 
  
          const { data } = await api.get(endpoint);
          dispatch({ type: "LOAD_QUEUES", payload: data }); 
          setLoading(false); // Remove o "o" aqui
        } 		catch (err) {
          setLoading(false);
          if (err.response && err.response.data && err.response.data.message) {
            toastError(err.response.data.message);
        } else {
            toastError(err);
        }
      }
      };
  
      fetchQueues();
  
    }, 500); 
  
    return () => clearTimeout(delayDebounceFn);
  }, [user.companyId, selectedCompanyId, searchParam]);
  

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-queue`, (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_QUEUES", payload: data.queue });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_QUEUE", payload: data.queueId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [socketManager]);

  const handleOpenQueueModal = () => {
    setQueueModalOpen(true);
    setSelectedQueue(null);
  };

  const handleCloseQueueModal = () => {
    setQueueModalOpen(false);
    setSelectedQueue(null);
  };

  const handleEditQueue = (queue) => {
    setSelectedQueue(queue);
    setQueueModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedQueue(null);
  };

  const handleDeleteQueue = async (queueId) => {
    try {
      await api.delete(`/queue/${queueId}`);
      toast.success(i18n.t("Fila excluída com sucesso!"));
    } 		catch (err) {
			if (err.response && err.response.data && err.response.data.message) {
				toastError(err.response.data.message);
		} else {
				toastError(err);
		}
	}
    setSelectedQueue(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          selectedQueue &&
          `${i18n.t("queues.confirmationModal.deleteTitle")} ${selectedQueue.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteQueue(selectedQueue.id)}
      >
        {i18n.t("queues.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <QueueModal open={queueModalOpen} onClose={handleCloseQueueModal} queueId={selectedQueue?.id} />
      <MainHeader>
        <Title>{i18n.t("queues.title")}</Title>
        <MainHeaderButtonsWrapper>
          {user.companyId === 1 && (
            <FormControl style={{ marginLeft: "16px" }}>
              <Select
                labelId="select-company-label"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                native
                inputProps={{
                  style: { textAlign: 'center' }
                }}
              >
                <option value="">Selecionar Carteira</option>
                {Array.isArray(companies) &&
                  companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
              </Select>
            </FormControl>
          )}

          <Button variant="contained" color="primary" onClick={handleOpenQueueModal} style={{ fontWeight: "bold" }}>
            {i18n.t("queues.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined" style={{ borderRadius: "15px" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{i18n.t("queues.table.id")}</TableCell>
              <TableCell align="center">{i18n.t("queues.table.name")}</TableCell>
              <TableCell align="center">{i18n.t("queues.table.color")}</TableCell>
              <TableCell align="center">{i18n.t("queues.table.greeting")}</TableCell>
              {user.companyId === 1 && !selectedCompanyId && (
              <TableCell align="center">{i18n.t("Carteira")}</TableCell>
              )}
              <TableCell align="center">{i18n.t("queues.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {queues.map((queue) => (
              <TableRow key={queue.id}>
                <TableCell align="center">{queue.id}</TableCell>
                <TableCell align="center">{queue.name}</TableCell>
                <TableCell align="center">
                  <div className={classes.customTableCell}>
                    <span
                      style={{
                        backgroundColor: queue.color,
                        width: 60,
                        height: 20,
                        alignSelf: "center",
                        borderRadius:6
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell align="center">
                  <div className={classes.customTableCell}>
                    <Typography style={{ width: 300, align: "center" }} noWrap variant="body2">
                      {queue.greetingMessage}
                    </Typography>
                  </div>
                </TableCell>
                {user.companyId == 1 && !selectedCompanyId && (
                <TableCell align="center">
                  {queue.company?.name}
                </TableCell>
                )}
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleEditQueue(queue)}>
                    <FiEdit3 />
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedQueue(queue);
                      setConfirmModalOpen(true);
                    }}
                  >
                    <GoTrash />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={4} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Queues;