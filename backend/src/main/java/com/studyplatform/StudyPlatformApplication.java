package com.studyplatform;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Ponto de entrada da aplicação.
// @SpringBootApplication já ativa escaneamento de componentes,
// autoconfiguração e definição de beans nesta classe.
@SpringBootApplication
public class StudyPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(StudyPlatformApplication.class, args);
    }
}
