package com.studyplatform.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

// Intercepta todas as exceções lançadas nos controllers e services
// e transforma em respostas JSON padronizadas com ErrorResponseDTO.
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Erros de validação do Bean Validation (@NotBlank, @Email, @Size etc.)
    // Coleta todas as mensagens de erro de todos os campos e une com vírgula.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDTO> handleValidationException(
            MethodArgumentNotValidException exception) {

        String message = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        return buildResponse(HttpStatus.BAD_REQUEST, message);
    }

    // Recurso não encontrado no banco (404)
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleResourceNotFoundException(
            ResourceNotFoundException exception) {

        return buildResponse(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    // Violação de regra de negócio (400)
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponseDTO> handleBusinessException(
            BusinessException exception) {

        return buildResponse(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    // Login com email ou senha errados.
    // Não informamos qual dos dois está errado — evita dar dicas a quem tenta adivinhar.
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponseDTO> handleBadCredentialsException(
            BadCredentialsException exception) {

        return buildResponse(HttpStatus.UNAUTHORIZED, "Email ou senha inválidos");
    }

    // Fallback pra qualquer exceção não mapeada acima (500)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDTO> handleGenericException(
            Exception exception) {

        return buildResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocorreu um erro interno. Tente novamente mais tarde."
        );
    }

    private ResponseEntity<ErrorResponseDTO> buildResponse(HttpStatus status, String message) {
        ErrorResponseDTO error = ErrorResponseDTO.builder()
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(status).body(error);
    }
}
