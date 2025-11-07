import DocumentUpload from '@/components/documents/document-upload';
import DocumentList from '@/components/documents/document-list';
import ChatInterface from '@/components/chat/chat-interface';

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dragon AI</h1>
          <p className="mt-2 text-gray-600">
            Upload course materials and chat with AI about your documents
          </p>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upload Documents
          </h2>
          <DocumentUpload />
        </div>

        {/* Documents List */}
        <div className="mb-8">
          <DocumentList />
        </div>

        {/* Chat Interface */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Chat with AI
          </h2>
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
