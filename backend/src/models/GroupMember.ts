import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGroupMember extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  groupId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GroupMemberSchema = new Schema<IGroupMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'FinancialGroup',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Garante que um usuário só é membro uma única vez no mesmo grupo
GroupMemberSchema.index({ userId: 1, groupId: 1 }, { unique: true });

export const GroupMember = mongoose.model<IGroupMember>(
  'GroupMember',
  GroupMemberSchema
);
