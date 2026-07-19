package com.studyplatform.subject;
import com.studyplatform.shared.exception.BusinessException;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectMapper;
import com.studyplatform.subject.SubjectRepository;
import com.studyplatform.subject.SubjectService;
import com.studyplatform.subject.dto.SubjectRequestDTO;
import com.studyplatform.subject.dto.SubjectResponseDTO;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SubjectService — Testes Unitários")
class SubjectServiceTest {

    @Mock private SubjectRepository subjectRepository;
    @Mock private UserRepository userRepository;
    @Mock private SubjectMapper subjectMapper;
    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;

    @InjectMocks
    private SubjectService subjectService;

    private User authenticatedUser;
    private Subject subject;
    private SubjectRequestDTO requestDTO;
    private SubjectResponseDTO responseDTO;

    @BeforeEach
    void setUp() {
        // Configura o mock do SecurityContextHolder para simular usuário autenticado
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("joao@email.com");

        authenticatedUser = User.builder()
                .id(1L)
                .nameUser("João Silva")
                .email("joao@email.com")
                .build();

        subject = Subject.builder()
                .id(1L)
                .subjectName("Matemática")
                .subjectDescription("Álgebra e Cálculo")
                .color(new Color("#FF5733"))
                .user(authenticatedUser)
                .build();

        requestDTO = SubjectRequestDTO.builder()
                .subjectName("Matemática")
                .subjectDescription("Álgebra e Cálculo")
                .color("#FF5733")
                .build();

        responseDTO = SubjectResponseDTO.builder()
                .id(1L)
                .subjectName("Matemática")
                .subjectDescription("Álgebra e Cálculo")
                .color("#FF5733")
                .userId(1L)
                .userName("João Silva")
                .build();

        // Mock padrão para carregar o usuário autenticado
        when(userRepository.findByEmail("joao@email.com"))
                .thenReturn(Optional.of(authenticatedUser));
    }

    // ==================== TESTES DE LISTAGEM ====================

    @Test
    @DisplayName("findAll → retorna lista de subjects do usuário autenticado")
    void findAll_authenticatedUser_returnsUserSubjects() {
        // ARRANGE
        org.springframework.data.domain.Page<Subject> page = new org.springframework.data.domain.PageImpl<>(List.of(subject));
        when(subjectRepository.findByUserId(eq(1L), any(org.springframework.data.domain.Pageable.class))).thenReturn(page);
        when(subjectMapper.toResponseDTO(subject)).thenReturn(responseDTO);

        // ACT
        org.springframework.data.domain.Page<SubjectResponseDTO> result = subjectService.findAll(0, 10);

        // ASSERT
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSubjectName()).isEqualTo("Matemática");
        verify(subjectRepository).findByUserId(eq(1L), any(org.springframework.data.domain.Pageable.class));
    }

    @Test
    @DisplayName("findAll → retorna lista vazia quando usuário não tem subjects")
    void findAll_noSubjects_returnsEmptyList() {
        // ARRANGE
        when(subjectRepository.findByUserId(eq(1L), any(org.springframework.data.domain.Pageable.class))).thenReturn(org.springframework.data.domain.Page.empty());

        // ACT
        org.springframework.data.domain.Page<SubjectResponseDTO> result = subjectService.findAll(0, 10);

        // ASSERT
        assertThat(result.getContent()).isEmpty();
    }

    // ==================== TESTES DE BUSCA POR ID ====================

    @Test
    @DisplayName("findById → retorna subject quando pertence ao usuário")
    void findById_ownSubject_returnsSubjectResponse() {
        // ARRANGE
        when(subjectRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(subject));
        when(subjectMapper.toResponseDTO(subject)).thenReturn(responseDTO);

        // ACT
        SubjectResponseDTO result = subjectService.findById(1L);

        // ASSERT
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("findById → lança ResourceNotFoundException quando subject não pertence ao usuário")
    void findById_notOwnSubject_throwsResourceNotFoundException() {
        // ARRANGE — simula subject de outro usuário (retorna vazio)
        when(subjectRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        // ACT & ASSERT
        assertThatThrownBy(() -> subjectService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    // ==================== TESTES DE CRIAÇÃO ====================

    @Test
    @DisplayName("create → cria subject com sucesso quando nome é único")
    void create_uniqueName_returnsCreatedSubject() {
        // ARRANGE
        when(subjectRepository.existsBySubjectNameAndUserId("Matemática", 1L)).thenReturn(false);
        when(subjectMapper.toEntity(requestDTO, authenticatedUser)).thenReturn(subject);
        when(subjectRepository.save(subject)).thenReturn(subject);
        when(subjectMapper.toResponseDTO(subject)).thenReturn(responseDTO);

        // ACT
        SubjectResponseDTO result = subjectService.create(requestDTO);

        // ASSERT
        assertThat(result).isNotNull();
        assertThat(result.getSubjectName()).isEqualTo("Matemática");
        verify(subjectRepository).save(any(Subject.class));
    }

    @Test
    @DisplayName("create → lança BusinessException quando nome já existe para o usuário")
    void create_duplicateName_throwsBusinessException() {
        // ARRANGE
        when(subjectRepository.existsBySubjectNameAndUserId("Matemática", 1L)).thenReturn(true);

        // ACT & ASSERT
        assertThatThrownBy(() -> subjectService.create(requestDTO))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Matemática");

        verify(subjectRepository, never()).save(any());
    }

    // ==================== TESTES DE DELEÇÃO ====================

    @Test
    @DisplayName("delete → deleta subject com sucesso quando pertence ao usuário")
    void delete_ownSubject_deletesSuccessfully() {
        // ARRANGE
        when(subjectRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(subject));

        // ACT
        subjectService.delete(1L);

        // ASSERT — verifica que delete foi chamado com o subject correto
        verify(subjectRepository).delete(subject);
    }

    @Test
    @DisplayName("delete → lança ResourceNotFoundException quando subject não existe")
    void delete_nonExistentSubject_throwsResourceNotFoundException() {
        // ARRANGE
        when(subjectRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        // ACT & ASSERT
        assertThatThrownBy(() -> subjectService.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(subjectRepository, never()).delete(any());
    }
}
