import mongoose from 'mongoose';
import { env, validateEnv } from '../config/env';

async function testMongoConnection() {
  console.log('====================================================');
  console.log('🔍 TESTE DE CONEXÃO COM O MONGODB ATLAS');
  console.log('====================================================');

  validateEnv();

  if (!env.MONGODB_URI) {
    console.error('\n❌ Falha: A variável MONGODB_URI está vazia no arquivo backend/.env!');
    console.log('\nPasso a passo para configurar:');
    console.log('1. Abra o arquivo backend/.env');
    console.log('2. Cole a sua URI do MongoDB Atlas:');
    console.log('   MONGODB_URI=mongodb+srv://<usuario>:<senha>@cluster0.abcde.mongodb.net/finance_db?retryWrites=true&w=majority');
    console.log('3. Execute novamente: npm run test:db');
    process.exit(1);
  }

  // Oculta a senha no log para segurança
  const maskedUri = env.MONGODB_URI.replace(/:([^@]+)@/, ':****@');
  console.log(`\nTentando conectar a:\n${maskedUri}\n`);

  try {
    const startTime = Date.now();
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    const elapsed = Date.now() - startTime;

    console.log('----------------------------------------------------');
    console.log(`✅ CONEXÃO ESTABELECIDA COM SUCESSO! (${elapsed}ms)`);
    console.log('----------------------------------------------------');
    console.log(`📡 Host: ${conn.connection.host}`);
    console.log(`📁 Banco de Dados: ${conn.connection.name}`);
    console.log(`🔢 ReadyState: ${conn.connection.readyState} (1 = Conectado)`);

    // Testa listagem de coleções
    const collections = await conn.connection.db?.listCollections().toArray();
    console.log(`📚 Coleções encontradas no cluster: ${collections?.length || 0}`);
    collections?.forEach((c) => console.log(`   - ${c.name}`));

    console.log('\n🎉 O MongoDB Atlas está perfeitamente configurado e pronto para uso!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERRO AO CONECTAR AO MONGODB ATLAS:');
    console.error(error.message || error);

    console.log('\n🛠️ Dicas para resolver este erro:');
    if (error.name === 'MongoServerSelectionError' || error.message?.includes('ETIMEDOUT') || error.message?.includes('ENOTFOUND')) {
      console.log('1. Verifique o "Network Access" no painel do MongoDB Atlas:');
      console.log('   - Adicione o seu endereço IP atual ou configure "0.0.0.0/0" (Permitir acesso de qualquer lugar temporariamente para testes).');
      console.log('2. Verifique sua conexão com a internet.');
    } else if (error.message?.includes('Authentication failed') || error.message?.includes('bad auth')) {
      console.log('1. O usuário ou senha informados na MONGODB_URI estão incorretos.');
      console.log('2. Se a sua senha tiver caracteres especiais (como @, :, /, #), eles precisam ser codificados via URL (URL-encode).');
    }

    process.exit(1);
  }
}

testMongoConnection();
