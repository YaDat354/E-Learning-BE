const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://learnenglish.britishcouncil.org';
const DEFAULT_OUT_FILE = path.resolve(process.cwd(), 'data/crawled-english-data.json');
const outFile = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : DEFAULT_OUT_FILE;
const initialLessonsPerCourse = Number(process.argv[3] || 5);
const maxLessonsPerLevel = Number(process.argv[4] || 60);
const minCourseCount = Number(process.env.MIN_COURSE_COUNT || 20);
const requestTimeoutMs = Number(process.env.CRAWL_TIMEOUT_MS || 20000);

const targets = [
  {
    code: 'a1',
    courseTitle: 'British Council Listening A1',
    level: 'co_ban',
    pageUrl: `${BASE_URL}/free-resources/listening/a1`,
  },
  {
    code: 'a2',
    courseTitle: 'British Council Listening A2',
    level: 'co_ban',
    pageUrl: `${BASE_URL}/free-resources/listening/a2`,
  },
  {
    code: 'b1',
    courseTitle: 'British Council Listening B1',
    level: 'trung_cap',
    pageUrl: `${BASE_URL}/free-resources/listening/b1`,
  },
  {
    code: 'b2',
    courseTitle: 'British Council Listening B2',
    level: 'cao_cap',
    pageUrl: `${BASE_URL}/free-resources/listening/b2`,
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeHtml = (value) => String(value || '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

const toPlainText = (value) => decodeHtml(value)
  .replace(/&(?:amp;)+lt;/gi, '&lt;')
  .replace(/&(?:amp;)+gt;/gi, '&gt;')
  .replace(/&(?:amp;)+quot;/gi, '&quot;')
  .replace(/&(?:amp;)+#39;/gi, '&#39;')
  .replace(/&(?:amp;)+nbsp;/gi, '&nbsp;')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&nbsp;/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\r/g, '')
  .replace(/\n\s*\n+/g, '\n\n')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/^[>\s]+/g, '')
  .trim();

const slugToTitle = (slug) => slug
  .replace(/[-_]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const extractLessonLinks = (html, levelCode) => {
  const linkRegex = /href="([^"#?]+)"/g;
  const prefix = `/free-resources/listening/${levelCode}/`;
  const seen = new Set();
  const links = [];
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (!href.startsWith(prefix)) continue;

    const normalized = href.endsWith('/') ? href.slice(0, -1) : href;
    if (normalized === `/free-resources/listening/${levelCode}`) continue;
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    links.push(normalized);
  }

  return links;
};

const fetchHtml = async (url) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(requestTimeoutMs),
    headers: {
      'User-Agent': 'E-Learning-BE-Crawler/1.0 (metadata only)',
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status}) for ${url}`);
  }

  return response.text();
};

const extractDirectMediaUrl = (html, pageUrl) => {
  const absoluteMediaRegex = /https?:\/\/[^\s"']+\.(mp3|m4a|aac|ogg|wav|mp4|webm|m3u8)(\?[^\s"']*)?/ig;
  const relativeMediaRegex = /(?:src|href)="([^"']+\.(mp3|m4a|aac|ogg|wav|mp4|webm|m3u8)(?:\?[^"']*)?)"/ig;
  const youtubeRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[^\s"']+|youtube\.com\/embed\/[^\s"']+|youtu\.be\/[^\s"']+)/ig;

  const firstAbsolute = html.match(absoluteMediaRegex);
  if (firstAbsolute && firstAbsolute[0]) {
    return firstAbsolute[0];
  }

  let relativeMatch;
  while ((relativeMatch = relativeMediaRegex.exec(html)) !== null) {
    const candidate = relativeMatch[1];
    if (!candidate) continue;
    try {
      return new URL(candidate, pageUrl).toString();
    } catch (error) {
      continue;
    }
  }

  const youtubeMatch = html.match(youtubeRegex);
  if (youtubeMatch && youtubeMatch[0]) {
    return youtubeMatch[0];
  }

  return null;
};

const extractSectionBetween = (html, startLabel, endLabels) => {
  const escapedStart = startLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startRegex = new RegExp(`>${escapedStart}<`, 'i');
  const startMatch = startRegex.exec(html);

  if (!startMatch || startMatch.index < 0) {
    return null;
  }

  const fromIndex = startMatch.index;
  let toIndex = html.length;

  for (const endLabel of endLabels) {
    const escapedEnd = endLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const endRegex = new RegExp(`>${escapedEnd}<`, 'ig');
    endRegex.lastIndex = fromIndex + 1;
    const endMatch = endRegex.exec(html);
    if (endMatch && endMatch.index > fromIndex && endMatch.index < toIndex) {
      toIndex = endMatch.index;
    }
  }

  const slice = html.slice(fromIndex, toIndex);
  const text = toPlainText(slice);
  return text || null;
};

const extractTranscript = (html) => {
  const text = extractSectionBetween(html, 'Transcript', ['Task 1', 'Task 2', 'Discussion']);
  if (!text) return null;

  return text
    .replace(/^>\s*/i, '')
    .replace(/^Transcript\s*/i, '')
    .trim() || null;
};

const extractTasks = (html) => {
  const task1 = extractSectionBetween(html, 'Task 1', ['Task 2', 'Discussion']);
  const task2 = extractSectionBetween(html, 'Task 2', ['Discussion']);

  const output = [];

  if (task1) {
    output.push({
      title: 'Task 1',
      content: task1
        .replace(/^>\s*/i, '')
        .replace(/^Task\s*1\s*/i, '')
        .trim(),
    });
  }

  if (task2) {
    output.push({
      title: 'Task 2',
      content: task2
        .replace(/^>\s*/i, '')
        .replace(/^Task\s*2\s*/i, '')
        .trim(),
    });
  }

  return output.filter((item) => item.content);
};

const buildLessonsFromLinks = async (links) => {
  const limitedLinks = links.slice(0, Math.max(1, maxLessonsPerLevel));
  const lessons = [];

  for (let index = 0; index < limitedLinks.length; index += 1) {
    const href = limitedLinks[index];
    const pageUrl = `${BASE_URL}${href}`;
    const slug = href.split('/').pop() || `lesson-${index + 1}`;

    try {
      const lessonHtml = await fetchHtml(pageUrl);
      const mediaUrl = extractDirectMediaUrl(lessonHtml, pageUrl);
      const transcript = extractTranscript(lessonHtml);
      const tasks = extractTasks(lessonHtml);

      if (!mediaUrl) {
        continue;
      }

      lessons.push({
        orderIndex: lessons.length + 1,
        title: slugToTitle(slug),
        content: 'Interactive listening lesson metadata crawled from British Council.',
        pageUrl,
        videoUrl: mediaUrl,
        transcript,
        tasks,
        duration: 20,
      });
    } catch (error) {
      console.warn(`LESSON_SKIPPED: ${pageUrl} (${error.message})`);
    }

    await sleep(300);
  }

  return lessons;
};

const chunkArray = (items, chunkSize) => {
  const size = Math.max(1, chunkSize);
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const withLessonOrder = (lessons) => lessons.map((lesson, index) => ({
  ...lesson,
  orderIndex: index + 1,
}));

const buildCoursesFromLevelData = (levels, lessonsPerCourse) => {
  const courses = [];

  for (const levelData of levels) {
    const packs = chunkArray(levelData.lessons, lessonsPerCourse).filter((pack) => pack.length > 0);

    packs.forEach((pack, packIndex) => {
      courses.push({
        title: `${levelData.courseTitle} - Pack ${packIndex + 1}`,
        level: levelData.level,
        description: `Listening practice (${levelData.code.toUpperCase()}) sourced from British Council public pages.`,
        thumbnail: 'https://www.britishcouncil.org/sites/default/files/styles/bc-square-690x690/public/listening.jpg',
        teacherEmail: 'crawler.teacher@gmail.com',
        lessons: withLessonOrder(pack),
        assignments: [],
        quizzes: [],
        enrolledStudentEmails: ['crawler.student@gmail.com'],
      });
    });
  }

  return courses;
};

const run = async () => {
  const users = [
    {
      fullName: 'Crawler Teacher',
      email: 'crawler.teacher@gmail.com',
      role: 'teacher',
      password: '123456',
    },
    {
      fullName: 'Crawler Student',
      email: 'crawler.student@gmail.com',
      role: 'student',
      password: '123456',
    },
  ];

  const levelCourseData = [];

  for (const target of targets) {
    try {
      const html = await fetchHtml(target.pageUrl);
      const links = extractLessonLinks(html, target.code);
      const lessons = await buildLessonsFromLinks(links);

      levelCourseData.push({
        ...target,
        lessons,
      });

      console.log(`LEVEL_DONE: ${target.code.toUpperCase()} | lessons=${lessons.length}`);
    } catch (error) {
      console.warn(`COURSE_SKIPPED: ${target.code} (${error.message})`);
    }

    await sleep(500);
  }

  let lessonsPerCourse = Math.max(1, initialLessonsPerCourse);
  let courses = buildCoursesFromLevelData(levelCourseData, lessonsPerCourse);

  while (courses.length < minCourseCount && lessonsPerCourse > 1) {
    lessonsPerCourse -= 1;
    courses = buildCoursesFromLevelData(levelCourseData, lessonsPerCourse);
  }

  const payload = {
    users,
    courses,
    meta: {
      source: 'learnenglish.britishcouncil.org',
      generatedAt: new Date().toISOString(),
      notes: 'Metadata links only. Respect source website terms and copyright.',
    },
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');

  const lessonCount = courses.reduce((sum, course) => sum + (course.lessons || []).length, 0);
  console.log(`CRAWL_DONE: ${courses.length} courses | ${lessonCount} lessons | lessonsPerCourse=${lessonsPerCourse}`);
  console.log(`OUTPUT: ${outFile}`);
};

run().catch((error) => {
  console.error(`CRAWL_FAILED: ${error.message}`);
  process.exit(1);
});