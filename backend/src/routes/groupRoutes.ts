import { Router } from 'express';
import {
  groupController,
  createGroupSchema,
  groupIdSchema,
  joinGroupSchema,
} from '../controllers/groupController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validateMiddleware';

const router = Router();

// Todas as rotas de grupos requerem autenticação
router.use(authMiddleware);

router.post('/', validate(createGroupSchema), groupController.createGroup);
router.get('/current', groupController.getCurrentGroup);
router.post('/join', validate(joinGroupSchema), groupController.joinGroup);
router.get('/:id/members', validate(groupIdSchema), groupController.getMembers);

export const groupRoutes = router;
