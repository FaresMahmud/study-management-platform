package com.studyplatform.summary;
import com.studyplatform.shared.exception.ResourceNotFoundException;
import com.studyplatform.subject.Subject;
import com.studyplatform.subject.SubjectRepository;
import com.studyplatform.summary.Summary;
import com.studyplatform.summary.SummaryMapper;
import com.studyplatform.summary.SummaryRepository;
import com.studyplatform.summary.dto.SummaryRequestDTO;
import com.studyplatform.summary.dto.SummaryResponseDTO;
import com.studyplatform.user.User;
import com.studyplatform.user.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SummaryService {

    private final SummaryRepository summaryRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final SummaryMapper summaryMapper;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário autenticado não encontrado"));
    }

    private Subject findSubjectByIdAndUser(Long subjectId, Long userId) {
        return subjectRepository.findByIdAndUserId(subjectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Matéria não encontrada com o id: " + subjectId));
    }


    @Transactional(readOnly = true)
    public Page<SummaryResponseDTO> findAll(int page, int size) {
        User user = getAuthenticatedUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());

        return summaryRepository.findByUserId(user.getId(), pageable)
                .map(summaryMapper::toResponseDTO);
    }

    @Transactional(readOnly = true)
    public SummaryResponseDTO findById(Long id) {
        User user = getAuthenticatedUser();
        Summary summary = summaryRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Resumo não encontrado com o id: " + id));
        return summaryMapper.toResponseDTO(summary);
    }

    @Transactional(readOnly = true)
    public List<SummaryResponseDTO> findBySubjectId(Long subjectId) {
        User user = getAuthenticatedUser();
        // Valida se a matéria existe e pertence ao usuário
        findSubjectByIdAndUser(subjectId, user.getId());
        
        return summaryRepository.findByUserIdAndSubjectId(user.getId(), subjectId)
                .stream()
                .map(summaryMapper::toResponseDTO)
                .toList();
    }

    @Transactional
    public SummaryResponseDTO create(SummaryRequestDTO request) {
        User user = getAuthenticatedUser();
        Subject subject = findSubjectByIdAndUser(request.getSubjectId(), user.getId());

        Summary summary = summaryMapper.toEntity(request, user, subject);
        summary.setContent(sanitizeHtml(summary.getContent()));
        Summary savedSummary = summaryRepository.save(summary);

        return summaryMapper.toResponseDTO(savedSummary);
    }

    @Transactional
    public SummaryResponseDTO update(Long id, SummaryRequestDTO request) {
        User user = getAuthenticatedUser();
        Summary summary = summaryRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Resumo não encontrado com o id: " + id));

        Subject subject = findSubjectByIdAndUser(request.getSubjectId(), user.getId());

        summaryMapper.updateEntityFromDTO(summary, request, subject);
        summary.setContent(sanitizeHtml(summary.getContent()));
        Summary updatedSummary = summaryRepository.save(summary);

        return summaryMapper.toResponseDTO(updatedSummary);
    }

    @Transactional
    public void delete(Long id) {
        User user = getAuthenticatedUser();
        Summary summary = summaryRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Resumo não encontrado com o id: " + id));

        summaryRepository.delete(summary);
    }

    private String sanitizeHtml(String html) {
        if (html == null) {
            return "";
        }
        // Permite tags comuns de formatação de texto rico (p, b, i, u, h1-h6, ul, ol, li, br, a, span)
        // removendo tags perigosas como script, style, iframe, e atributos de eventos inline.
        return Jsoup.clean(html, Safelist.relaxed()
                .addTags("span", "u", "mark", "code", "pre")
                .addAttributes("span", "style", "class")
                .addAttributes("a", "target", "rel")
                .addAttributes("code", "class"));
    }
}
