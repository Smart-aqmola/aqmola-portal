CREATE TYPE "ContractApplicationStatus" AS ENUM ('draft', 'not_sent', 'registered', 'under_review', 'docs_check_required', 'returned_for_revision', 'awaiting_applicant_signature', 'awaiting_provider_signature', 'inspection_required', 'technical_conditions_required', 'concluded', 'active', 'suspended', 'terminated', 'refused');
CREATE TABLE "ContractApplication" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "status" "ContractApplicationStatus" NOT NULL DEFAULT 'draft',
  "draft" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractApplication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContractApplication_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ContractApplication_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ContractApplication_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ContractApplication_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ContractApplication_ownerId_updatedAt_idx" ON "ContractApplication"("ownerId", "updatedAt");
CREATE INDEX "ContractApplication_propertyId_idx" ON "ContractApplication"("propertyId");
CREATE INDEX "ContractApplication_serviceId_idx" ON "ContractApplication"("serviceId");
CREATE INDEX "ContractApplication_providerId_status_idx" ON "ContractApplication"("providerId", "status");
