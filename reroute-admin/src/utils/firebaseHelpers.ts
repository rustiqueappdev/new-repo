/**
 * Firebase helper utilities for common operations
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  DocumentData,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fetch documents from a collection with optional constraints
 * @param collectionName - Name of the Firestore collection
 * @param constraints - Optional query constraints
 * @returns Array of documents with IDs
 */
export const fetchCollection = async <T extends DocumentData>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<(T & { id: string })[]> => {
  try {
    const q = constraints.length > 0
      ? query(collection(db, collectionName), ...constraints)
      : collection(db, collectionName);

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T & { id: string }));
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Fetch paginated documents from a collection
 * @param collectionName - Name of the Firestore collection
 * @param pageSize - Number of documents per page
 * @param orderByField - Field to order by
 * @param orderDirection - Sort direction
 * @returns Array of documents with IDs
 */
export const fetchPaginatedCollection = async <T extends DocumentData>(
  collectionName: string,
  pageSize: number = 50,
  orderByField: string = 'created_at',
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<(T & { id: string })[]> => {
  return fetchCollection<T>(
    collectionName,
    orderBy(orderByField, orderDirection),
    limit(pageSize)
  );
};

/**
 * Fetch documents by field value
 * @param collectionName - Name of the Firestore collection
 * @param fieldName - Field to filter by
 * @param value - Value to match
 * @returns Array of matching documents with IDs
 */
export const fetchByField = async <T extends DocumentData>(
  collectionName: string,
  fieldName: string,
  value: any
): Promise<(T & { id: string })[]> => {
  return fetchCollection<T>(
    collectionName,
    where(fieldName, '==', value)
  );
};

/**
 * Fetch active documents (where is_active === true)
 * @param collectionName - Name of the Firestore collection
 * @returns Array of active documents with IDs
 */
export const fetchActiveDocuments = async <T extends DocumentData>(
  collectionName: string
): Promise<(T & { id: string })[]> => {
  return fetchCollection<T>(
    collectionName,
    where('is_active', '==', true)
  );
};

/**
 * Convert Firestore Timestamp to Date
 * @param timestamp - Firestore Timestamp or Date object
 * @returns Date object or null
 */
export const timestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;

  try {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return new Date(timestamp);
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return null;
  }
};

/**
 * Batch process array in chunks to avoid overwhelming Firestore
 * @param items - Array of items to process
 * @param batchSize - Size of each batch
 * @param processFn - Async function to process each batch
 * @returns Results from all batches
 */
export const batchProcess = async <T, R>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => Promise<R>
): Promise<R[]> => {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const result = await processFn(batch);
    results.push(result);
  }

  return results;
};

/**
 * Safe document data extractor that handles missing fields
 * @param data - Document data
 * @param fieldPath - Dot-notation field path (e.g., 'user.profile.name')
 * @param defaultValue - Default value if field doesn't exist
 * @returns Field value or default
 */
export const safeGet = <T>(
  data: any,
  fieldPath: string,
  defaultValue: T
): T => {
  if (!data) return defaultValue;

  const keys = fieldPath.split('.');
  let value = data;

  for (const key of keys) {
    if (value === null || value === undefined || !(key in value)) {
      return defaultValue;
    }
    value = value[key];
  }

  return value ?? defaultValue;
};

/**
 * Check if a document field contains a specific value (case-insensitive)
 * @param data - Document data
 * @param fieldName - Field to check
 * @param searchValue - Value to search for
 * @returns True if field contains the value
 */
export const fieldContains = (
  data: any,
  fieldName: string,
  searchValue: string
): boolean => {
  const fieldValue = safeGet(data, fieldName, '');
  const stringValue = String(fieldValue).toLowerCase();
  return stringValue.includes(searchValue.toLowerCase());
};
