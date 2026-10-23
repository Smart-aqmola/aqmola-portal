import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  ValidationError,
} from "@nestjs/common";

const messages: Record<string, string> = {
  validation_error: "Проверьте заполненные поля.",
  stale: "Данные изменились. Обновите страницу и повторите действие.",
  otp_rate_limited: "Слишком много запросов кода. Попробуйте позже.",
  otp_delivery_failed: "Не удалось доставить код. Попробуйте позже.",
  registration_conflict: "Не удалось зарегистрироваться с указанными данными.",
  otp_invalid_or_expired: "Код неверен или срок его действия истёк.",
  session_required: "Войдите в личный кабинет.",
  session_invalid_or_expired: "Сессия завершена. Войдите повторно.",
  service_not_found: "Услуга не найдена.",
  database_unavailable: "Сервис временно недоступен.",
  bad_request: "Не удалось обработать запрос.",
  unauthorized: "Требуется вход в систему.",
  forbidden: "Недостаточно прав для этого действия.",
  not_found: "Запрошенные данные не найдены.",
  internal_error: "Не удалось выполнить действие. Попробуйте позже.",
};
export class ApiFault extends HttpException {
  constructor(status: number, code: string, fields?: Record<string, string>) {
    super(
      {
        error: {
          code,
          message: messages[code] ?? messages.bad_request,
          ...(fields ? { fields } : {}),
        },
      },
      status,
    );
  }
}
export function validationFault(errors: ValidationError[]): ApiFault {
  const fields: Record<string, string> = Object.create(null);
  const visit = (error: ValidationError, prefix = "") => {
    const key = prefix ? `${prefix}.${error.property}` : error.property;
    const rules = error.constraints ?? {};
    if (Object.keys(rules).length)
      fields[key] = rules.whitelistValidation
        ? "format"
        : rules.maxLength
          ? "long"
          : error.value === undefined || error.value === null || error.value === "" || rules.equals
            ? "required"
            : "format";
    error.children?.forEach((child) => visit(child, key));
  };
  errors.forEach((error) => visit(error));
  return new ApiFault(400, "validation_error", fields);
}
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    let status = 500;
    let body: unknown = { error: { code: "internal_error", message: messages.internal_error } };
    if (exception instanceof ApiFault) {
      status = exception.getStatus();
      body = exception.getResponse();
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      const raw =
        typeof response === "string" ? response : (response as { message?: unknown }).message;
      const candidate = typeof raw === "string" ? raw.toLowerCase() : "";
      const fallback: Record<number, string> = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        413: "bad_request",
      };
      const code = Object.hasOwn(messages, candidate)
        ? candidate
        : (fallback[status] ?? "bad_request");
      body = { error: { code, message: messages[code] } };
    } else Logger.error("Unhandled API error", "ApiExceptionFilter");
    host
      .switchToHttp()
      .getResponse<{ status(value: number): { json(value: unknown): void } }>()
      .status(status)
      .json(body);
  }
}
