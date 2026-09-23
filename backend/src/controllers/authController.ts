import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { FinancialGroup } from '../models/FinancialGroup';
import { generateToken } from '../utils/jwt';

// Esquemas de validação Zod
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'A senha é obrigatória'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres').optional(),
  }),
});

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(409).json({ message: 'Este email já está cadastrado.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        currentGroupId: null,
      },
    });
  },

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({ message: 'Email ou senha inválidos.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Email ou senha inválidos.' });
      return;
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        currentGroupId: user.currentGroupId ? user.currentGroupId.toString() : null,
      },
    });
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = req.user!;

    let currentGroup = null;
    if (user.currentGroupId) {
      currentGroup = await FinancialGroup.findById(user.currentGroupId);
    }

    res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        currentGroupId: user.currentGroupId ? user.currentGroupId.toString() : null,
      },
      currentGroup: currentGroup
        ? {
            id: currentGroup._id.toString(),
            name: currentGroup.name,
            inviteCode: currentGroup.inviteCode,
          }
        : null,
    });
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { name, currentPassword, newPassword } = req.body;

    if (name) {
      user.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ message: 'Informe a senha atual para alterá-la.' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ message: 'Senha atual incorreta.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.status(200).json({
      message: 'Perfil atualizado com sucesso.',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        currentGroupId: user.currentGroupId ? user.currentGroupId.toString() : null,
      },
    });
  },
};
