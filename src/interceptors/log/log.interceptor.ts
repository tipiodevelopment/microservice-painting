// log.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { logger } from './logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const delay = Date.now() - now;
        logger.info(`Handled ${method} ${url} in ${delay}ms`, {
          method,
          url,
          delay,
          response: data,
        });
      }),
    );
  }
}
