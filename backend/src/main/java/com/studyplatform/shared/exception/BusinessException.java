package com.studyplatform.shared.exception;
import com.studyplatform.shared.exception.GlobalExceptionHandler;

// Lançada quando uma regra de negócio é violada.
// O GlobalExceptionHandler captura e retorna HTTP 400 automaticamente.
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
