import axios from "axios";

export const getReadableNetworkError = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return "حدث خطأ غير متوقع. حاول مرة أخرى.";
  }

  if (error.code === "ECONNABORTED") {
    return "انتهت مهلة الطلب. تحقق من الشبكة ثم أعد المحاولة.";
  }

  if (!error.response) {
    return "لا يمكن الوصول إلى الخادم. تأكد من تشغيل الباك اند وضبط EXPO_PUBLIC_API_BASE_URL على IP جهازك.";
  }

  const apiMessage = (error.response.data as { message?: string } | undefined)?.message;
  if (apiMessage) {
    if (apiMessage === "Unauthorized") return "جلسة الدخول انتهت، سجل الدخول مرة أخرى.";
    if (apiMessage === "Validation failed") return "البيانات المدخلة غير مكتملة أو غير صحيحة.";
    if (apiMessage === "Truck not found") return "لم يتم العثور على الطلب.";
    if (apiMessage === "Internal server error") return "حدث خطأ داخلي في الخادم، حاول لاحقًا.";
    if (apiMessage === "Only truck owners can register trucks") return "هذه العملية متاحة فقط لحساب صاحب الفود ترك.";
    if (apiMessage === "Only admins can review truck approvals") return "هذه العملية متاحة فقط لحساب الأدمن.";
    return apiMessage;
  }

  return `فشل الطلب برمز الحالة ${error.response.status}.`;
};
