import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.').replace(/^body\./, ''),
          message: err.message,
        }));
        res.status(400).json({
          message: 'Dados inválidos fornecidos.',
          errors,
        });
        return;
      }
      res.status(500).json({ message: 'Erro interno na validação.' });
    }
  };
}
