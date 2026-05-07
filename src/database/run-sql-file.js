const fs = require('fs');
const path = require('path');

const { query } = require('../config/database');

const run = async () => {
  const relativePath = process.argv[2];

  if (!relativePath) {
    console.error('Usage: node src/database/run-sql-file.js <relative-sql-file-path>');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), relativePath);

  if (!fs.existsSync(filePath)) {
    console.error(`SQL file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  await query(sql);
  console.log(`SQL executed successfully: ${relativePath}`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
