import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import logger from './logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  // private readonly logger = new Logger('HeartService');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const body = request.body ?? {};
    const query = request.query ?? {};
    const params = request.params ?? {};

    const microservice = 'paint-microservice';
    const startTimestamp = new Date().toISOString();
    const startTime = Date.now();

    // if (url === '/auth/health-check') {
    //   return next.handle();
    // }

    logger.info(
      `[${microservice}] [START] ${method} ${url} [Query] ${JSON.stringify(query)} [Params] ${JSON.stringify(params)} [Body] ${JSON.stringify(body)} [Timestamp] ${startTimestamp}`,
    );

    return next.handle().pipe(
      tap((response) => {
        const endTime = Date.now();
        const delay = endTime - startTime;
        const endTimestamp = new Date().toISOString();
        logger.info(
          `[${microservice}] [END] ${method} ${url} [Response] ${JSON.stringify(response)} [Processing Time] ${delay}ms [Timestamp] ${endTimestamp}`,
        );
      }),
      catchError((error) => {
        console.info('error', error);
        const endTime = Date.now();
        const delay = endTime - startTime;
        const errorTimestamp = new Date().toISOString();
        logger.error(
          `[${microservice}] [ERROR] ${method} ${url} [Message] ${error.message} [Processing Time] ${delay}ms [Timestamp] ${errorTimestamp}`,
        );
        throw error;
      }),
    );
  }
}
