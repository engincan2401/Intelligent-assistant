import axios from "axios";
import { Upload } from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
});

export const documentService = {
    uploadPDF: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post('/documents/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        return response.data
    }
}


export const chatService = {
    askQuestion: async (question) => {
        const response = await apiClient.post('/chat/ask', {question});
        return response.data;
    }
}