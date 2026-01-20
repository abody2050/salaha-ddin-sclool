
import { GoogleGenAI, Type } from "@google/genai";
import { AttendanceStatus } from "../types";
import { sanitizeData } from "./firebaseService";

const safeStringify = (data: any): string => {
  try {
    const cleanData = sanitizeData(data);
    return JSON.stringify(cleanData);
  } catch (e) {
    console.error("AI Data Serialization failed:", e);
    return "Error: circular or complex structure";
  }
};

export interface OCRResult {
  students: {
    name: string;
    status: AttendanceStatus;
    note?: string;
  }[];
}

export interface StudentExtractionResult {
  students: {
    fullName: string;
    parentPhone?: string;
    birthDate?: string; // YYYY-MM-DD format
    notes?: string;
  }[];
}

export interface StaffExtractionResult {
  staff: {
    name: string;
    gender: 'MALE' | 'FEMALE';
    phone?: string;
    jobTitle: 'PRINCIPAL' | 'VICE_PRINCIPAL' | 'TEACHER' | 'ADMIN_STAFF';
  }[];
}

export interface GradeExtractionResult {
  grades: {
    studentName: string;
    homework?: number;
    attendance?: number;
    oral?: number;
    written?: number;
    total?: number;
  }[];
}

export const analyzeAttendanceImage = async (base64Image: string): Promise<OCRResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1] || base64Image
              }
            },
            { text: "حلل صورة كشف الحضور واستخرج الأسماء وحالة الحضور بدقة JSON." }
          ]
        }
      ],
      config: {
        systemInstruction: "أنت خبير في التعرف على الخطوط العربية وتحليل كشوف الحضور. استخرج البيانات بتنسيق JSON حصراً.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            students: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  status: { type: Type.STRING },
                  note: { type: Type.STRING }
                },
                required: ["name", "status"]
              }
            }
          }
        }
      }
    });

    if (!response.text) throw new Error("لم يتم استلام رد من AI");
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI OCR Error:", error);
    throw new Error("تعذر تحليل الصورة بدقة.");
  }
};

export const analyzeStudentListImage = async (base64Image: string): Promise<StudentExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1] || base64Image
              }
            },
            { text: "استخرج قائمة الطلاب من هذا الكشف. ركز على الاسم الكامل، رقم الجوال، وتاريخ الميلاد إن وجد." }
          ]
        }
      ],
      config: {
        systemInstruction: `أنت نظام رؤية حاسوبية متطور متخصص في الوثائق التعليمية العربية. 
        قم باستخراج الأسماء الرباعية بدقة. 
        إذا وجد رقم هاتف (يبدأ بـ 7 أو 0) استخرجه كـ parentPhone. 
        إذا وجد تاريخ ميلاد استخرجه بتنسيق YYYY-MM-DD. 
        إذا لم تجد تاريخ الميلاد اترك الحقل فارغاً. 
        أرجع النتيجة بصيغة JSON فقط.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            students: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fullName: { type: Type.STRING, description: "الاسم الكامل للطالب" },
                  parentPhone: { type: Type.STRING, description: "رقم تواصل ولي الأمر" },
                  birthDate: { type: Type.STRING, description: "تاريخ الميلاد YYYY-MM-DD" },
                  notes: { type: Type.STRING, description: "أي ملاحظات إضافية مكتوبة بجانب الاسم" }
                },
                required: ["fullName"]
              }
            }
          }
        }
      }
    });

    if (!response.text) throw new Error("فشل الرد من خادم الذكاء الاصطناعي");
    const result = JSON.parse(response.text);
    if (!result.students || result.students.length === 0) throw new Error("لم يتم العثور على أي أسماء طلاب في هذه الصورة");
    return result;
  } catch (error: any) {
    console.error("AI Extraction Error:", error);
    throw new Error(error.message || "حدث خطأ أثناء معالجة صورة الكشف، تأكد من الإضاءة والوضوح.");
  }
};

export const analyzeStaffListImage = async (base64Image: string): Promise<StaffExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1] || base64Image
              }
            },
            { text: "استخرج قائمة المعلمين من هذا الكشف. استخرج الاسم، الجنس (ذكر/أنثى)، رقم الهاتف، والمسمى الوظيفي." }
          ]
        }
      ],
      config: {
        systemInstruction: `أنت خبير موارد بشرية في نظام مدرسي. قم باستخراج بيانات المعلمين بدقة.
        الجنس يجب أن يكون MALE للذكور و FEMALE للإناث.
        المسمى الوظيفي يجب أن يكون أحد القيم التالية: PRINCIPAL, VICE_PRINCIPAL, TEACHER, ADMIN_STAFF.
        إذا لم يتضح المسمى الوظيفي، افترض أنه TEACHER.
        أرجع النتيجة بصيغة JSON فقط.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            staff: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  gender: { type: Type.STRING, enum: ["MALE", "FEMALE"] },
                  phone: { type: Type.STRING },
                  jobTitle: { type: Type.STRING, enum: ["PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "ADMIN_STAFF"] }
                },
                required: ["name", "gender", "jobTitle"]
              }
            }
          }
        }
      }
    });

    if (!response.text) throw new Error("فشل الرد من خادم الذكاء الاصطناعي");
    const result = JSON.parse(response.text);
    if (!result.staff || result.staff.length === 0) throw new Error("لم يتم العثور على بيانات معلمين في الصورة");
    return result;
  } catch (error: any) {
    console.error("AI Staff Extraction Error:", error);
    throw new Error(error.message || "تعذر تحليل كشف المعلمين.");
  }
};

export const analyzeTeacherGradesImage = async (base64Image: string): Promise<GradeExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1] || base64Image
              }
            },
            { text: "استخرج درجات الطلاب من كشف المعلم. استخرج الاسم، ودرجات الواجبات، الحضور، الشفهي، والتحريري." }
          ]
        }
      ],
      config: {
        systemInstruction: `أنت مساعد المعلم الذكي. مهمتك استخراج درجات الطلاب من الجداول الورقية. 
        ابحث عن أعمدة (الواجب، الحضور، الشفهي، التحريري). 
        استخرج الأرقام بدقة. إذا كان الحقل فارغاً، لا تضع قيمة. 
        أرجع النتيجة بصيغة JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grades: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  studentName: { type: Type.STRING },
                  homework: { type: Type.NUMBER },
                  attendance: { type: Type.NUMBER },
                  oral: { type: Type.NUMBER },
                  written: { type: Type.NUMBER },
                  total: { type: Type.NUMBER }
                },
                required: ["studentName"]
              }
            }
          }
        }
      }
    });

    if (!response.text) throw new Error("فشل الرد من خادم الذكاء الاصطناعي");
    const result = JSON.parse(response.text);
    if (!result.grades || result.grades.length === 0) throw new Error("لم يتم العثور على درجات طلاب في هذه الصورة");
    return result;
  } catch (error: any) {
    console.error("AI Grade Extraction Error:", error);
    throw new Error(error.message || "فشل تحليل كشف الدرجات.");
  }
};

export const generateEducationalInsights = async (attendanceData: any, gradesData: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const cleanAttendance = safeStringify(attendanceData);
    const cleanGrades = safeStringify(gradesData);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `بيانات الحضور: ${cleanAttendance}\nبيانات الدرجات: ${cleanGrades}`,
      config: {
        systemInstruction: "أنت مستشار تعليمي، قدم رؤى وتوصيات بناءً على هذه البيانات.",
        temperature: 0.7
      }
    });

    return response.text || "لا تتوفر رؤى حالياً.";
  } catch (error) {
    console.error("AI Insights Error:", error);
    return "فشل توليد التقرير الذكي.";
  }
};
