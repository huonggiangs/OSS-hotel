export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  details?: Record<string, unknown>;

  constructor(statusCode: number, errorCode: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export const Errors = {
  notFound: (entity: string) => new ApiError(404, "NOT_FOUND", `Không tìm thấy ${entity}.`),
  validation: (details?: Record<string, unknown>) => new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", details),
};
