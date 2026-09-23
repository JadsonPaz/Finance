import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { User, IUser } from '../models/User';

// Estende a interface Request do Express para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token de autenticação não fornecido.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload || !payload.userId) {
    res.status(401).json({ message: 'Token inválido ou expirado.' });
    return;
  }

  try {
    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({ message: 'Usuário não encontrado.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro no authMiddleware:', error);
    res.status(500).json({ message: 'Erro interno ao validar autenticação.' });
  }
}
