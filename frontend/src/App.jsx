import DocumentUpload from './components/DocumentUpload';
import './App.css'
import ChatInterface from './components/ChatInterface';

function App() {
 

  return (
    <>
     <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl space-y-6">
        
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Интелигентен Асистент</h1>
          <p className="text-gray-500 mt-2">Качете документ и задайте вашите въпроси</p>
        </header>

       
        <DocumentUpload /> 
        <ChatInterface />

      </div>
    </div>
    </>
  )
}

export default App
