// utils/validate.dto.ts
import { validate, ValidationError } from 'class-validator';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { HttpStatus } from '../constant/http-status.enum';
import { ApiErrorDetail } from '../dtos/interface/response.interface';
import { AppError } from './middleware/errorHandler';

function extractErrors(
  errors: ValidationError[],
  parentPath = ''
): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = [];

  for (const error of errors) {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        details.push({ field, message });
      }
    }

    if (error.children && error.children.length > 0) {
      details.push(...extractErrors(error.children, field));
    }
  }

  return details;
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
    // Keep the joined message for clients that display a single string, and
    // expose structured field-level details for clients that need them.
    const details = extractErrors(errors);
    const message = details.map((detail) => detail.message).join('; ');
    throw new AppError(HttpStatus.BAD_REQUEST, message, details);
  }

  return dtoInstance;
}
