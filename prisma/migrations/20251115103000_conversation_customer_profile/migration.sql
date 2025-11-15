-- Add manual customer profile fields to conversations
ALTER TABLE "conversations"
ADD COLUMN "customerContract" TEXT,
ADD COLUMN "customerCpf" TEXT;

