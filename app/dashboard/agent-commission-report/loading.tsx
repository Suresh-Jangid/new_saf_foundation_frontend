export default function Loading() {
  return (
    <div className="p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading agent commission report...</p>
        </div>
      </div>
    </div>
  )
}

