"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { storage } from "@/lib/storage"
import { post, get, API_ENDPOINTS, createFormData, createSearchParams } from "@/lib/api"
import { toast } from "sonner"

import { formatBilingual } from '@/lib/translations'
import { unwrapApiRecordById } from "@/lib/utils"
import { AxiosResponse } from "axios"
interface ApiResponse<T> {
  status: boolean
  message: string
  success : string
  data?: T[]
}

export function useCRUD<T extends { id: string; createdAt: string }>(
  storageKey: string, 
  initialData: T[] = [],
  apiEndpoints?: {
    create?: string
    read?: string
    update?: string
    delete?: string
    readById?: string
  },
  options?: {
    autoLoad?: boolean
    defaultFilters?: Record<string, any>
  }
) {
  const [records, setRecords] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const apiCallMade = useRef(false)
  const isInitialized = useRef(false)

  // Memoize API endpoints to prevent unnecessary re-renders
  const memoizedApiEndpoints = useMemo(() => apiEndpoints, [apiEndpoints])

  // Load initial data from localStorage and API
  useEffect(() => {
    // Prevent multiple API calls using both state and ref
    if (hasLoaded || apiCallMade.current || isInitialized.current) return

    const loadInitialData = async () => {
      try {
        isInitialized.current = true
        setHasLoaded(true)
        apiCallMade.current = true
        
        const shouldAutoLoad = options?.autoLoad ?? true

        // Check localStorage first for faster initial render
        const saved = storage.get(storageKey)
        if (saved && Array.isArray(saved) && saved.length > 0) {
          console.log(`[useCRUD] Using cached data: ${saved.length} records`)
          setRecords(saved)
          setLoading(false)
          
          // Still fetch fresh data in background if API is available
          if (shouldAutoLoad && memoizedApiEndpoints?.read) {
            fetchFreshData()
          }
          return
        }

        // If no cached data and API endpoints are provided, try to fetch from API
        if (shouldAutoLoad && memoizedApiEndpoints?.read) {
          console.log(`[useCRUD] Fetching data from API: ${memoizedApiEndpoints.read}`)
          let response: AxiosResponse<ApiResponse<T>>
          if (options?.defaultFilters && Object.keys(options.defaultFilters).length > 0) {
            const formData = createFormData(options.defaultFilters)
            response = await post<ApiResponse<T>>(memoizedApiEndpoints.read, formData)
          } else {
            response = await get<ApiResponse<T>>(memoizedApiEndpoints.read)
          }
          // Check for both 'status' and 'success' fields to handle different API response formats
          const isSuccess = response.data.status || response.data.success
          
          if (isSuccess && response.data.data) {
            console.log(`[useCRUD] API data received: ${response.data.data.length} records`)
            setRecords(response.data.data)
            storage.set(storageKey, response.data.data)
            setLoading(false)
            return
          }
        }
        
        // Fallback to initial data
        if (initialData.length > 0) {
          console.log(`[useCRUD] Using initial data: ${initialData.length} records`)
          setRecords(initialData)
          storage.set(storageKey, initialData)
        }
      } catch (error) {
        console.error("Error loading initial data:", error)
        // Fallback to localStorage on error
        const saved = storage.get(storageKey)
        if (saved && Array.isArray(saved) && saved.length > 0) {
          setRecords(saved)
        } else if (initialData.length > 0) {
          setRecords(initialData)
          storage.set(storageKey, initialData)
        }
      } finally {
        setLoading(false)
      }
    }

    // Background data fetch function
    const fetchFreshData = async () => {
      try {
        if (!memoizedApiEndpoints?.read) return
        
        let response: AxiosResponse<ApiResponse<T>>
        if (options?.defaultFilters && Object.keys(options.defaultFilters).length > 0) {
          const formData = createFormData(options.defaultFilters)
          response = await post<ApiResponse<T>>(memoizedApiEndpoints.read, formData)
        } else {
          response = await get<ApiResponse<T>>(memoizedApiEndpoints.read)
        }
        
        const isSuccess = response.data.status || response.data.success
        
        if (isSuccess && response.data.data) {
          console.log(`[useCRUD] Background refresh: ${response.data.data.length} records`)
          setRecords(response.data.data)
          storage.set(storageKey, response.data.data)
        }
      } catch (error) {
        console.error("Background data fetch failed:", error)
      }
    }
    
    loadInitialData()
  }, [storageKey, initialData, hasLoaded, options?.autoLoad, options?.defaultFilters]) // Removed memoizedApiEndpoints?.read from dependencies

  // API CRUD operations
  const createApi = useCallback(async (data: any): Promise<T | null> => {
    if (!memoizedApiEndpoints?.create) return null
    
    try {
      setLoading(true)
      setError(null)
      
      const formData = createFormData(data)
      const response = await post<ApiResponse<T>>(memoizedApiEndpoints.create!, formData)
      
      // Check for both 'status' and 'success' fields to handle different API response formats
      const isSuccess = response.data.status || response.data.success
      
      if (isSuccess) {
        const newRecord = {
          ...data,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        } as T
        
        const updatedRecords = [...records, newRecord]
        setRecords(updatedRecords)
        storage.set(storageKey, updatedRecords)
        
        toast.success(response.data.message || "Record created successfully")
        return newRecord
      } else {
        throw new Error(response.data.message || "Failed to create record")
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create record"
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [memoizedApiEndpoints?.create, records, storageKey])

  const readApi = useCallback(async (filters?: Record<string, any>): Promise<T[]> => {
    if (!memoizedApiEndpoints?.read) return []
    
    try {
      setLoading(true)
      setError(null)
      
      let response: AxiosResponse<ApiResponse<T>>
      
      if (filters && Object.keys(filters).length > 0) {
        // Use POST with form-encoded data when filters are present
        const formData = createFormData(filters)
        console.log(`[useCRUD] Fetching filtered data from API with POST: ${memoizedApiEndpoints.read}`)
        response = await post<ApiResponse<T>>(memoizedApiEndpoints.read, formData)
      } else {
        // Use GET without filters
        console.log(`[useCRUD] Fetching all data from API with GET: ${memoizedApiEndpoints.read}`)
        response = await get<ApiResponse<T>>(memoizedApiEndpoints.read)
      }
      
      // Check for both 'status' and 'success' fields to handle different API response formats
      const isSuccess = response.data.status || response.data.success
      
      if (isSuccess) {
        const transformedData = response.data.data || []
        console.log(`[useCRUD] API data received: ${transformedData.length} records`)
        setRecords(transformedData)
        storage.set(storageKey, transformedData)
        return transformedData
      } else {
        throw new Error(response.data.message || "Failed to fetch records")
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch records"
      setError(errorMessage)
      toast.error(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [memoizedApiEndpoints?.read, storageKey])

  const readByIdApi = useCallback(async (id: string): Promise<T | null> => {
    if (!memoizedApiEndpoints?.readById) return null
    
    try {
      setLoading(true)
      setError(null)
      
      // Use POST with form-encoded data
      const formData = createFormData({ id })
      console.log(`[useCRUD] Fetching record by ID with POST: ${memoizedApiEndpoints.readById}`)
      const response = await post<ApiResponse<T>>(memoizedApiEndpoints.readById, formData)
      
      // Check for both 'status' and 'success' fields to handle different API response formats
      const isSuccess = response.data.status || response.data.success
      
      if (isSuccess && response.data.data) {
        const record = unwrapApiRecordById<T>(response.data.data, id)
        if (record) return record
        throw new Error(response.data.message || formatBilingual("messages.recordNotFound"))
      } else {
        throw new Error(response.data.message || formatBilingual("messages.recordNotFound"))
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch record"
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [memoizedApiEndpoints?.readById])

  const updateApi = useCallback(async (id: string, data: any): Promise<boolean> => {
    if (!memoizedApiEndpoints?.update) return false
    
    try {
      setLoading(true)
      setError(null)
      
      const formData = createFormData({ ...data, id })
      const response = await post<ApiResponse<T>>(memoizedApiEndpoints.update!, formData)
      
      // Check for both 'status' and 'success' fields to handle different API response formats
      const isSuccess = response.data.status || response.data.success
      
      if (isSuccess) {
        const updatedRecords = records.map((record) => 
          record.id === id ? { ...record, ...data } : record
        )
        setRecords(updatedRecords)
        storage.set(storageKey, updatedRecords)
        
        toast.success(response.data.message || formatBilingual("messages.recordUpdated"))
        return true
      } else {
        throw new Error(response.data.message || "Failed to update record")
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to update record"
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [memoizedApiEndpoints?.update, records, storageKey])

  const deleteApi = useCallback(async (id: string): Promise<boolean> => {
    if (!memoizedApiEndpoints?.delete) return false
    
    try {
      setLoading(true)
      setError(null)
      
      const formData = createFormData({ id })
      const response = await post<ApiResponse<T>>(memoizedApiEndpoints.delete!, formData)
      
      // Check for both 'status' and 'success' fields to handle different API response formats
      const isSuccess = response.data.status || response.data.success
      
      if (isSuccess) {
        const updatedRecords = records.filter((record) => record.id !== id)
        setRecords(updatedRecords)
        storage.set(storageKey, updatedRecords)
        
        toast.success(response.data.message || formatBilingual("messages.recordDeleted"))
        return true
      } else {
        throw new Error(response.data.message || formatBilingual("messages.failedToDelete"))
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || formatBilingual("messages.failedToDelete")
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [memoizedApiEndpoints?.delete, records, storageKey])

  // Local CRUD operations (fallback)
  const create = (newRecord: Omit<T, "id" | "createdAt">) => {
    const record = {
      ...newRecord,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    } as T

    const updatedRecords = [...records, record]
    setRecords(updatedRecords)
    storage.set(storageKey, updatedRecords)
    return record
  }

  const update = (id: string, updatedData: Partial<T>) => {
    const updatedRecords = records.map((record) => (record.id === id ? { ...record, ...updatedData } : record))
    setRecords(updatedRecords)
    storage.set(storageKey, updatedRecords)
  }

  const remove = (id: string) => {
    const updatedRecords = records.filter((record) => record.id !== id)
    setRecords(updatedRecords)
    storage.set(storageKey, updatedRecords)
  }

  const getById = (id: string) => {
    return records.find((record) => record.id === id)
  }

  return {
    records,
    loading,
    error,
    create,
    update,
    remove,
    getById,
    // API methods
    createApi,
    readApi,
    readByIdApi,
    updateApi,
    deleteApi,
  }
}
