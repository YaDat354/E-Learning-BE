const fs = require('fs');
const path = require('path');

const realPath = path.resolve(process.cwd(), 'data/real-data.json');
const crawledPath = path.resolve(process.cwd(), 'data/crawled-english-data.json');
const backupPath = path.resolve(process.cwd(), 'data/real-data.backup-before-merge.json');

const normalizeLevelLabel = (level) => {
  if (level === 'co_ban') return 'basic';
  if (level === 'trung_cap') return 'intermediate';
  if (level === 'cao_cap') return 'upper intermediate';
  return 'general';
};

const extractTaskArtifact = (taskContent) => {
  const text = String(taskContent || '');
  const match = text.match(/(Matching|MultipleChoice|TrueOrFalse|Grouping)_[A-Za-z0-9+/=]+\.xml/i);
  if (!match) return null;

  const rawType = match[1] || 'Task';
  const normalizedType = rawType
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();

  return {
    code: match[0],
    typeLabel: normalizedType,
  };
};

const cleanTaskText = (value) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/[<>]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'your', 'you', 'are', 'was', 'were',
  'about', 'into', 'when', 'what', 'where', 'which', 'will', 'would', 'could', 'should', 'there',
  'they', 'them', 'then', 'than', 'just', 'very', 'really', 'only', 'also', 'some', 'much', 'more',
  'less', 'been', 'being', 'because', 'while', 'after', 'before', 'over', 'under', 'again', 'their',
  'ours', 'ourselves', 'herself', 'himself', 'itself', 'into', 'onto', 'upon', 'across', 'through',
]);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractSentencesFromTranscript = (transcript) => {
  const cleaned = cleanTaskText(String(transcript || '').replace(/\b[A-Za-z]+\s*:\s*/g, ''));

  return cleaned
    .split(/(?<=[.!?])\s+|\s*\n+\s*/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 35 && item.length <= 180);
};

const extractKeywords = (sentence) => {
  const words = String(sentence || '').match(/[A-Za-z][A-Za-z'-]{3,}/g) || [];
  const seen = new Set();

  return words
    .map((word) => word.trim())
    .filter((word) => {
      const key = word.toLowerCase();
      if (STOP_WORDS.has(key)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.length - a.length);
};

const buildDistractors = (correctAnswer, poolKeywords) => {
  const correctKey = String(correctAnswer || '').toLowerCase();
  const distractors = [];

  for (const keyword of poolKeywords) {
    const key = String(keyword || '').toLowerCase();
    if (!key || key === correctKey) continue;
    if (distractors.some((item) => item.toLowerCase() === key)) continue;
    distractors.push(keyword);
    if (distractors.length >= 3) break;
  }

  const fallback = ['project', 'meeting', 'customer', 'report', 'schedule', 'email', 'office', 'team'];
  for (const word of fallback) {
    if (distractors.length >= 3) break;
    if (word === correctKey) continue;
    if (distractors.some((item) => item.toLowerCase() === word)) continue;
    distractors.push(word);
  }

  return distractors.slice(0, 3);
};

const shuffleArray = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildQuestionsFromLesson = (lesson, taskTitle, artifact) => {
  const sentences = extractSentencesFromTranscript(lesson.transcript);
  const poolKeywords = sentences.flatMap((sentence) => extractKeywords(sentence));
  const questions = [];

  for (const sentence of sentences) {
    if (questions.length >= 3) break;

    const keywords = extractKeywords(sentence);
    const correctAnswer = keywords[0];
    if (!correctAnswer) continue;

    const stem = sentence.replace(new RegExp(`\\b${escapeRegExp(correctAnswer)}\\b`, 'i'), '_____');
    if (stem === sentence) continue;

    const distractors = buildDistractors(correctAnswer, poolKeywords);
    if (distractors.length < 2) continue;

    const options = shuffleArray([
      { content: correctAnswer, isCorrect: true },
      ...distractors.map((item) => ({ content: item, isCorrect: false })),
    ]);

    questions.push({
      content: `${taskTitle}: ${stem}`,
      type: 'single_choice',
      orderIndex: questions.length + 1,
      answers: options,
    });
  }

  if (questions.length === 0) {
    const hintText = artifact
      ? `${artifact.typeLabel} (${artifact.code})`
      : 'Listening comprehension';

    questions.push({
      content: `${taskTitle}: ${hintText}. Which option best describes this activity?`,
      type: 'single_choice',
      orderIndex: 1,
      answers: [
        { content: 'Comprehension check', isCorrect: true },
        { content: 'Grammar translation', isCorrect: false },
        { content: 'Pronunciation only', isCorrect: false },
        { content: 'Vocabulary sorting only', isCorrect: false },
      ],
    });
  }

  return questions;
};

const run = () => {
  if (!fs.existsSync(realPath)) {
    throw new Error(`Missing file: ${realPath}`);
  }

  if (!fs.existsSync(crawledPath)) {
    throw new Error(`Missing file: ${crawledPath}`);
  }

  const realData = JSON.parse(fs.readFileSync(realPath, 'utf8'));
  const crawledData = JSON.parse(fs.readFileSync(crawledPath, 'utf8'));

  const realUsers = Array.isArray(realData.users) ? realData.users : [];
  const teacher = realUsers.find((user) => user && user.role === 'teacher');
  const student = realUsers.find((user) => user && user.role === 'student');

  if (!teacher || !student) {
    throw new Error('Cannot find Vietnamese teacher/student in data/real-data.json users');
  }

  const crawledCourses = Array.isArray(crawledData.courses) ? crawledData.courses : [];

  const mergedCourses = crawledCourses.map((course, courseIndex) => {
    const englishTitle = course.title || `English Listening Course ${courseIndex + 1}`;

    const generatedQuizzes = [];

    const lessons = (course.lessons || []).map((lesson, lessonIndex) => {
      const lessonTitle = lesson.title || `Listening Lesson ${lessonIndex + 1}`;
      const taskItems = Array.isArray(lesson.tasks) ? lesson.tasks : [];

      taskItems.forEach((task, taskIndex) => {
        const artifact = extractTaskArtifact(task.content);
        const taskTitle = task?.title || `Task ${taskIndex + 1}`;
        const questions = buildQuestionsFromLesson(lesson, taskTitle, artifact);

        generatedQuizzes.push({
          title: `${lessonTitle} - ${taskTitle}`,
          description: artifact
            ? `Generated quiz from ${artifact.typeLabel} task (${artifact.code}).`
            : 'Generated quiz from crawled lesson transcript/task context.',
          timeLimit: 15,
          questions,
        });
      });

      return {
        ...lesson,
        title: lessonTitle,
        content: `Listening lesson for ${normalizeLevelLabel(course.level)} level. Topic: ${lessonTitle}.`,
        tasks: [],
      };
    });

    return {
      ...course,
      title: englishTitle,
      description: `${englishTitle} uses crawled playable media links for FE playback.`,
      teacherEmail: teacher.email,
      lessons,
      assignments: [],
      quizzes: generatedQuizzes,
      enrolledStudentEmails: [student.email],
    };
  });

  const merged = {
    users: realUsers,
    courses: mergedCourses,
  };

  fs.writeFileSync(backupPath, JSON.stringify(realData, null, 2), 'utf8');
  fs.writeFileSync(realPath, JSON.stringify(merged, null, 2), 'utf8');

  console.log(`MERGE_DONE: users=${merged.users.length} courses=${merged.courses.length}`);
  console.log(`BACKUP_FILE: ${backupPath}`);
  console.log(`UPDATED_FILE: ${realPath}`);
};

try {
  run();
} catch (error) {
  console.error(`MERGE_FAILED: ${error.message}`);
  process.exit(1);
}