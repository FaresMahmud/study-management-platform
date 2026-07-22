package com.studyplatform;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;
import org.junit.jupiter.api.Assumptions;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class StudyPlatformApplicationTests {

    static MySQLContainer<?> mysql;

    static {
        try {
            if (DockerClientFactory.instance().isDockerAvailable()) {
                mysql = new MySQLContainer<>("mysql:8.0")
                        .withDatabaseName("studyflow")
                        .withUsername("root")
                        .withPassword("root");
                mysql.start();
            }
        } catch (Exception e) {
            // Silencia erro para permitir fallback
            mysql = null;
        }
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (mysql != null && mysql.isRunning()) {
            registry.add("spring.datasource.url", mysql::getJdbcUrl);
            registry.add("spring.datasource.username", mysql::getUsername);
            registry.add("spring.datasource.password", mysql::getPassword);
            registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
            registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.MySQLDialect");
        } else {
            // Fallback para H2 se Docker não estiver rodando
            registry.add("spring.datasource.url", () -> "jdbc:h2:mem:studyflow;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDER=HIGH");
            registry.add("spring.datasource.username", () -> "sa");
            registry.add("spring.datasource.password", () -> "");
            registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
            registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.H2Dialect");
        }
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
    }

    @BeforeAll
    static void checkDocker() {
        Assumptions.assumeTrue(mysql != null && mysql.isRunning(), "Docker não está disponível. Pulando testes com Testcontainers.");
    }

    @Test
    void contextLoads() {
        assertThat(mysql).isNotNull();
        assertThat(mysql.isRunning()).isTrue();
    }
}
