import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception.getStatus();
    const exccptionResponse = exception.getResponse();

    const error =
      typeof exccptionResponse === 'string'
        ? { message: exccptionResponse }
        : (exccptionResponse as object)

    const res = {
      statusCode: status,
      ...error,
      timestamp: new Date().toISOString()
    }

    Logger.error(res);
    response.status(status).json(res);
  }
}
