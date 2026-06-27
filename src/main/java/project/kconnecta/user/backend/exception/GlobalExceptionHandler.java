package project.kconnecta.user.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.apache.catalina.connector.ClientAbortException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // 404
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ResourceNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    // 409
    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<?> handleDuplicate(DuplicateResourceException ex) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    // 400/429 chat message validation (keyword, link, duplicate spam)
    @ExceptionHandler(ChatValidationException.class)
    public ResponseEntity<?> handleChatValidation(ChatValidationException ex) {
        HttpStatus status = "CHAT_RATE_LIMITED".equals(ex.getCode())
                ? HttpStatus.TOO_MANY_REQUESTS
                : HttpStatus.BAD_REQUEST;
        return buildResponse(status, ex.getMessage());
    }

    // 400 custom validation
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<?> handleValidation(ValidationException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    // 401 refresh token không hợp lệ / bị tái dùng
    @ExceptionHandler({InvalidRefreshTokenException.class, RefreshTokenReuseException.class})
    public ResponseEntity<?> handleRefreshToken(RuntimeException ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    // 401 tài khoản bị khóa (refresh / login) — body giống JwtAuthenticationFilter để frontend hiện màn hình khóa
    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<?> handleAccountLocked(AccountLockedException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", ex.getMessage());
        body.put("accountStatus", "BLOCKED");
        var account = ex.getAccount();
        body.put("blockedReason", account.getLockReason() != null && !account.getLockReason().isBlank()
                ? account.getLockReason()
                : "Tài khoản của bạn đang bị khóa do vi phạm hoặc cần admin xem xét.");
        body.put("lockedUntil", account.getLockedUntil());
        body.put("email", account.getEmail());
        var user = ex.getUser();
        if (user != null) {
            body.put("fullName", user.getFullName());
            body.put("username", user.getUsername());
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    // 400 domain bad request
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<?> handleBadRequest(BadRequestException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    // 400 multipart too large
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "File quá lớn. Giới hạn hiện tại là 100MB.");
    }

    // 403 forbidden
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<?> handleForbidden(ForbiddenException ex) {
        return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    // 409 call state conflict
    @ExceptionHandler(CallStateException.class)
    public ResponseEntity<?> handleCallState(CallStateException ex) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    // 405 wrong HTTP method
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<?> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        log.debug("HTTP method not supported: {}", ex.getMessage());
        return buildResponse(HttpStatus.METHOD_NOT_ALLOWED, ex.getMessage());
    }

    // 400 invalid path/query parameter type (e.g. username passed where UUID expected)
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<?> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String param = ex.getName() != null ? ex.getName() : "parameter";
        String expected = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "value";
        return buildResponse(HttpStatus.BAD_REQUEST, "Invalid " + param + ": expected " + expected);
    }

    // 400 @Valid
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleMethodArgument(MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(err -> err.getField() + " " + err.getDefaultMessage())
                .orElse("Validation error");

        return buildResponse(HttpStatus.BAD_REQUEST, errorMessage);
    }

    // 503 redis unavailable
    @ExceptionHandler(RedisConnectionFailureException.class)
    public ResponseEntity<?> handleRedis(RedisConnectionFailureException ex) {
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE, "Redis khong kha dung. Vui long thu lai sau.");
    }

    // Client closed the connection before the response finished (tab switch, refresh, cancelled fetch).
    @ExceptionHandler({
            ClientAbortException.class,
            AsyncRequestNotUsableException.class
    })
    public void handleClientAbort(Exception ex) {
        log.debug("Client disconnected before response completed: {}", ex.getMessage());
    }

    @ExceptionHandler(IOException.class)
    public void handleIOException(IOException ex) {
        if (isClientDisconnect(ex)) {
            log.debug("Client disconnected while writing response: {}", ex.getMessage());
            return;
        }
        log.error("Unhandled IO exception", ex);
    }

    // fallback 500 — never expose internal exception messages to clients
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(Exception ex) {
        if (isClientDisconnect(ex)) {
            log.debug("Client disconnected: {}", ex.getMessage());
            return null;
        }
        log.error("Unhandled exception", ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An internal server error occurred");
    }

    private static boolean isClientDisconnect(Throwable ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof ClientAbortException
                    || current instanceof AsyncRequestNotUsableException) {
                return true;
            }
            String message = current.getMessage();
            if (message != null && message.contains("connection was aborted")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);

        return new ResponseEntity<>(body, status);
    }
}
