// Regressão (LAUNCH_PLAN.md B3) — courses.total_lessons derivado das lições.
//
// Antes do fix, createCourseFromCms gravava total_lessons=0 e nenhuma mutação
// de lição recalculava. updateLessonProgress divide por essa coluna, então
// todo curso autorado pelo CMS ficava com progresso eterno em 0% e nunca
// completava (nem disparava XP/badge de conclusão). Este spec cobre:
//   * recálculo em create/delete de lição e delete de módulo;
//   * courses.duration derivada de duration_seconds;
//   * sync do snapshot user_course_progress.total_lessons de matriculados;
//   * o sintoma real do aluno: completar todas as lições → 100% + completed_at.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createCourseFromCms,
  createCourseModule,
  createCourseLesson,
  deleteCourseLesson,
  deleteCourseModule,
} from "../../../server/features/cms/service.js";
import {
  enrollInCourse,
  updateLessonProgress,
} from "../../../server/features/academia/service.js";
import type { SafeUser } from "../../../server/features/auth/service.js";
import { getPool, closeDbPool, ensureSchema, truncateAll, makeUser } from "../helpers/db.js";

function asSafeUser(u: { id: number; email: string; name: string }, role: SafeUser["role"]): SafeUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role,
    email_verified: true,
    avatar_url: null,
    segments: [],
    created_at: new Date(),
  } as unknown as SafeUser;
}

async function courseRow(courseId: number): Promise<{ total_lessons: number; duration: string }> {
  const { rows } = await getPool().query(
    `SELECT total_lessons, duration FROM courses WHERE id = $1`,
    [courseId],
  );
  return rows[0];
}

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("CMS course totals — recálculo de total_lessons/duration (LAUNCH_PLAN B3)", () => {
  it("recalcula total_lessons e duration em create/delete de lição e delete de módulo", async () => {
    const producer = asSafeUser(await makeUser({ role: "producer" }), "producer");
    const { course_id } = await createCourseFromCms(producer, { title: "Curso Totals" });

    assert.equal((await courseRow(course_id)).total_lessons, 0);

    const mod = await createCourseModule(course_id, { title: "Módulo 1" });
    const l1 = await createCourseLesson(course_id, mod.id, {
      title: "Aula 1",
      duration_seconds: 600,
    });
    await createCourseLesson(course_id, mod.id, {
      title: "Aula 2",
      duration_seconds: 1200,
    });

    let row = await courseRow(course_id);
    assert.equal(row.total_lessons, 2);
    assert.equal(row.duration, "30m", "duration deve derivar da soma de duration_seconds");

    await deleteCourseLesson(course_id, mod.id, l1.id);
    row = await courseRow(course_id);
    assert.equal(row.total_lessons, 1);
    assert.equal(row.duration, "20m");

    await deleteCourseModule(course_id, mod.id);
    assert.equal((await courseRow(course_id)).total_lessons, 0);
  });

  it("mantém o snapshot user_course_progress.total_lessons de quem já está matriculado", async () => {
    const producer = asSafeUser(await makeUser({ role: "producer" }), "producer");
    const student = await makeUser({ role: "client" });
    const { course_id } = await createCourseFromCms(producer, { title: "Curso Snapshot" });
    const mod = await createCourseModule(course_id, { title: "Módulo 1" });
    await createCourseLesson(course_id, mod.id, { title: "Aula 1" });

    await enrollInCourse(student.id, course_id);
    // Lição adicionada DEPOIS da matrícula precisa refletir no snapshot.
    await createCourseLesson(course_id, mod.id, { title: "Aula 2" });

    const { rows } = await getPool().query(
      `SELECT total_lessons FROM user_course_progress WHERE user_id = $1 AND course_id = $2`,
      [student.id, course_id],
    );
    assert.equal(rows[0].total_lessons, 2);
  });

  it("curso autorado pelo CMS é completável: 2 lições concluídas → 100% + completed_at", async () => {
    const producer = asSafeUser(await makeUser({ role: "producer" }), "producer");
    const student = await makeUser({ role: "client" });
    const { course_id } = await createCourseFromCms(producer, { title: "Curso Completável" });
    const mod = await createCourseModule(course_id, { title: "Módulo 1" });
    const l1 = await createCourseLesson(course_id, mod.id, { title: "Aula 1", duration_seconds: 60 });
    const l2 = await createCourseLesson(course_id, mod.id, { title: "Aula 2", duration_seconds: 60 });

    await enrollInCourse(student.id, course_id);
    await updateLessonProgress(student.id, l1.id, "completed");

    let { rows } = await getPool().query(
      `SELECT progress_percentage, completed_at FROM user_course_progress
        WHERE user_id = $1 AND course_id = $2`,
      [student.id, course_id],
    );
    // progress_percentage é NUMERIC — o driver pg devolve string.
    assert.equal(Number(rows[0].progress_percentage), 50);
    assert.equal(rows[0].completed_at, null);

    await updateLessonProgress(student.id, l2.id, "completed");

    ({ rows } = await getPool().query(
      `SELECT progress_percentage, completed_at FROM user_course_progress
        WHERE user_id = $1 AND course_id = $2`,
      [student.id, course_id],
    ));
    assert.equal(Number(rows[0].progress_percentage), 100);
    assert.ok(rows[0].completed_at, "conclusão do curso deve registrar completed_at");
  });
});
