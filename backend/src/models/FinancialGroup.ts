import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFinancialGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  inviteCode: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialGroupSchema = new Schema<IFinancialGroup>(
  {
    name: {
      type: String,
      required: [true, 'Nome do grupo é obrigatório'],
      trim: true,
    },
    inviteCode: {
      type: String,
      required: [true, 'Código de convite é obrigatório'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

export const FinancialGroup = mongoose.model<IFinancialGroup>(
  'FinancialGroup',
  FinancialGroupSchema
);
