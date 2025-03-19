import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

export const executeError = (error: Error) => {
  if (error instanceof NotFoundException) {
    throw error;
  }
  if (error instanceof ConflictException) {
    throw error;
  }
  if (error instanceof BadRequestException) {
    throw error;
  }
  if (error instanceof ForbiddenException) {
    throw error;
  }
  throw new InternalServerErrorException(
    `An error occurred while processing the request: ${error.message}`,
  );
};
