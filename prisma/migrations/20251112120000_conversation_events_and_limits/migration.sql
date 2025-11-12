-- Create enums
CREATE TYPE "ConversationEventSource" AS ENUM ('CUSTOMER', 'OPERATOR', 'CAMPAIGN', 'SYSTEM');
CREATE TYPE "ConversationEventDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'NONE');
CREATE TYPE "ConversationEventType" AS ENUM ('MESSAGE', 'TABULATION', 'CPC', 'NOTE');

-- Add columns to conversations
ALTER TABLE "conversations"
  ADD COLUMN "lastAgentMessageAt" TIMESTAMP(3),
  ADD COLUMN "lastCustomerMessageAt" TIMESTAMP(3),
  ADD COLUMN "manualAttemptsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "manualAttemptsWindowStart" TIMESTAMP(3),
  ADD COLUMN "manualBlockedUntil" TIMESTAMP(3),
  ADD COLUMN "cpcMarkedAt" TIMESTAMP(3),
  ADD COLUMN "cpcMarkedBy" TEXT;

-- Create campaign_contacts table
CREATE TABLE "campaign_contacts" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "rawPayload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "lastAttemptAt" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3),
  "lastStatusAt" TIMESTAMP(3),
  "failedReason" TEXT,
  "cpcMarkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_contacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_contacts_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "campaign_contacts_campaignId_phoneNumber_key"
  ON "campaign_contacts" ("campaignId", "phoneNumber");

CREATE INDEX "campaign_contacts_phoneNumber_idx"
  ON "campaign_contacts" ("phoneNumber");

-- Create conversation_events table
CREATE TABLE "conversation_events" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT,
  "messageId" TEXT,
  "campaignId" TEXT,
  "campaignContactId" TEXT,
  "numberId" TEXT,
  "operatorId" TEXT,
  "phoneNumber" TEXT NOT NULL,
  "source" "ConversationEventSource" NOT NULL,
  "direction" "ConversationEventDirection" NOT NULL,
  "eventType" "ConversationEventType" NOT NULL,
  "payload" JSONB,
  "cpcMarked" BOOLEAN NOT NULL DEFAULT false,
  "tabulationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversation_events_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "conversation_events_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "messages"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "conversation_events_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "conversation_events_campaignContactId_fkey"
    FOREIGN KEY ("campaignContactId") REFERENCES "campaign_contacts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "conversation_events_numberId_fkey"
    FOREIGN KEY ("numberId") REFERENCES "numbers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "conversation_events_operatorId_fkey"
    FOREIGN KEY ("operatorId") REFERENCES "operators"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "conversation_events_tabulationId_fkey"
    FOREIGN KEY ("tabulationId") REFERENCES "tabulations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "conversation_events_phoneNumber_idx"
  ON "conversation_events" ("phoneNumber");

CREATE INDEX "conversation_events_createdAt_idx"
  ON "conversation_events" ("createdAt");

CREATE INDEX "conversation_events_conversationId_createdAt_idx"
  ON "conversation_events" ("conversationId", "createdAt");

CREATE INDEX "conversation_events_campaignId_createdAt_idx"
  ON "conversation_events" ("campaignId", "createdAt");

