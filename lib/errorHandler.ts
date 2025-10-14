export class GitManagerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'GitManagerError';
  }
}

export class ProjectNotFoundError extends GitManagerError {
  constructor(projectId: string) {
    super(`Project with id ${projectId} not found`, 'PROJECT_NOT_FOUND', 404);
  }
}

export class GitOperationError extends GitManagerError {
  constructor(operation: string, details: string) {
    super(`Git operation failed: ${operation} - ${details}`, 'GIT_OPERATION_FAILED', 500);
  }
}

export class ConfigError extends GitManagerError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 'CONFIG_ERROR', 500);
  }
}

export function handleError(error: unknown): GitManagerError {
  if (error instanceof GitManagerError) {
    return error;
  }

  if (error instanceof Error) {
    return new GitManagerError(error.message, 'UNKNOWN_ERROR');
  }

  return new GitManagerError('An unknown error occurred', 'UNKNOWN_ERROR');
}
