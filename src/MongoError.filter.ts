import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MongoError, MongoServerError } from 'mongodb';

type responseBody = {
  statusCode: number;
  message: string;
  error?: string;
};

@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}
  catch(exception: MongoError, host: ArgumentsHost) {
    this.logger.error(`MongoError: ${exception.message}`, exception.stack);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let statusCode: number;
    let message: string;
    let error: string;

    switch (exception.code) {
      case 11000: // duplicate key
        let field: string = 'field';
        if (exception instanceof MongoServerError) {
          field = Object.keys(exception.errorResponse.keyPattern)[0];
        }
        statusCode = HttpStatus.CONFLICT;
        error = 'Duplicate data';
        message = `This ${field} is already in use`;
        break;
      default:
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Internal server error';
        error = '';
        break;
    }

    const responseBody: responseBody = {
      statusCode,
      message,
    };
    if (error) {
      responseBody.error = error;
    }
    response.status(statusCode).json(responseBody);
  }
}
