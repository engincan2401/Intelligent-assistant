@echo off
echo Стартиране на Интелигентен Асистент...


echo Стартиране на сървъра (Backend)...
start cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload"


timeout /t 2 /nobreak > NUL

echo Стартиране на потребителския интерфейс (Frontend)...
start cmd /k "cd frontend && npm run dev"

echo Приложението се зарежда! Можете да затворите този прозорец.