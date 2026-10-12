-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'X', 'YOUTUBE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "HandleStatus" AS ENUM ('PENDING_PROOF', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ProofMethod" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "Handle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "status" "HandleStatus" NOT NULL DEFAULT 'PENDING_PROOF',
    "level" INTEGER NOT NULL DEFAULT 1,
    "proofCode" TEXT NOT NULL,
    "proofMethod" "ProofMethod",
    "reviewReason" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Handle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "newHandleId" TEXT NOT NULL,
    "existingHandleId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Handle_platform_normalized_idx" ON "Handle"("platform", "normalized");

-- CreateIndex
CREATE INDEX "Handle_userId_idx" ON "Handle"("userId");

-- CreateIndex
CREATE INDEX "Handle_status_idx" ON "Handle"("status");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_newHandleId_existingHandleId_key" ON "Dispute"("newHandleId", "existingHandleId");

-- AddForeignKey
ALTER TABLE "Handle" ADD CONSTRAINT "Handle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_newHandleId_fkey" FOREIGN KEY ("newHandleId") REFERENCES "Handle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_existingHandleId_fkey" FOREIGN KEY ("existingHandleId") REFERENCES "Handle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
