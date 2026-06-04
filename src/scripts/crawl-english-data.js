const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://learnenglish.britishcouncil.org';
const DEFAULT_OUT_FILE = path.resolve(process.cwd(), 'data/crawled-english-data.json');
const outFile = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : DEFAULT_OUT_FILE;
const maxLessonsPerCourse = Number(process.argv[3] || 8);

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

const buildLessonsFromLinks = async (links) => {
  const limitedLinks = links.slice(0, Math.max(1, maxLessonsPerCourse));
  const lessons = [];

  for (let index = 0; index < limitedLinks.length; index += 1) {
    const href = limitedLinks[index];
    const pageUrl = `${BASE_URL}${href}`;
    const slug = href.split('/').pop() || `lesson-${index + 1}`;

    const lessonHtml = await fetchHtml(pageUrl);
    const mediaUrl = extractDirectMediaUrl(lessonHtml, pageUrl);

    if (!mediaUrl) {
      continue;
    }

    lessons.push({
      orderIndex: lessons.length + 1,
      title: slugToTitle(slug),
      content: 'Interactive listening lesson metadata crawled from British Council.',
      videoUrl: mediaUrl,
      duration: 20,
    });

    await sleep(300);
  }

  return lessons;
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

  const courses = [];

  for (const target of targets) {
    const html = await fetchHtml(target.pageUrl);
    const links = extractLessonLinks(html, target.code);
    const lessons = await buildLessonsFromLinks(links);

    courses.push({
      title: target.courseTitle,
      level: target.level,
      description: `Listening practice (${target.code.toUpperCase()}) sourced from British Council public pages.`,
      thumbnail: 'https://www.britishcouncil.org/sites/default/files/styles/bc-square-690x690/public/listening.jpg',
      teacherEmail: 'crawler.teacher@gmail.com',
      lessons,
      assignments: [],
      quizzes: [],
      enrolledStudentEmails: ['crawler.student@gmail.com'],
    });

    await sleep(500);
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
  console.log(`CRAWL_DONE: ${courses.length} courses | ${lessonCount} lessons`);
  console.log(`OUTPUT: ${outFile}`);
};

run().catch((error) => {
  console.error(`CRAWL_FAILED: ${error.message}`);
  process.exit(1);
});