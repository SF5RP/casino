export default function SchoolPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Школьные предметы
          </h1>
          <p className="text-gray-600 mb-8">Выберите предмет для изучения</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="block bg-gray-50 rounded-lg p-6 opacity-50">
              <div className="text-center">
                <div className="text-4xl mb-4">📚</div>
                <h2 className="text-xl font-semibold text-gray-500 mb-2">
                  Физика
                </h2>
                <p className="text-gray-400">Скоро будет доступно</p>
              </div>
            </div>

            <div className="block bg-gray-50 rounded-lg p-6 opacity-50">
              <div className="text-center">
                <div className="text-4xl mb-4">🧪</div>
                <h2 className="text-xl font-semibold text-gray-500 mb-2">
                  Химия
                </h2>
                <p className="text-gray-400">Скоро будет доступно</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
