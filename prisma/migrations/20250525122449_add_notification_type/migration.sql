/*
  Warnings:

  - Added the required column `type` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_UPDATE');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "type" "NotificationType" NOT NULL;
