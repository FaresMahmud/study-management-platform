package com.studyplatform.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que representa a resposta enviada ao cliente após
 * um registro ou login bem-sucedido.
 *
 * Retornamos apenas o token JWT e informações básicas do usuário.
 * NUNCA retornamos a senha, mesmo que seja o hash BCrypt.
 *
 * O frontend armazena o token (ex: localStorage) e o envia
 * em todas as requisições futuras no header:
 *   Authorization: Bearer <token>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponseDTO {

    /**
     * Token JWT gerado após autenticação bem-sucedida.
     * O cliente usa este token para acessar rotas protegidas.
     */
    private String token;

    /**
     * Tipo do token — sempre "Bearer" no padrão JWT.
     * Informamos aqui para o frontend montar o header corretamente.
     */
    private String tokenType;

    /**
     * Dados básicos do usuário autenticado.
     * Útil para o frontend exibir o nome do usuário logado
     * sem precisar fazer outra requisição.
     */
    private Long id;
    private String nameUser;
    private String email;
}
