export interface Question {
  id: string;
  text: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface QuizResult {
  correctCount: number;
  totalCount: number;
  precision: number;
  timeSpent: number;
  strongPoints: string[];
  weakPoints: string[];
  suggestions: string[];
}

export interface StudySessionData {
  title: string;
  subject: string;
  sections: {
    id: string;
    title: string;
    content: string[];
  }[];
  questions: Question[];
}

export const mockStudySession: StudySessionData = {
  subject: 'DIREITO CONSTITUCIONAL',
  title: 'Artigo 5º da CF/88',
  sections: [
    {
      id: 'sec-1',
      title: '1. Introdução aos Direitos Coletivos',
      content: [
        'O Artigo 5º da Constituição Federal de 1988 é o pilar dos direitos e garantias fundamentais no Brasil. Ele assegura que todos são iguais perante a lei, sem distinção de qualquer natureza.',
        'Entre as garantias, destaca-se a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade. Estes direitos aplicam-se tanto a brasileiros quanto a estrangeiros residentes no país.'
      ]
    },
    {
      id: 'sec-2',
      title: '2. Liberdade de Expressão e Consciência',
      content: [
        'A manifestação do pensamento é livre, sendo vedado o anonimato. A liberdade de consciência e de crença é inviolável, assegurando o livre exercício dos cultos religiosos e a proteção aos locais de culto.',
        'Ninguém será privado de direitos por motivo de crença religiosa ou de convicção filosófica ou política, salvo se as invocar para eximir-se de obrigação legal a todos imposta.'
      ]
    }
  ],
  questions: [
    {
      id: 'q-1',
      text: 'Qual das alternativas descreve corretamente uma regra sobre a manifestação de pensamento no Artigo 5º?',
      options: [
        { id: 'opt-1-a', text: 'É livre a manifestação, sendo permitido o anonimato em casos excepcionais.', isCorrect: false },
        { id: 'opt-1-b', text: 'É livre a manifestação do pensamento, sendo expressamente vedado o anonimato.', isCorrect: true },
        { id: 'opt-1-c', text: 'A manifestação do pensamento é restrita aos cidadãos nascidos no país.', isCorrect: false },
        { id: 'opt-1-d', text: 'Toda manifestação artística depende de licença prévia estatal.', isCorrect: false }
      ],
      explanation: 'De acordo com o inciso IV do Artigo 5º da CF/88: "é livre a manifestação do pensamento, sendo vedado o anonimato".'
    },
    {
      id: 'q-2',
      text: 'A inviolabilidade de consciência e de crença garante:',
      options: [
        { id: 'opt-2-a', text: 'O livre exercício dos cultos religiosos e a proteção aos locais de culto.', isCorrect: true },
        { id: 'opt-2-b', text: 'Que o Estado possa escolher uma religião oficial.', isCorrect: false },
        { id: 'opt-2-c', text: 'Apenas a crença em religiões monoteístas.', isCorrect: false },
        { id: 'opt-2-d', text: 'O direito de cometer crimes motivados por crenças sem punição.', isCorrect: false }
      ],
      explanation: 'O inciso VI dispõe: "é inviolável a liberdade de consciência e de crença, sendo assegurado o livre exercício dos cultos religiosos e garantida, na forma da lei, a proteção aos locais de culto e a suas liturgias".'
    },
    {
      id: 'q-3',
      text: 'O direito à propriedade assegurado pela Constituição Federal é:',
      options: [
        { id: 'opt-3-a', text: 'Absoluto, não podendo ser relativizado sob nenhuma circunstância.', isCorrect: false },
        { id: 'opt-3-b', text: 'Condicionado a que a propriedade atenda a sua função social.', isCorrect: true },
        { id: 'opt-3-c', text: 'Exclusivo para pessoas jurídicas de direito público.', isCorrect: false },
        { id: 'opt-3-d', text: 'Extinto em caso de desapropriação sem indenização.', isCorrect: false }
      ],
      explanation: 'O inciso XXII garante o direito de propriedade, e o inciso XXIII afirma que "a propriedade atenderá a sua função social".'
    }
  ]
};
