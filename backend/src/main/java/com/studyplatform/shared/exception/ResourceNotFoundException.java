package com.studyplatform.shared.exception;
import com.studyplatform.shared.exception.GlobalExceptionHandler;

// Lançada quando um recurso não é encontrado no banco.
// O GlobalExceptionHandler captura e retorna HTTP 404 automaticamente.
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
