export interface User {
  id: number;
  nameUser: string;
  email: string;
  creationDate: string;
}

export interface Subject {
  id: number;
  subjectName: string;
  subjectDescription?: string;
  color?: string;
  examPrepId?: number;
}

export interface StudySession {
  id: number;
  duration: number; // in minutes
  sessionDate: string; // YYYY-MM-DD
  observations?: string;
  subject: Subject;
}

export interface Goal {
  id: number;
  title: string;
  progress?: number; // legacy
  objectiveHours?: number; // legacy
  currentMastery: number; // 0-100%
  targetMastery: number; // 1-100%
  startDateGoal: string; // YYYY-MM-DD
  endDateGoal: string; // YYYY-MM-DD
  completionPercentage: number;
  subject?: Subject;
  examPrepId?: number;
  examPrepTitle?: string;
}

export interface AuthResponse {
  token: string;
  userName: string;
  userEmail: string;
  premium: boolean;
}

export interface Summary {
  id: number;
  title: string;
  content: string; // HTML formatado do editor
  creationDate: string;
  lastModifiedDate: string;
  userId: number;
  userName: string;
  subject: Subject;
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  nextReviewDate: string;
  box: number;
  creationDate: string;
  userId: number;
  subject: Subject;
  summaryId?: number;
  summaryTitle?: string;
}

export interface ExamPrep {
  id: number;
  title: string;
  examDate: string;
  targetScore: number;
  status: string;
  daysRemaining?: number;
  userId?: number;
  shareToken?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PDFFile {
  id: number;
  fileName: string;
  fileUrl: string;
  subjectId: number;
  uploadedAt?: string;
}

export interface FileAnnotation {
  id?: number;
  pageNumber?: number;
  notes?: string;
  fileId?: number;
  createdAt?: string;
  type?: string;
  content: string;
}

export interface SpringPage<T> {
  content: T[];
  pageable?: unknown;
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}
