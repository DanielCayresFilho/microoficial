-- Add metadata to numbers
ALTER TABLE "numbers"
  ADD COLUMN "queueKey" TEXT,
  ADD COLUMN "segments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Add metadata to campaigns
ALTER TABLE "campaigns"
  ADD COLUMN "queueKey" TEXT,
  ADD COLUMN "originUrl" TEXT,
  ADD COLUMN "segments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Track last assignment on conversations
ALTER TABLE "conversations"
  ADD COLUMN "lastAssignedAt" TIMESTAMP(3);

-- Create operator presence table
CREATE TABLE "operator_presence" (
  "id" TEXT NOT NULL,
  "operatorId" TEXT NOT NULL,
  "numberId" TEXT,
  "queueKey" TEXT,
  "connectedUrl" TEXT,
  "segments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAssignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "operator_presence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "operator_presence_operatorId_key" UNIQUE ("operatorId"),
  CONSTRAINT "operator_presence_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "operator_presence_numberId_fkey" FOREIGN KEY ("numberId") REFERENCES "numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

