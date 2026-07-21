package com.studyplatform.analytics;

import java.util.List;
import java.util.Map;

public record LearningZoneResponseDTO(
    int masteryPercentage,
    int accuracyRate,
    int totalTimeMinutes,
    int streakDays,
    String zone,
    List<Map<String, Object>> weeklyProgress,
    List<String> weakTopics,
    List<String> strongTopics
) {}
