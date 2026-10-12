-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'CONFIRMED', 'DISMISSED');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "realHandleId" TEXT NOT NULL,
    "reportedHandleId" TEXT,
    "platform" "Platform" NOT NULL,
    "handle" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_platform_normalized_idx" ON "Report"("platform", "normalized");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_realHandleId_fkey" FOREIGN KEY ("realHandleId") REFERENCES "Handle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedHandleId_fkey" FOREIGN KEY ("reportedHandleId") REFERENCES "Handle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
