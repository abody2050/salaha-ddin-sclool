
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { ActivityLog, User, AppNotification } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyBtE8n6QMDjHa2yjA-uUpv4vPs4vP6AYO4",
  authDomain: "salah-al-din-school.firebaseapp.com",
  projectId: "salah-al-din-school",
  storageBucket: "salah-al-din-school.firebasestorage.app",
  messagingSenderId: "496226906080",
  appId: "1:496226906080:web:efda4eaee1908624700585",
  measurementId: "G-X5Z6DYLKGG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const isPlainObject = (val: any): boolean => {
  if (typeof val !== 'object' || val === null) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
};

/**
 * وظيفة لتطهير البيانات من المراجع الدائرية والأنواع غير المتوافقة مع JSON.
 * تضمن هذه الوظيفة أن الكائنات المعقدة (مثل عناصر DOM أو كائنات Firebase الداخلية) 
 * يتم تحويلها إلى سلاسل نصية أو كائنات بسيطة.
 */
export const sanitizeData = (obj: any, seen = new WeakSet()): any => {
  // التعامل مع القيم البسيطة (Primitives)
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'function' || typeof obj === 'symbol') return undefined;
    return obj === undefined ? null : obj;
  }

  // منع المراجع الدائرية باستخدام WeakSet
  if (seen.has(obj)) return "[Circular Reference]";

  // التعامل مع كائنات التاريخ (Date) أو كائنات Firebase التي تحتوي على toDate
  if (typeof obj.toDate === 'function') {
    try {
      return obj.toDate().toISOString();
    } catch (e) {
      return String(obj);
    }
  }
  if (obj instanceof Date) return obj.toISOString();

  // التعامل مع المصفوفات
  if (Array.isArray(obj)) {
    seen.add(obj);
    const result: any[] = [];
    obj.forEach(item => {
      const sanitized = sanitizeData(item, seen);
      if (sanitized !== undefined) result.push(sanitized);
    });
    return result;
  }

  // التحقق مما إذا كان الكائن "بسيطاً" (POJO)
  // الكائنات المعقدة (مثل كائنات Firestore الداخلية Q$1 أو DOM Elements) لا تعتبر بسيطة
  if (!isPlainObject(obj)) {
    return String(obj);
  }

  // التعامل مع الكائنات البسيطة (Plain Objects)
  seen.add(obj);
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // استبعاد الخصائص الداخلية التي تبدأ بـ _ أو الوظائف
    if (key.startsWith('_') || typeof value === 'function') continue;
    
    const val = sanitizeData(value, seen);
    if (val !== undefined) sanitized[key] = val;
  }
  
  return sanitized;
};

export const saveToFirestore = async (col: string, id: string, data: any) => {
  try {
    const cleanedData = sanitizeData(data);
    await setDoc(doc(db, col, id), cleanedData, { merge: true });
  } catch (e) {
    console.error(`Error saving to ${col}:`, e);
    throw e;
  }
};

export const deleteFromFirestore = async (col: string, id: string) => {
  try {
    await deleteDoc(doc(db, col, id));
  } catch (e) {
    console.error(`Error deleting from ${col}:`, e);
    throw e;
  }
};

export const fetchCollection = async (col: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, col));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (e) {
    console.error(`Error fetching collection ${col}:`, e);
    return [];
  }
};

export const logActivity = async (user: User, action: string, category: ActivityLog['category'], details?: string) => {
  const log: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    category,
    timestamp: new Date().toISOString(),
    details
  };
  await saveToFirestore("activity_logs", log.id, log);

  const notif: AppNotification = {
    id: `notif-${Date.now()}`,
    title: action,
    message: details || `تم تنفيذ عملية ${action} بواسطة ${user.name}`,
    type: 'SYSTEM',
    from: user.name,
    createdAt: new Date().toISOString(),
    isRead: false
  };
  await saveToFirestore("notifications", notif.id, notif);
};

export const getSystemConfig = async () => {
  try {
    const snap = await getDoc(doc(db, "settings", "config"));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("Error getting system config:", e);
    return null;
  }
};

export const saveSystemConfig = async (config: any) => {
  await setDoc(doc(db, "settings", "config"), sanitizeData(config));
};

export const seedInitialData = async (staff: any[], students: any[], config: any) => {
  try {
    const configExists = await getDoc(doc(db, "settings", "config"));
    if (configExists.exists()) return;
    const batch = writeBatch(db);
    batch.set(doc(db, "settings", "config"), sanitizeData(config));
    await batch.commit();
  } catch (e) {
    console.error("Critical Seeding Error:", e);
  }
};
