
export enum ViewState {
  HOME = 'HOME',
  SIMULATION = 'SIMULATION',
  CHAT = 'CHAT',
  EXAM = 'EXAM',
}

export type Language = 'en' | 'ar' | 'he';

export interface BodyParams {
  id: string;
  name: string;
  x0: number; // Initial Position (m)
  v0: number; // Initial Velocity (m/s)
  a: number;  // Acceleration (m/s^2)
  color: string;
  // New fields for Graph Builder
  isCustomGraph?: boolean;
  graphPoints?: { t: number; v: number }[]; // Points on a v-t graph
}

export interface SimulationStep {
  t: number;
  bodyA: { x: number; v: number };
  bodyB: { x: number; v: number };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  images?: string[]; // Changed from single image to array
  // Legacy support for older stored messages (optional)
  image?: string; 
  timestamp: number;
  isError?: boolean;
}

export interface Question {
  id: string;
  text: string;
  options?: string[]; // Multiple choice options
  correctAnswer: string; // The correct option or value
  explanation: string;
  type: 'multiple-choice' | 'open';
}

export interface ExamState {
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  completed: boolean;
  answers: Record<string, string>; // questionId -> userAnswer
}

export interface UserProgress {
  weaknesses: string[];
  topicsMastered: string[];
  interactionCount: number;
}
