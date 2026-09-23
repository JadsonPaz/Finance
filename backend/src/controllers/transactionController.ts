import { Request, Response } from 'express';
import { z } from 'zod';
import { Transaction } from '../models/Transaction';
import { GroupMember } from '../models/GroupMember';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID inválido');
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Mês deve estar no formato AAAA-MM');

export const listTransactionsSchema = z.object({
  query: z.object({
    groupId: objectIdSchema.optional(),
    month: monthSchema.optional(),
    type: z.enum(['all', 'income', 'expense']).optional(),
    scope: z.enum(['all', 'mine']).optional(),
  }),
});

export const summarySchema = z.object({
  query: z.object({
    groupId: objectIdSchema.optional(),
    month: monthSchema.optional(),
    scope: z.enum(['all', 'mine']).optional(),
  }),
});

export const transactionIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const createTransactionSchema = z.object({
  body: z.object({
    groupId: objectIdSchema.optional(),
    type: z.enum(['income', 'expense']),
    amount: z.number().positive('O valor deve ser maior que zero'),
    description: z.string().min(1, 'A descrição é obrigatória'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD'),
  }),
});

export const updateTransactionSchema = z.object({
  body: z.object({
    type: z.enum(['income', 'expense']).optional(),
    amount: z.number().positive('O valor deve ser maior que zero').optional(),
    description: z.string().min(1, 'A descrição é obrigatória').optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD').optional(),
  }),
});

export const transactionController = {
  async list(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const groupId = req.query.groupId as string || user.currentGroupId?.toString();

    if (!groupId) {
      res.status(400).json({ message: 'Você precisa pertencer a um grupo para visualizar transações.' });
      return;
    }

    // Valida se o usuário é membro do grupo
    const isMember = await GroupMember.findOne({ userId: user._id, groupId });
    if (!isMember) {
      res.status(403).json({ message: 'Você não tem acesso a este grupo financeiro.' });
      return;
    }

    const { month, type, scope } = req.query;

    const filter: any = {
      groupId,
      isDeleted: false,
    };

    // Filtro por mês (YYYY-MM)
    if (month && typeof month === 'string') {
      filter.date = { $regex: `^${month}` };
    }

    // Filtro por tipo (income | expense)
    if (type === 'income' || type === 'expense') {
      filter.type = type;
    }

    // Filtro por criador (apenas minhas ou todos do grupo)
    if (scope === 'mine') {
      filter.userId = user._id;
    }

    const transactions = await Transaction.find(filter)
      .populate<{ userId: { _id: any; name: string } }>('userId', 'name')
      .sort({ date: -1, createdAt: -1 });

    const formatted = transactions.map((t) => ({
      id: t._id.toString(),
      userId: t.userId ? t.userId._id.toString() : null,
      userName: t.userId ? t.userId.name : 'Desconhecido',
      groupId: t.groupId.toString(),
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: t.date,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      isOwner: t.userId ? t.userId._id.toString() === user._id.toString() : false,
    }));

    res.status(200).json({ transactions: formatted });
  },

  async getSummary(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const groupId = req.query.groupId as string || user.currentGroupId?.toString();
    const month = req.query.month as string;

    if (!groupId) {
      res.status(400).json({ message: 'Grupo não definido.' });
      return;
    }

    const isMember = await GroupMember.findOne({ userId: user._id, groupId });
    if (!isMember) {
      res.status(403).json({ message: 'Acesso negado ao grupo.' });
      return;
    }

    const filter: any = {
      groupId,
      isDeleted: false,
    };

    if (month) {
      filter.date = { $regex: `^${month}` };
    }

    if (req.query.scope === 'mine') {
      filter.userId = user._id;
    }

    const transactions = await Transaction.find(filter);

    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        expense += t.amount;
      }
    }

    income = Math.round(income * 100) / 100;
    expense = Math.round(expense * 100) / 100;
    const balance = Math.round((income - expense) * 100) / 100;

    res.status(200).json({
      summary: {
        income,
        expense,
        balance,
        month: month || 'all',
        totalCount: transactions.length,
      },
    });
  },

  async create(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const groupId = req.body.groupId || user.currentGroupId?.toString();

    if (!groupId) {
      res.status(400).json({ message: 'Você precisa estar em um grupo para adicionar lançamentos.' });
      return;
    }

    const isMember = await GroupMember.findOne({ userId: user._id, groupId });
    if (!isMember) {
      res.status(403).json({ message: 'Você não é membro do grupo indicado.' });
      return;
    }

    const { type, amount, description, date } = req.body;

    const transaction = await Transaction.create({
      userId: user._id,
      groupId,
      type,
      amount: Math.round(amount * 100) / 100,
      description: description.trim(),
      date,
    });

    res.status(201).json({
      transaction: {
        id: transaction._id.toString(),
        userId: user._id.toString(),
        userName: user.name,
        groupId: transaction.groupId.toString(),
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        isOwner: true,
      },
      message: 'Lançamento adicionado com sucesso.',
    });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { id } = req.params;

    const transaction = await Transaction.findOne({ _id: id, isDeleted: false }).populate<{
      userId: { _id: any; name: string };
    }>('userId', 'name');

    if (!transaction) {
      res.status(404).json({ message: 'Lançamento não encontrado.' });
      return;
    }

    const isMember = await GroupMember.findOne({ userId: user._id, groupId: transaction.groupId });
    if (!isMember) {
      res.status(403).json({ message: 'Você não tem acesso a este lançamento.' });
      return;
    }

    res.status(200).json({
      transaction: {
        id: transaction._id.toString(),
        userId: transaction.userId._id.toString(),
        userName: transaction.userId.name,
        groupId: transaction.groupId.toString(),
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        isOwner: transaction.userId._id.toString() === user._id.toString(),
      },
    });
  },

  async update(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { id } = req.params;

    const transaction = await Transaction.findOne({ _id: id, isDeleted: false });
    if (!transaction) {
      res.status(404).json({ message: 'Lançamento não encontrado.' });
      return;
    }

    // Regra de permissão estrita: apenas o criador pode editar!
    if (transaction.userId.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'Você só pode editar os lançamentos que você mesmo criou.' });
      return;
    }

    const { type, amount, description, date } = req.body;

    if (type) transaction.type = type;
    if (amount !== undefined) transaction.amount = Math.round(amount * 100) / 100;
    if (description) transaction.description = description.trim();
    if (date) transaction.date = date;

    await transaction.save();

    res.status(200).json({
      transaction: {
        id: transaction._id.toString(),
        userId: user._id.toString(),
        userName: user.name,
        groupId: transaction.groupId.toString(),
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        isOwner: true,
      },
      message: 'Lançamento atualizado com sucesso.',
    });
  },

  async delete(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { id } = req.params;

    const transaction = await Transaction.findOne({ _id: id, isDeleted: false });
    if (!transaction) {
      res.status(404).json({ message: 'Lançamento não encontrado.' });
      return;
    }

    // Regra de permissão estrita: apenas o criador pode excluir!
    if (transaction.userId.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'Você só pode excluir os lançamentos que você mesmo criou.' });
      return;
    }

    // Soft delete para que os outros membros sincronizem a exclusão
    transaction.isDeleted = true;
    await transaction.save();

    res.status(200).json({ message: 'Lançamento excluído com sucesso.' });
  },
};
