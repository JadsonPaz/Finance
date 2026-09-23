import { Router } from 'express';
import { syncController, syncSchema } from '../controllers/syncController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validateMiddleware';

const router = Router();

router.use(authMiddleware);
router.post('/', validate(syncSchema), syncController.sync);

export const syncRoutes = router;
