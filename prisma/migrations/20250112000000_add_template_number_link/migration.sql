-- Add optional relation between templates and numbers
ALTER TABLE "templates" ADD COLUMN "numberId" TEXT;

ALTER TABLE "templates"
  ADD CONSTRAINT "templates_numberId_fkey"
  FOREIGN KEY ("numberId") REFERENCES "numbers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

