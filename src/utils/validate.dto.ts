// utils/validate.dto.ts
import { validate, ValidationError } from 'class-validator';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { AppError } from './middleware/errorHandler';

function extractMessages(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    if (error.children && error.children.length > 0) {
      messages.push(...extractMessages(error.children));
    }
  }
  return messages;
}

export async function validateDto<T extends object>(
  dtoClass: ClassConstructor<T>,
  plain: object
): Promise<T> {
  const dtoInstance = plainToInstance(dtoClass, plain);
  const errors = await validate(dtoInstance, {
    skipMissingProperties: false, 
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    // i removed the "validation failed" before the message so that itll be easier for frontend to display the error message directly - if they choose to
    const messages = extractMessages(errors).join('; ');
    throw new AppError(400,`${messages}`); 
  }

  return dtoInstance;
}
