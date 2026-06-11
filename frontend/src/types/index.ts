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
  progress: number; // in hours
  objectiveHours: number; // in hours
  startDateGoal: string; // YYYY-MM-DD
  endDateGoal: string; // YYYY-MM-DD
  subject?: Subject;
}

export interface AuthResponse {
  token: string;
  userName: string;
  userEmail: string;
}
