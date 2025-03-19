import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return data;
      }),
      catchError((error) => {
        if (error instanceof NotFoundException) {
          return throwError(() => error);
        }
        if (error instanceof ConflictException) {
          return throwError(() => error);
        }
        if (error instanceof BadRequestException) {
          return throwError(() => error);
        }
        if (error instanceof ForbiddenException) {
          return throwError(() => error);
        }
        return throwError(() => ({
          statusCode: 500,
          error: 'Internal server error',
          message: error.message,
        }));
      }),
    );
  }
}
