import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

export const documentService = {
  
  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  
  getDocuments: async () => {
    const response = await api.get('/documents/list');
    return response.data.documents;
  },

  deleteDocument: async (filename) => {
    const response = await api.delete(`/documents/delete/${filename}`);
    return response.data;
  },
  getSummary: async (filename) => {
    const response = await api.get(`/documents/summary/${filename}`);
    return response.data.summary;
  },
};


export const flashcardService = {
  generateFlashcards: async (filename) => {
    const response = await api.post('/chat/flashcards', { 
      filename: filename 
    });
    return response.data.flashcards;
  }
};

export const quizService = {
  generateQuiz: async (filename, numQuestions = 5) => {
    const response = await api.post('/chat/quiz', {
      filename: filename,
      num_questions: numQuestions
    });
    return response.data.questions;
  }
};