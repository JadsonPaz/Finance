import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env, validateEnv } from './config/env';
import { connectDatabase } from './config/database';
import { authRoutes } from './routes/authRoutes';
import { groupRoutes } from './routes/groupRoutes';
import { transactionRoutes } from './routes/transactionRoutes';
import { syncRoutes } from './routes/syncRoutes';

// Valida variáveis de ambiente no boot
validateEnv();

const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json());

// Rota de Healthcheck
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'finance-backend',
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/sync', syncRoutes);

// Middleware global de tratamento de erros
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    message: 'Erro interno no servidor.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Inicialização do servidor
async function startServer() {
  // Conecta ao MongoDB Atlas
  await connectDatabase();

  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${env.PORT}!`);
    console.log(`👉 Healthcheck: http://localhost:${env.PORT}/api/health`);
  });
}

startServer();

export default app;
