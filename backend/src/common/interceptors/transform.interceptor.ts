import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse<ExpressResponse>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data: unknown) => {
        const resObj = data as Record<string, unknown> | null | undefined;
        const message =
          resObj && typeof resObj.message === 'string'
            ? resObj.message
            : 'Operation successful';
        const responseData = resObj && 'data' in resObj ? resObj.data : data;

        return {
          statusCode,
          message,
          data: responseData as T,
        };
      }),
    );
  }
}
