const fs = require('fs');
const path = require('path');

const outPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(process.cwd(), 'data/real-data.json');

const vietnameseLastNames = [
  'Nguyen',
  'Tran',
  'Le',
  'Pham',
  'Hoang',
  'Phan',
  'Vu',
  'Vo',
  'Dang',
  'Bui',
  'Do',
  'Ho',
];

const teacherMiddleNames = ['Thi', 'Minh', 'Thanh', 'Ngoc', 'Quoc', 'Duc', 'Khanh', 'Bao'];
const teacherGivenNames = ['Huong', 'Linh', 'Anh', 'Tuan', 'Khoa', 'My', 'Trang', 'Dung', 'Hieu', 'Lan'];

const studentMiddleNames = ['Gia', 'Nhat', 'Quynh', 'Thu', 'Tuan', 'Mai', 'Ngoc', 'Minh', 'Bao', 'Hoai'];
const studentGivenNames = ['An', 'Binh', 'Chi', 'Dung', 'Giang', 'Hanh', 'Kiet', 'Nam', 'Phuc', 'Thao', 'Trang', 'Vy'];

const englishLearningVideoLinks = [
  'https://learnenglish.britishcouncil.org/skills/listening/a1-listening',
  'https://learnenglish.britishcouncil.org/skills/listening/a2-listening',
  'https://learnenglish.britishcouncil.org/skills/listening/b1-listening',
  'https://learnenglish.britishcouncil.org/skills/listening/b2-listening',
  'https://learnenglishteens.britishcouncil.org/study-break/video-zone',
  'https://www.cambridgeenglish.org/learning-english/',
  'https://www.esl-lab.com/',
  'https://www.elllo.org/',
  'https://www.bbc.co.uk/learningenglish',
  'https://www.voanews.com/learning-english',
];

const englishCourseThumbnailLinks = [
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173',
  'https://images.unsplash.com/photo-1513258496099-48168024aec0',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
  'https://images.unsplash.com/photo-1460518451285-97b6aa326961',
];

const pad = (n) => String(n).padStart(2, '0');

const buildVietnameseName = (index, middlePool, givenPool) => {
  const last = vietnameseLastNames[(index - 1) % vietnameseLastNames.length];
  const middle = middlePool[(index * 3) % middlePool.length];
  const given = givenPool[(index * 5 + 1) % givenPool.length];
  return `${last} ${middle} ${given}`;
};

const toEmailLocalPart = (fullName) => fullName
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]/g, '')
  .toLowerCase();

const makeUsers = ({ teachers = 12, students = 80 } = {}) => {
  const users = [];

  for (let i = 1; i <= teachers; i += 1) {
    const fullName = buildVietnameseName(i, teacherMiddleNames, teacherGivenNames);
    users.push({
      fullName,
      email: `${toEmailLocalPart(fullName)}${pad(i)}@gmail.com`,
      role: 'teacher',
      password: '123456',
    });
  }

  for (let i = 1; i <= students; i += 1) {
    const fullName = buildVietnameseName(i + 100, studentMiddleNames, studentGivenNames);
    users.push({
      fullName,
      email: `${toEmailLocalPart(fullName)}${pad(i)}@gmail.com`,
      role: 'student',
      password: '123456',
    });
  }

  return users;
};

const makeQuestionSet = (courseIndex, lessonIndex) => {
  const base = courseIndex * 100 + lessonIndex;

  return [
    {
      orderIndex: 1,
      content: `Choose the correct meaning (${base}-1)`,
      type: 'single_choice',
      answers: [
        { content: 'Correct option', isCorrect: true },
        { content: 'Wrong option A', isCorrect: false },
        { content: 'Wrong option B', isCorrect: false },
      ],
    },
    {
      orderIndex: 2,
      content: `Select all valid answers (${base}-2)`,
      type: 'multiple_choice',
      answers: [
        { content: 'Valid answer 1', isCorrect: true },
        { content: 'Valid answer 2', isCorrect: true },
        { content: 'Distractor', isCorrect: false },
      ],
    },
    {
      orderIndex: 3,
      content: `Write one sentence using topic ${base}`,
      type: 'text',
      answers: [],
    },
  ];
};

const pickStudentsForCourse = (courseIndex, studentCount = 80) => {
  const start = ((courseIndex - 1) * 7) % studentCount;
  const selected = [];

  for (let i = 0; i < 18; i += 1) {
    const idx = ((start + i) % studentCount) + 1;
    const studentName = buildVietnameseName(idx + 100, studentMiddleNames, studentGivenNames);
    selected.push(`${toEmailLocalPart(studentName)}${pad(idx)}@gmail.com`);
  }

  return selected;
};

const makeCourses = ({ courseCount = 30, lessonsPerCourse = 8 } = {}) => {
  const levels = [
    { key: 'co_ban', label: 'Co Ban' },
    { key: 'trung_cap', label: 'Trung Cap' },
    { key: 'cao_cap', label: 'Cao Cap' },
  ];
  const tracks = ['General English', 'Business English', 'Travel English', 'Conversation'];
  const courses = [];

  for (let c = 1; c <= courseCount; c += 1) {
    const teacherIdx = ((c - 1) % 12) + 1;
    const teacherName = buildVietnameseName(teacherIdx, teacherMiddleNames, teacherGivenNames);
    const level = levels[(c - 1) % levels.length];
    const track = tracks[(c - 1) % tracks.length];
    const teacherEmail = `${toEmailLocalPart(teacherName)}${pad(teacherIdx)}@gmail.com`;

    const lessons = [];
    for (let l = 1; l <= lessonsPerCourse; l += 1) {
      const videoLink = englishLearningVideoLinks[(c + l - 2) % englishLearningVideoLinks.length];
      lessons.push({
        orderIndex: l,
        title: `Course ${pad(c)} Lesson ${pad(l)}`,
        content: `Lesson ${l} content for course ${c}. Focus on vocabulary, grammar, and speaking drills.`,
        videoUrl: videoLink,
        duration: 20 + (l % 4) * 5,
      });
    }

    const assignments = [];
    for (let a = 1; a <= 4; a += 1) {
      assignments.push({
        title: `Course ${pad(c)} Assignment ${a}`,
        description: `Submit homework set ${a} for course ${c}.`,
        dueDate: `2026-${pad(((c + a) % 12) + 1)}-${pad(((a * 4) % 27) + 1)}T23:59:59.000Z`,
        maxScore: 100,
      });
    }

    const quizzes = [];
    for (let q = 1; q <= 4; q += 1) {
      quizzes.push({
        title: `Course ${pad(c)} Quiz ${q}`,
        description: `Quiz ${q} for course ${c}.`,
        timeLimit: 900,
        questions: makeQuestionSet(c, q),
      });
    }

    const enrolledStudentEmails = pickStudentsForCourse(c);
    const discussions = [
      {
        authorEmail: teacherEmail,
        content: `Welcome to course ${pad(c)}. Please introduce yourself in this thread.`,
      },
      {
        authorEmail: enrolledStudentEmails[0],
        content: `Hello teacher, I am excited to join cohort ${pad(c)}.`,
        parentIndex: 0,
      },
      {
        authorEmail: enrolledStudentEmails[1],
        content: `Can we get extra listening practice for week 1?`,
      },
      {
        authorEmail: teacherEmail,
        content: 'Yes, I added extra links in lesson resources. Please check lesson files.',
        parentIndex: 2,
      },
      {
        authorEmail: enrolledStudentEmails[2],
        content: 'Thanks teacher, the resources are very helpful.',
        parentIndex: 3,
      },
    ];

    courses.push({
      title: `${track} - Cohort ${pad(c)}`,
      level: level.key,
      description: `${track} curriculum level ${level.label}, course batch ${c}.`,
      thumbnail: `${englishCourseThumbnailLinks[(c - 1) % englishCourseThumbnailLinks.length]}?auto=format&fit=crop&w=1200&q=80`,
      teacherEmail,
      lessons,
      assignments,
      quizzes,
      enrolledStudentEmails,
      discussions,
    });
  }

  return courses;
};

const payload = {
  users: [
    {
      fullName: 'Nguyen Quan Tri',
      email: 'nguyenquantriadmin@gmail.com',
      role: 'admin',
      password: 'Admin@123',
    },
    ...makeUsers({ teachers: 12, students: 80 }),
  ],
  courses: makeCourses({ courseCount: 30, lessonsPerCourse: 8 }),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

console.log(`GENERATED_REAL_DATA: ${outPath}`);
console.log(`USERS: ${payload.users.length}`);
console.log(`COURSES: ${payload.courses.length}`);
