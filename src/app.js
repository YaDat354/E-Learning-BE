const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const { testConnection } = require('./config/database');
const apiV1Router = require('./routes/v1');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const swaggerSpec = require('./docs/swagger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'E-Learning Backend Running',
  });
});

app.get('/health', async (req, res, next) => {
  try {
    await testConnection();

    res.json({
      success: true,
      message: 'OK',
      data: {
        status: 'healthy',
        database: 'connected',
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api/v1', apiV1Router);
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.port;

testConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to PostgreSQL:', error.message);
    process.exit(1);
  });