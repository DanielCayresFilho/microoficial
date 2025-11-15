-- Add customer profile columns to campaign contacts
ALTER TABLE "campaign_contacts"
ADD COLUMN "customerName" TEXT,
ADD COLUMN "contractCode" TEXT,
ADD COLUMN "customerCpf" TEXT;

