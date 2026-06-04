require('dotenv').config();

const { spawnSync } = require('child_process');
const path = require('path');

const { query } = require('../config/database');

const payloadPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(process.cwd(), 'data/real-data.json');

const run = async () => {
  await query('BEGIN');

  try {
    await query(`
      TRUNCATE TABLE
        student_answers,
        quiz_results,
        answers,
        questions,
        quizzes,
        submissions,
        assignments,
        learning_logs,
        lesson_files,
        discussions,
        enrollments,
        lessons,
        courses,
        notifications,
        users
      RESTART IDENTITY CASCADE
    `);

    await query('COMMIT');
    console.log('RESET_OLD_DATA_DONE');
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }

  const importResult = spawnSync(
    process.execPath,
    [path.resolve(__dirname, 'import-real-data.js'), payloadPath],
    { stdio: 'inherit' }
  );

  if (importResult.status !== 0) {
    process.exit(importResult.status || 1);
  }

  console.log('RESET_AND_IMPORT_DONE');
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
