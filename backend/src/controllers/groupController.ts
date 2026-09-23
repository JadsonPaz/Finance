import { Request, Response } from 'express';
import { z } from 'zod';
import { FinancialGroup } from '../models/FinancialGroup';
import { GroupMember } from '../models/GroupMember';
import { User } from '../models/User';
import { generateInviteCode } from '../utils/inviteCode';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID inválido');

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'O nome do grupo deve ter pelo menos 2 caracteres'),
  }),
});

export const joinGroupSchema = z.object({
  body: z.object({
    code: z.string().min(4, 'Código de convite inválido'),
  }),
});

export const groupIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const groupController = {
  async createGroup(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { name } = req.body;

    // Gera um código de convite único
    let inviteCode = generateInviteCode();
    let existing = await FinancialGroup.findOne({ inviteCode });
    while (existing) {
      inviteCode = generateInviteCode();
      existing = await FinancialGroup.findOne({ inviteCode });
    }

    const group = await FinancialGroup.create({
      name: name.trim(),
      inviteCode,
      createdBy: user._id,
    });

    // Vincula o criador como membro do grupo
    await GroupMember.create({
      userId: user._id,
      groupId: group._id,
    });

    // Define este grupo como o ativo para o usuário
    user.currentGroupId = group._id;
    await user.save();

    res.status(201).json({
      group: {
        id: group._id.toString(),
        name: group.name,
        inviteCode: group.inviteCode,
        createdAt: group.createdAt,
      },
      message: 'Grupo criado com sucesso!',
    });
  },

  async getCurrentGroup(req: Request, res: Response): Promise<void> {
    const user = req.user!;

    if (!user.currentGroupId) {
      res.status(200).json({ group: null, members: [] });
      return;
    }

    const group = await FinancialGroup.findById(user.currentGroupId);
    if (!group) {
      user.currentGroupId = undefined;
      await user.save();
      res.status(200).json({ group: null, members: [] });
      return;
    }

    // Busca todos os membros do grupo
    const memberships = await GroupMember.find({ groupId: group._id }).populate<{
      userId: { _id: any; name: string; email: string };
    }>('userId', 'name email');

    const members = memberships
      .filter((m) => m.userId != null)
      .map((m) => ({
        id: m.userId._id.toString(),
        name: m.userId.name,
        email: m.userId.email,
        joinedAt: m.createdAt,
        isCreator: group.createdBy.toString() === m.userId._id.toString(),
      }));

    res.status(200).json({
      group: {
        id: group._id.toString(),
        name: group.name,
        inviteCode: group.inviteCode,
        createdAt: group.createdAt,
      },
      members,
    });
  },

  async joinGroup(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { code } = req.body;

    const group = await FinancialGroup.findOne({
      inviteCode: code.toUpperCase().trim(),
    });

    if (!group) {
      res.status(404).json({ message: 'Nenhum grupo encontrado com este código de convite.' });
      return;
    }

    // Verifica se o usuário já faz parte do grupo
    const alreadyMember = await GroupMember.findOne({
      userId: user._id,
      groupId: group._id,
    });

    if (!alreadyMember) {
      await GroupMember.create({
        userId: user._id,
        groupId: group._id,
      });
    }

    // Define como grupo ativo
    user.currentGroupId = group._id;
    await user.save();

    res.status(200).json({
      group: {
        id: group._id.toString(),
        name: group.name,
        inviteCode: group.inviteCode,
        createdAt: group.createdAt,
      },
      message: `Você entrou no grupo "${group.name}" com sucesso!`,
    });
  },

  async getMembers(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { id: groupId } = req.params;

    // Valida se o usuário solicitante é membro do grupo
    const isMember = await GroupMember.findOne({ userId: user._id, groupId });
    if (!isMember) {
      res.status(403).json({ message: 'Você não tem permissão para visualizar este grupo.' });
      return;
    }

    const memberships = await GroupMember.find({ groupId }).populate<{
      userId: { _id: any; name: string; email: string };
    }>('userId', 'name email');

    const members = memberships
      .filter((m) => m.userId != null)
      .map((m) => ({
        id: m.userId._id.toString(),
        name: m.userId.name,
        email: m.userId.email,
        joinedAt: m.createdAt,
      }));

    res.status(200).json({ members });
  },
};
