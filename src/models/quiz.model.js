const { pool, query } = require('../config/database');

const findByCourseId = async (courseId) => {
  const result = await query(
    `SELECT id, course_id, title, description, time_limit, created_at, updated_at
     FROM quizzes WHERE course_id = $1 ORDER BY created_at ASC`,
    [courseId]
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `SELECT id, course_id, title, description, time_limit, created_at, updated_at
     FROM quizzes WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

const createQuiz = async ({ courseId, title, description, timeLimit }) => {
  const result = await query(
    `INSERT INTO quizzes (course_id, title, description, time_limit)
     VALUES ($1, $2, $3, $4)
     RETURNING id, course_id, title, description, time_limit, created_at, updated_at`,
    [courseId, title, description || null, timeLimit || null]
  );
  return result.rows[0];
};

const updateQuiz = async (quizId, { title, description, timeLimit }) => {
  const result = await query(
    `UPDATE quizzes
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         time_limit = COALESCE($3, time_limit),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, course_id, title, description, time_limit, created_at, updated_at`,
    [title ?? null, description ?? null, timeLimit ?? null, quizId]
  );
  return result.rows[0] || null;
};

const deleteQuiz = async (quizId) => {
  const result = await query('DELETE FROM quizzes WHERE id = $1 RETURNING id', [quizId]);
  return result.rows[0] || null;
};

const createQuestion = async ({ quizId, content, type, orderIndex }) => {
  const result = await query(
    `INSERT INTO questions (quiz_id, content, type, order_index)
     VALUES ($1, $2, $3, $4)
     RETURNING id, quiz_id, content, type, order_index, created_at`,
    [quizId, content, type, orderIndex ?? 0]
  );
  return result.rows[0];
};

const findQuestionById = async (questionId) => {
  const result = await query(
    `SELECT id, quiz_id, content, type, order_index, created_at, updated_at
     FROM questions WHERE id = $1 LIMIT 1`,
    [questionId]
  );
  return result.rows[0] || null;
};

const updateQuestion = async (questionId, { content, type, orderIndex }) => {
  const result = await query(
    `UPDATE questions
     SET content = COALESCE($1, content),
         type = COALESCE($2, type),
         order_index = COALESCE($3, order_index),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, quiz_id, content, type, order_index, created_at, updated_at`,
    [content ?? null, type ?? null, orderIndex ?? null, questionId]
  );
  return result.rows[0] || null;
};

const deleteQuestion = async (questionId) => {
  const result = await query('DELETE FROM questions WHERE id = $1 RETURNING id', [questionId]);
  return result.rows[0] || null;
};

const deleteAnswersByQuestionId = async (questionId) => {
  await query('DELETE FROM answers WHERE question_id = $1', [questionId]);
};

const createAnswers = async (questionId, answers = []) => {
  if (!Array.isArray(answers) || answers.length === 0) return [];

  const values = [];
  const params = [];
  answers.forEach((item, index) => {
    const offset = index * 3;
    values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
    params.push(questionId, item.content, Boolean(item.isCorrect));
  });

  const result = await query(
    `INSERT INTO answers (question_id, content, is_correct)
     VALUES ${values.join(', ')}
     RETURNING id, question_id, content, is_correct, created_at`,
    params
  );

  return result.rows;
};

const findQuestionsWithAnswers = async (quizId) => {
  const questions = await query(
    `SELECT id, quiz_id, content, type, order_index, created_at
     FROM questions WHERE quiz_id = $1 ORDER BY order_index ASC, created_at ASC`,
    [quizId]
  );

  if (questions.rows.length === 0) return [];

  const answers = await query(
    `SELECT id, question_id, content, is_correct, created_at
     FROM answers
     WHERE question_id = ANY($1::uuid[])
     ORDER BY created_at ASC`,
    [questions.rows.map((q) => q.id)]
  );

  const answersMap = new Map();
  answers.rows.forEach((ans) => {
    if (!answersMap.has(ans.question_id)) answersMap.set(ans.question_id, []);
    answersMap.get(ans.question_id).push(ans);
  });

  return questions.rows.map((q) => ({
    ...q,
    answers: answersMap.get(q.id) || [],
  }));
};

const submitQuiz = async ({ quizId, studentId, answers }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM quiz_results WHERE quiz_id = $1 AND student_id = $2 LIMIT 1',
      [quizId, studentId]
    );
    if (existing.rows[0]) {
      const error = new Error('ALREADY_SUBMITTED');
      error.code = 'ALREADY_SUBMITTED';
      throw error;
    }

    const questionsResult = await client.query(
      `SELECT q.id, q.type,
              ARRAY_REMOVE(ARRAY_AGG(a.id) FILTER (WHERE a.is_correct = TRUE), NULL) AS correct_answer_ids
       FROM questions q
       LEFT JOIN answers a ON a.question_id = q.id
       WHERE q.quiz_id = $1
       GROUP BY q.id, q.type`,
      [quizId]
    );

    const questions = questionsResult.rows;
    const answerMap = new Map((answers || []).map((item) => [item.questionId, item]));

    let scorable = 0;
    let correct = 0;

    const quizResult = await client.query(
      'INSERT INTO quiz_results (quiz_id, student_id, score, submitted_at) VALUES ($1, $2, 0, NOW()) RETURNING id',
      [quizId, studentId]
    );

    const quizResultId = quizResult.rows[0].id;

    for (const question of questions) {
      const submitted = answerMap.get(question.id);
      let isCorrect = null;
      let answerId = null;
      let textAnswer = null;

      if (question.type === 'text') {
        textAnswer = submitted?.textAnswer || null;
      } else {
        scorable += 1;
        const submittedIds = Array.isArray(submitted?.answerIds)
          ? submitted.answerIds.filter(Boolean).sort()
          : [];
        const correctIds = (question.correct_answer_ids || []).sort();

        if (submittedIds.length > 0 && submittedIds.length === correctIds.length) {
          isCorrect = submittedIds.every((id, i) => id === correctIds[i]);
        } else {
          isCorrect = false;
        }

        if (isCorrect) correct += 1;
        answerId = submittedIds[0] || null;
      }

      await client.query(
        `INSERT INTO student_answers (quiz_result_id, question_id, answer_id, text_answer, is_correct)
         VALUES ($1, $2, $3, $4, $5)`,
        [quizResultId, question.id, answerId, textAnswer, isCorrect]
      );
    }

    const score = scorable > 0 ? Number(((correct / scorable) * 100).toFixed(2)) : 0;

    await client.query(
      'UPDATE quiz_results SET score = $1 WHERE id = $2',
      [score, quizResultId]
    );

    await client.query('COMMIT');

    const finalResult = await query(
      'SELECT id, quiz_id, student_id, score, submitted_at FROM quiz_results WHERE id = $1',
      [quizResultId]
    );

    return finalResult.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const findResultsByStudent = async (studentId) => {
  const result = await query(
    `SELECT
        qr.id,
        qr.quiz_id,
        qr.student_id,
        qr.score,
        qr.submitted_at,
        q.title AS quiz_title,
        q.course_id,
        c.title AS course_title,
        COALESCE(
          q.lesson_id,
          (
            SELECT l2.id
            FROM lessons l2
            WHERE l2.course_id = q.course_id
            ORDER BY l2.order_index ASC, l2.created_at ASC
            LIMIT 1
          )
        ) AS lesson_id,
        COALESCE(
          l.title,
          (
            SELECT l2.title
            FROM lessons l2
            WHERE l2.course_id = q.course_id
            ORDER BY l2.order_index ASC, l2.created_at ASC
            LIMIT 1
          )
        ) AS lesson_title
     FROM quiz_results qr
     JOIN quizzes q ON q.id = qr.quiz_id
     LEFT JOIN courses c ON c.id = q.course_id
     LEFT JOIN lessons l ON l.id = q.lesson_id
     WHERE qr.student_id = $1
     ORDER BY qr.submitted_at DESC`,
    [studentId]
  );
  return result.rows;
};

module.exports = {
  findByCourseId,
  findById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  findQuestionById,
  updateQuestion,
  deleteQuestion,
  createAnswers,
  deleteAnswersByQuestionId,
  findQuestionsWithAnswers,
  submitQuiz,
  findResultsByStudent,
};
