import React, {
    useState,
    useEffect,
    useReducer,
    useCallback,
    useContext,
    useRef,
  } from "react";
  import { toast } from "react-toastify";
  
  import { makeStyles } from "@material-ui/core/styles";
  import Paper from "@material-ui/core/Paper";
  import Button from "@material-ui/core/Button";
  import Table from "@material-ui/core/Table";
  import TableBody from "@material-ui/core/TableBody";
  import TableCell from "@material-ui/core/TableCell";
  import TableHead from "@material-ui/core/TableHead";
  import TableRow from "@material-ui/core/TableRow";
  import IconButton from "@material-ui/core/IconButton";
  import SearchIcon from "@material-ui/icons/Search";
  import TextField from "@material-ui/core/TextField";
  import InputAdornment from "@material-ui/core/InputAdornment";
  import { GoTrash } from "react-icons/go";
  import tinycolor from "tinycolor2";
  import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
  import { FiEdit3 } from "react-icons/fi";
  import MainContainer from "../../components/MainContainer";
  import MainHeader from "../../components/MainHeader";
  import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
  import Title from "../../components/Title";
  
  import api from "../../services/api";
  import { i18n } from "../../translate/i18n";
  import TableRowSkeleton from "../../components/TableRowSkeleton";
  import TagModal from "../../components/TagModal";
  import ConfirmationModal from "../../components/ConfirmationModal";
  import toastError from "../../errors/toastError";
  import { Chip } from "@material-ui/core";
  import { SocketContext } from "../../context/Socket/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { whatsappMicroservice } from "../Connections/microserviceApi";
  
  const reducer = (state, action) => {
    if (action.type === "LOAD_TAGS") {
      const tags = action.payload;
      const newTags = [];
  
      tags.forEach((tag) => {
        const tagIndex = state.findIndex((s) => s.id === tag.id);
        if (tagIndex !== -1) {
          state[tagIndex] = tag;
        } else {
          newTags.push(tag);
        }
      });
  
      return [...state, ...newTags];
    }
  
    if (action.type === "UPDATE_TAGS") {
      const tag = action.payload;
      const tagIndex = state.findIndex((s) => s.id === tag.id);
  
      if (tagIndex !== -1) {
        state[tagIndex] = tag;
        return [...state];
      } else {
        return [tag, ...state];
      }
    }
  
    if (action.type === "DELETE_TAG") {
      const tagId = action.payload;
  
      const tagIndex = state.findIndex((s) => s.id === tagId);
      if (tagIndex !== -1) {
        state.splice(tagIndex, 1);
      }
      return [...state];
    }
  
    if (action.type === "RESET") {
      return [];
    }
  };
  
  const useStyles = makeStyles((theme) => ({
    mainPaper: {
      flex: 1,
      padding: theme.spacing(1),
      overflowY: "scroll",
      ...theme.scrollbarStyles,
    },
  }));
  
  const Tags = () => {
    const classes = useStyles();
  
    const { user } = useContext(AuthContext);
  
    const [loading, setLoading] = useState(false);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [selectedTag, setSelectedTag] = useState(null);
    const [deletingTag, setDeletingTag] = useState(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [searchParam, setSearchParam] = useState("");
    const [tags, dispatch] = useReducer(reducer, []);
    const [tagModalOpen, setTagModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState("name");
    const [sortDirection, setSortDirection] = useState("asc");
  const tabulationSyncTimeoutRef = useRef(null);
  const isSyncingTabulationsRef = useRef(false);

  const deleteRemoteTabulationByName = useCallback(async (tagName) => {
    if (!tagName) {
      return;
    }

    try {
      const remote = await whatsappMicroservice.getTabulations();
      const target = remote?.find(
        (tabulation) =>
          tabulation?.name?.toLowerCase() === tagName.toLowerCase()
      );

      if (target?.id) {
        await whatsappMicroservice.deleteTabulation(target.id);
      }
    } catch (error) {
      console.warn(
        "Falha ao remover tabulação no microserviço:",
        error?.message || error
      );
    }
  }, []);

  const syncTabulationsWithMicroservice = useCallback(
    async (currentTags) => {
      if (
        !Array.isArray(currentTags) ||
        currentTags.length === 0 ||
        isSyncingTabulationsRef.current
      ) {
        return;
      }

      isSyncingTabulationsRef.current = true;

      try {
        const remote = await whatsappMicroservice.getTabulations();
        const remoteByName = new Map(
          (remote ?? []).map((tabulation) => [
            tabulation.name.toLowerCase(),
            tabulation,
          ])
        );

        for (const tag of currentTags) {
          const normalizedName = tag?.name?.trim();
          if (!normalizedName) {
            continue;
          }

          const key = normalizedName.toLowerCase();
          const payload = {
            name: normalizedName,
            description: tag.description ?? "",
            requiresNotes: Boolean(tag.requiresNotes),
          };

          const existing = remoteByName.get(key);

          if (!existing) {
            await whatsappMicroservice
              .createTabulation(payload)
              .catch((error) =>
                console.warn(
                  "Não foi possível criar tabulação no microserviço:",
                  error?.message || error
                )
              );
            continue;
          }

          const needsUpdate =
            (existing.description ?? "") !== (payload.description ?? "") ||
            Boolean(existing.requiresNotes) !== payload.requiresNotes;

          if (needsUpdate) {
            await whatsappMicroservice
              .updateTabulation(existing.id, payload)
              .catch((error) =>
                console.warn(
                  "Não foi possível atualizar tabulação no microserviço:",
                  error?.message || error
                )
              );
          }
        }
      } catch (error) {
        console.warn(
          "Falha ao sincronizar tabulações com o microserviço:",
          error?.message || error
        );
      } finally {
        isSyncingTabulationsRef.current = false;
      }
    },
    []
  );
  
  const fetchTags = useCallback(async () => {
      try {
        const { data } = await api.get("/tags/", {
          params: { searchParam, pageNumber },
        });
        dispatch({ type: "LOAD_TAGS", payload: data.tags });
        setHasMore(data.hasMore);
        setLoading(false);
      syncTabulationsWithMicroservice(data.tags);
      } catch (err) {
        if (err.response && err.response.data && err.response.data.message) {
          toastError(err.response.data.message);
      } else {
          toastError(err);
      }
      }
  }, [pageNumber, searchParam, syncTabulationsWithMicroservice]);
  
    const socketManager = useContext(SocketContext);
  
    useEffect(() => {
      dispatch({ type: "RESET" });
      setPageNumber(1);
    }, [searchParam]);
  
    useEffect(() => {
      setLoading(true);
      const delayDebounceFn = setTimeout(() => {
        fetchTags();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }, [fetchTags, pageNumber, searchParam]);

  useEffect(() => {
    if (!tags.length) {
      return;
    }

    if (tabulationSyncTimeoutRef.current) {
      clearTimeout(tabulationSyncTimeoutRef.current);
    }

    tabulationSyncTimeoutRef.current = window.setTimeout(() => {
      syncTabulationsWithMicroservice(tags);
    }, 500);

    return () => {
      if (tabulationSyncTimeoutRef.current) {
        clearTimeout(tabulationSyncTimeoutRef.current);
        tabulationSyncTimeoutRef.current = null;
      }
    };
  }, [syncTabulationsWithMicroservice, tags]);
  
    useEffect(() => {
      const socket = socketManager.getSocket(user.companyId);
  
      socket.on("user", (data) => {
        if (data.action === "update" || data.action === "create") {
          dispatch({ type: "UPDATE_TAGS", payload: data.tags });
        }
  
        if (data.action === "delete") {
          dispatch({ type: "DELETE_USER", payload: +data.tagId });
        }
      });
  
      return () => {
        socket.disconnect();
      };
    }, [socketManager, user]);
  
    const handleOpenTagModal = () => {
      setSelectedTag(null);
      setTagModalOpen(true);
    };
  
    const handleCloseTagModal = () => {
      setSelectedTag(null);
      setTagModalOpen(false);
    };
  
    const handleSearch = (event) => {
      setSearchParam(event.target.value);
    };
  
    const handleEditTag = (tag) => {
      setSelectedTag(tag);
      setTagModalOpen(true);
    };
  
    const handleDeleteTag = async (tagId) => {
      try {
      const tagToDelete = tags.find((tag) => tag.id === tagId);
        await api.delete(`/tags/${tagId}`);
        toast.success(i18n.t("tags.toasts.deleted"));
      if (tagToDelete?.name) {
        await deleteRemoteTabulationByName(tagToDelete.name);
      }
      } catch (err) {
        if (err.response && err.response.data && err.response.data.message) {
          toastError(err.response.data.message);
      } else {
          toastError(err);
      }
      }
      setDeletingTag(null);
      setSearchParam("");
      setPageNumber(1);
  
      dispatch({ type: "RESET" });
      setPageNumber(1);
      await fetchTags();
    };
  
    const loadMore = () => {
      setPageNumber((prevState) => prevState + 1);
    };
  
    const handleScroll = (e) => {
      if (!hasMore || loading) return;
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - (scrollTop + 100) < clientHeight) {
        loadMore();
      }
    };
  
    const getTextColor = (bgColor) => (tinycolor(bgColor).isLight() ? "#000" : "#FFF");
    
    const DynamicText = (color) => {
      const textColor = getTextColor(color);
  
      return textColor;
    };
  
    const handleSort = (field) => {
      if (field === sortBy) {
        setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDirection("asc");
      }
    };
  
    const sortedTags = [...tags].sort((a, b) => {
      const aValue = a[sortBy]?.toString().toLowerCase() || "";
      const bValue = b[sortBy]?.toString().toLowerCase() || "";
  
      if (sortBy === "ticketsCount") {
        return sortDirection === "asc" ? a.ticketsCount - b.ticketsCount : b.ticketsCount - a.ticketsCount;
      }
  
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  
  
  return (
      <MainContainer>
        <ConfirmationModal
          title={deletingTag && `${i18n.t("tags.confirmationModal.deleteTitle")}`}
          open={confirmModalOpen}
          onClose={setConfirmModalOpen}
          onConfirm={() => handleDeleteTag(deletingTag.id)}
        >
          {i18n.t("tags.confirmationModal.deleteMessage")}
        </ConfirmationModal>
        <TagModal
          open={tagModalOpen}
          onClose={handleCloseTagModal}
          reload={fetchTags}
          aria-labelledby="form-dialog-title"
          tagId={selectedTag && selectedTag.id}
        />
        <MainHeader>
          <Title>{i18n.t("tags.title")}</Title>
          <MainHeaderButtonsWrapper>
            <TextField
              placeholder={i18n.t("contacts.searchPlaceholder")}
              type="search"
              value={searchParam}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon style={{ color: "gray" }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenTagModal}
              style={{ fontWeight: "bold"}}
            >
              {i18n.t("tags.buttons.add")}
            </Button>		  
          </MainHeaderButtonsWrapper>
        </MainHeader>
        <Paper
          className={classes.mainPaper}
          variant="outlined"
          onScroll={handleScroll}
          style={{ borderRadius: "15px"}}
        >
          <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                align="center"
                onClick={() => handleSort("name")}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                {i18n.t("tags.table.name")}{" "}
                {sortBy === "name" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
              </TableCell>
              <TableCell
                align="center"
                onClick={() => handleSort("ticketsCount")}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                {i18n.t("tags.table.tickets")}{" "}
                {sortBy === "ticketsCount" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
              </TableCell>
              <TableCell align="center">{i18n.t("tags.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
            <TableBody>
              <>
                {sortedTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell align="center">
                      <Chip
                        variant="outlined"
                        style={{
                          backgroundColor: tag.color,
                          color: DynamicText(tag.color),
                          fontWeight: "600"
                        }}
                        label={tag.name}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">{tag.ticketsCount}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleEditTag(tag)}>
                        <FiEdit3 />
                      </IconButton>
  
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setConfirmModalOpen(true);
                          setDeletingTag(tag);
                        }}
                      >
                        <GoTrash />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {loading && <TableRowSkeleton columns={4} />}
              </>
            </TableBody>
          </Table>
        </Paper>
      </MainContainer>
    );
  };
  
  export default Tags;