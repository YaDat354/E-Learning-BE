const decodeHtml = (value) => String(value || '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>');

const cleanText = (value) => decodeHtml(value)
  .replace(/\r/g, '')
  .replace(/<[^>]*>?/g, ' ')
  .replace(/field-group-format-toggler|accordion-item/gi, ' ')
  .replace(/\s{2,}/g, ' ')
  .replace(/\n\s*\n+/g, '\n\n')
  .trim();

const sanitizeTranscript = (value) => {
  const cleaned = cleanText(value)
    .replace(/^>\s*/i, '')
    .replace(/^Transcript\s*/i, '')
    .trim();

  return cleaned || null;
};

const sanitizeTasks = (tasks) => {
  if (!Array.isArray(tasks)) return [];

  return tasks
    .map((task, index) => {
      const title = String(task?.title || `Task ${index + 1}`).trim();
      const rawContent = cleanText(task?.content || '');
      const low = rawContent.toLowerCase();

      const content = !rawContent || low === 'exercise'
        ? 'Interactive exercise from source lesson.'
        : rawContent;

      return { title, content };
    })
    .filter((task) => task.title || task.content);
};

module.exports = {
  sanitizeTranscript,
  sanitizeTasks,
};