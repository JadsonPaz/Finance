import { Request, Response } from 'express';
import { z } from 'zod';
import { Transaction } from '../models/Transaction';
import { GroupMember } from '../models/GroupMember';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID inválido');

export const syncSchema = z.object({
  body: z.object({
    groupId: objectIdSchema.optional(),
    lastSyncAt: z.string().datetime().optional(),
    mutations: z.array(
      z.object({
        action: z.enum(['create', 'update', 'delete']),
        clientTempId: z.string().optional(),
        id: objectIdSchema.optional(),
        data: z
          .object({
            type: z.enum(['income', 'expense']).optional(),
            amount: z.number().positive().optional(),
            description: z.string().optional(),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          })
          .optional(),
      })
    ).optional(),
  }),
});

export const syncController = {
  async sync(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const groupId = req.body.groupId || user.currentGroupId?.toString();

    if (!groupId) {
      res.status(400).json({ message: 'Grupo não definido para sincronização.' });
      return;
    }

    const isMember = await GroupMember.findOne({ userId: user._id, groupId });
    if (!isMember) {
      res.status(403).json({ message: 'Você não tem acesso a este grupo.' });
      return;
    }

    const { lastSyncAt, mutations = [] } = req.body;
    const processed: Array<{
      clientTempId?: string;
      serverId?: string;
      action: string;
      status: 'success' | 'error';
      message?: string;
    }> = [];

    // 1. Processar mutações enviadas pelo cliente offline
    for (const mut of mutations) {
      try {
        if (mut.action === 'create' && mut.data) {
          const newTx = await Transaction.create({
            userId: user._id,
            groupId,
            type: mut.data.type,
            amount: Math.round((mut.data.amount || 0) * 100) / 100,
            description: (mut.data.description || '').trim(),
            date: mut.data.date,
          });

          processed.push({
            clientTempId: mut.clientTempId,
            serverId: newTx._id.toString(),
            action: 'create',
            status: 'success',
          });
        } else if (mut.action === 'update' && mut.id && mut.data) {
          const tx = await Transaction.findOne({ _id: mut.id, isDeleted: false });
          if (!tx) {
            processed.push({
              serverId: mut.id,
              action: 'update',
              status: 'error',
              message: 'Transação não encontrada.',
            });
            continue;
          }

          if (tx.userId.toString() !== user._id.toString()) {
            processed.push({
              serverId: mut.id,
              action: 'update',
              status: 'error',
              message: 'Permissão negada para editar lançamento de outro usuário.',
            });
            continue;
          }

          if (mut.data.type) tx.type = mut.data.type;
          if (mut.data.amount !== undefined) tx.amount = Math.round(mut.data.amount * 100) / 100;
          if (mut.data.description) tx.description = mut.data.description.trim();
          if (mut.data.date) tx.date = mut.data.date;

          await tx.save();

          processed.push({
            serverId: mut.id,
            action: 'update',
            status: 'success',
          });
        } else if (mut.action === 'delete' && mut.id) {
          const tx = await Transaction.findById(mut.id);
          if (!tx) {
            processed.push({
              serverId: mut.id,
              action: 'delete',
              status: 'success', // Já não existe
            });
            continue;
          }

          if (tx.userId.toString() !== user._id.toString()) {
            processed.push({
              serverId: mut.id,
              action: 'delete',
              status: 'error',
              message: 'Permissão negada para excluir lançamento de outro usuário.',
            });
            continue;
          }

          tx.isDeleted = true;
          await tx.save();

          processed.push({
            serverId: mut.id,
            action: 'delete',
            status: 'success',
          });
        }
      } catch (err: any) {
        processed.push({
          clientTempId: mut.clientTempId,
          serverId: mut.id,
          action: mut.action,
          status: 'error',
          message: err.message || 'Erro ao processar alteração.',
        });
      }
    }

    // 2. Buscar atualizações que ocorreram no servidor desde lastSyncAt
    const serverQuery: any = { groupId };
    if (lastSyncAt) {
      serverQuery.updatedAt = { $gt: new Date(lastSyncAt) };
    }

    const changedTransactions = await Transaction.find(serverQuery)
      .populate<{ userId: { _id: any; name: string } }>('userId', 'name')
      .sort({ updatedAt: 1 });

    const serverTransactions = changedTransactions
      .filter((t) => !t.isDeleted)
      .map((t) => ({
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

    const deletedIds = changedTransactions
      .filter((t) => t.isDeleted)
      .map((t) => t._id.toString());

    res.status(200).json({
      processed,
      serverTransactions,
      deletedIds,
      syncedAt: new Date().toISOString(),
    });
  },
};
