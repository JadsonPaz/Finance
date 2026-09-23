import mongoose, { Document, Schema, Types } from 'mongoose';

export type TransactionType = 'income' | 'expense';

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  groupId: Types.ObjectId;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
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
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'O tipo da transação deve ser income ou expense'],
    },
    amount: {
      type: Number,
      required: [true, 'O valor é obrigatório'],
      min: [0.01, 'O valor deve ser maior que zero'],
    },
    description: {
      type: String,
      required: [true, 'A descrição é obrigatória'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'A data é obrigatória no formato YYYY-MM-DD'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido. Use YYYY-MM-DD'],
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
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

// Índice composto para buscar transações ativas por grupo e mês rapidamente
TransactionSchema.index({ groupId: 1, date: 1, isDeleted: 1 });

export const Transaction = mongoose.model<ITransaction>(
  'Transaction',
  TransactionSchema
);
