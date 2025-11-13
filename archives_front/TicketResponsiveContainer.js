import React from "react";
import { useMediaQuery, useTheme } from "@material-ui/core";
import TicketsAdvanced from "../TicketsAdvanced";
import Tickets from "../Tickets";

const TicketResponsiveContainer = ({ conversationId }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  if (isDesktop) {
    return <TicketsAdvanced />;
  }

  return <Tickets conversationId={conversationId} />;
};

export default TicketResponsiveContainer;