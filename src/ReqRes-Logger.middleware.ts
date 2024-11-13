import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v7 as uuidV7 } from 'uuid';

@Injectable()
export class ReqResLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('ReqResLogger');

  use(request: Request, response: Response, next: NextFunction): void {
    // const startAt = process.hrtime.bigint(); // For high resolution time (nanosecond)
    const startAt = Date.now(); // For low resolution time (millisecond)

    const reqId = uuidV7();
    request.headers['x-req-id'] = reqId;

    const { ip, method, originalUrl } = request;
    const RequestContentLength = request.headers['content-length'] || 0;
    const userAgent = request.get('user-agent') || '';

    const reqLogMessage = `Incoming request: ${method} ${originalUrl} ${RequestContentLength}bytes - ${userAgent} ${ip} - RequestID: ${reqId}`;
    this.logger.log(reqLogMessage);

    response.on('finish', () => {
      const { statusCode } = response;
      const ResponseContentLength = response.get('content-length') || 0;

      // For high resolution time (nanosecond)
      // const responseTime = (Number(process.hrtime.bigint() - startAt) / 1e6).toFixed(3); // Convert to milliseconds with 3 digit precision

      // For low resolution time (millisecond)
      const responseTime = Date.now() - startAt;

      const resLogMessage = `Returning response: ${statusCode} ${responseTime}ms ${ResponseContentLength}bytes - RequestID: ${reqId}`;
      if (statusCode < 300) {
        this.logger.log(resLogMessage);
      } else if (statusCode < 500) {
        this.logger.warn(resLogMessage);
      } else {
        this.logger.error(resLogMessage);
      }
    });

    next();
  }
}
