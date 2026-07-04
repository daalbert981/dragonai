-- CreateTable
CREATE TABLE "course_insight" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "description" TEXT,
    "question_count" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_insight_course_id_idx" ON "course_insight"("course_id");

-- AddForeignKey
ALTER TABLE "course_insight" ADD CONSTRAINT "course_insight_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

