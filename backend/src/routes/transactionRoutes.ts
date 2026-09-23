import { Router } from 'express';
import {
  transactionController,
  listTransactionsSchema,
  summarySchema,
  createTransactionSchema,
  transactionIdSchema,
  updateTransactionSchema,
} from '../controllers/transactionController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validateMiddleware';

const router = Router();

// Todas as rotas de transações exigem autenticação
router.use(authMiddleware);

router.get('/', validate(listTransactionsSchema), transactionController.list);
router.get('/summary', validate(summarySchema), transactionController.getSummary);
router.post('/', validate(createTransactionSchema), transactionController.create);
router.get('/:id', validate(transactionIdSchema), transactionController.getById);
router.put('/:id', validate(transactionIdSchema), validate(updateTransactionSchema), transactionController.update);
router.delete('/:id', validate(transactionIdSchema), transactionController.delete);

export const transactionRoutes = router;
