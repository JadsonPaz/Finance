import dotenv from 'dotenv';
import path from 'path';

// Carrega o arquivo .env a partir da raiz do backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_in_production',
};

export function validateEnv() {
  const missing: string[] = [];

  if (!env.MONGODB_URI) {
    missing.push('MONGODB_URI');
  }

  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ AVISO: JWT_SECRET não foi definido no arquivo .env. Usando chave padrão para desenvolvimento.');
  }

  if (missing.length > 0) {
    console.warn(`⚠️ ATENÇÃO: As seguintes variáveis de ambiente não foram configuradas: ${missing.join(', ')}`);
    console.warn('Por favor, configure o arquivo backend/.env para conectar ao MongoDB Atlas.');
  }
}
