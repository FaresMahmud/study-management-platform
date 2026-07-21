package com.studyplatform.examprep;

import org.springframework.context.ApplicationEvent;

public class ExamPrepActivityEvent extends ApplicationEvent {
    private final Long examPrepId;

    public ExamPrepActivityEvent(Object source, Long examPrepId) {
        super(source);
        this.examPrepId = examPrepId;
    }

    public Long getExamPrepId() {
        return examPrepId;
    }
}
