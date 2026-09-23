import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<typeof mongoose | null> {
  if (!env.MONGODB_URI) {
    console.error('❌ MONGODB_URI não informada no arquivo .env!');
    console.error('Configure a variável MONGODB_URI em backend/.env para conectar ao MongoDB Atlas.');
    return null;
  }

  try {
    console.log('🔄 Conectando ao MongoDB Atlas...');
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout de 5s para feedback rápido
    });

    console.log(`✅ Conexão com MongoDB estabelecida com sucesso! Host: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    console.error('❌ Erro ao conectar ao MongoDB Atlas:');
    if (error.name === 'MongoServerSelectionError') {
      console.error('Motivo provável: IP não liberado no MongoDB Atlas (Network Access) ou URI incorreta.');
    } else if (error.message?.includes('Authentication failed')) {
      console.error('Motivo provável: Usuário ou senha do MongoDB Atlas incorretos.');
    } else {
      console.error(error.message || error);
    }
    return null;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log('🔌 Conexão com MongoDB encerrada.');
}
