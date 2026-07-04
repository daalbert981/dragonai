-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'INSTRUCTOR', 'SUPERADMIN');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "class_id" TEXT NOT NULL,
    "setup_token" TEXT,
    "setup_token_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "syllabus" TEXT,
    "syllabus_synthesis_prompt" TEXT,
    "system_prompt" TEXT,
    "prior_classes" TEXT,
    "upcoming_classes" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-5.4-mini',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "reasoning_level" TEXT,
    "message_history_limit" INTEGER NOT NULL DEFAULT 10,
    "session_retention_policy" TEXT NOT NULL DEFAULT 'forever',
    "session_retention_days" INTEGER,
    "session_retention_hours" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "registration_token" TEXT,
    "registration_token_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_instructor" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrollment" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_material" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT,
    "storage_url" TEXT NOT NULL,
    "description" TEXT,
    "ai_summary" TEXT,
    "extracted_text" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_download" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_role" TEXT,
    "downloaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_download_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_session" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "course_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_upload" (
    "id" TEXT NOT NULL,
    "message_id" TEXT,
    "user_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "extracted_text" TEXT,
    "parsed_data" JSONB,
    "processing_error" TEXT,
    "token_count" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_note" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_schedule" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "session_date" TIMESTAMP(3) NOT NULL,
    "session_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_setup_token_key" ON "user"("setup_token");

-- CreateIndex
CREATE UNIQUE INDEX "course_code_key" ON "course"("code");

-- CreateIndex
CREATE UNIQUE INDEX "course_registration_token_key" ON "course"("registration_token");

-- CreateIndex
CREATE INDEX "course_instructor_course_id_idx" ON "course_instructor"("course_id");

-- CreateIndex
CREATE INDEX "course_instructor_user_id_idx" ON "course_instructor"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_instructor_course_id_user_id_key" ON "course_instructor"("course_id", "user_id");

-- CreateIndex
CREATE INDEX "course_enrollment_course_id_idx" ON "course_enrollment"("course_id");

-- CreateIndex
CREATE INDEX "course_enrollment_user_id_idx" ON "course_enrollment"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollment_course_id_user_id_key" ON "course_enrollment"("course_id", "user_id");

-- CreateIndex
CREATE INDEX "course_material_course_id_idx" ON "course_material"("course_id");

-- CreateIndex
CREATE INDEX "material_download_course_id_idx" ON "material_download"("course_id");

-- CreateIndex
CREATE INDEX "material_download_material_id_idx" ON "material_download"("material_id");

-- CreateIndex
CREATE INDEX "material_download_user_id_idx" ON "material_download"("user_id");

-- CreateIndex
CREATE INDEX "material_download_downloaded_at_idx" ON "material_download"("downloaded_at");

-- CreateIndex
CREATE INDEX "chat_session_user_id_idx" ON "chat_session"("user_id");

-- CreateIndex
CREATE INDEX "chat_session_course_id_idx" ON "chat_session"("course_id");

-- CreateIndex
CREATE INDEX "chat_message_session_id_idx" ON "chat_message"("session_id");

-- CreateIndex
CREATE INDEX "chat_message_user_id_idx" ON "chat_message"("user_id");

-- CreateIndex
CREATE INDEX "file_upload_message_id_idx" ON "file_upload"("message_id");

-- CreateIndex
CREATE INDEX "file_upload_user_id_idx" ON "file_upload"("user_id");

-- CreateIndex
CREATE INDEX "class_note_course_id_idx" ON "class_note"("course_id");

-- CreateIndex
CREATE INDEX "class_note_course_id_type_idx" ON "class_note"("course_id", "type");

-- CreateIndex
CREATE INDEX "class_note_active_at_idx" ON "class_note"("active_at");

-- CreateIndex
CREATE INDEX "class_schedule_course_id_idx" ON "class_schedule"("course_id");

-- CreateIndex
CREATE INDEX "class_schedule_session_date_idx" ON "class_schedule"("session_date");

-- AddForeignKey
ALTER TABLE "course_instructor" ADD CONSTRAINT "course_instructor_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_instructor" ADD CONSTRAINT "course_instructor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollment" ADD CONSTRAINT "course_enrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollment" ADD CONSTRAINT "course_enrollment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_material" ADD CONSTRAINT "course_material_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_download" ADD CONSTRAINT "material_download_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "course_material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_upload" ADD CONSTRAINT "file_upload_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_note" ADD CONSTRAINT "class_note_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

