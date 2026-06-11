package com.studyplatform.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Configuração do Swagger UI.
// Após subir a aplicação, acesse http://localhost:8080/swagger-ui.html
// Para testar rotas protegidas: faça login, copie o token e clique em "Authorize" no Swagger.
@Configuration
public class OpenApiConfig {

    public static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Study Management Platform API")
                        .description("""
                                API REST para gerenciamento de estudos.
                                
                                Funcionalidades:
                                - Autenticação com JWT
                                - Gerenciamento de matérias (Subjects)
                                - Registro de sessões de estudo (Study Sessions)
                                - Criação e acompanhamento de metas (Goals)
                                
                                Para testar endpoints protegidos:
                                1. Faça login em POST /api/auth/login
                                2. Copie o token retornado
                                3. Clique em "Authorize" e cole: Bearer {seu_token}
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Study Platform Team")
                                .email("studyplatform@email.com")
                        )
                )
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .name(SECURITY_SCHEME_NAME)
                                        .description("Informe o token JWT no formato: Bearer {token}")
                        )
                )
                // Aplica segurança em todos os endpoints por padrão.
                // Endpoints públicos sobrescrevem com @SecurityRequirements({})
                .addSecurityItem(new SecurityRequirement()
                        .addList(SECURITY_SCHEME_NAME)
                );
    }
}
