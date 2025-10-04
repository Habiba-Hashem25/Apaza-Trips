// src/App.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Ship,
  User,
  MapPin,
  Hash,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import "./App.css";

// Sheet.best endpoint (يمكن تغييره عبر env VITE_SHEET_URL)
const SHEET_API =
  import.meta.env.VITE_SHEET_URL ||
  "https://sheet.best/api/sheets/6d2f33b1-3c2a-4bc4-9c94-3cdc8ed38df3";

function App() {
  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

  const restaurantsList = [
    "دار نورة",
    "وردة",
    "سكند كب",
    "موخيتو",
    "كيمس",
    "انكل زاك",
    "نيليرا/ عشق الخليج",
    "اخري",
  ];

  const initialForm = {
    tripDate: getTodayDate(),
    tripTime: getCurrentTime(),
    tripDuration: "",
    durationHours: "",
    durationMinutes: "",
    numAttendees: "",
    tripCost: "",
    extraCost: "", // تكلفة الخدمات الإضافية
    extraService: "", // وصف الخدمة الإضافية
    tripType: "",
    restaurantName: [],
    vesselName: "أباظة",
    tripManager: "شركة أباظة",
    additionalNotes: "",
    isMall: false,
  };

  // trips من localStorage هو المصدر الرئيسي
  const [formData, setFormData] = useState(initialForm);
  const [trips, setTrips] = useState(() => {
    const stored = localStorage.getItem("naylos_trips");
    return stored ? JSON.parse(stored) : [];
  });

  // لو localStorage فاضي: حاول نجيب من الشيت ونحوله لشكل محلي (مرة واحدة فقط)
  useEffect(() => {
    const stored = localStorage.getItem("naylos_trips");
    if (!stored) {
      (async () => {
        try {
          const res = await axios.get(SHEET_API);
          const rows = res.data || [];
          if (Array.isArray(rows) && rows.length > 0) {
            // نطابق السجلات القادمة لشكل الكود المحلي
            const mapped = rows.map((row, idx) => ({
              id: row._id || Date.now() + idx,
              // استخدم أسماء الحقول إن وُجدت، وإلا fallback لحقولنا
              tripDate: row.tripDate || row.tripDate || "",
              tripTime: row.tripTime || row.tripTime || "",
              tripDuration: row.tripDuration || row.tripDuration || "",
              durationHours: "", // optional
              durationMinutes: "",
              numAttendees: row.participants || row.numAttendees || "",
              tripCost: Number(row.tripCost || row.tripCost) || 0,
              extraCost: Number(row.extraCost || row.extraCost) || 0,
              extraService: row.extraService || row.extraService || "",
              totalCost:
                Number(row.totalCost) ||
                Number(row.tripCost || 0) + Number(row.extraCost || 0) ||
                0,
              tripType: row.tripType || row.tripType || "",
              restaurantName:
                row.restaurant && typeof row.restaurant === "string"
                  ? row.restaurant.split(" ، ").map((s) => s.trim())
                  : row.restaurant || row.restaurantName || [],
              vesselName: row.boat || row.vesselName || "أباظة",
              tripManager: row.manager || row.tripManager || "شركة أباظة",
              additionalNotes: row.notes || row.additionalNotes || "",
              isMall:
                row.mall === "نعم" || row.isMall === true || row.mall === true
                  ? true
                  : false,
              tripNumber: row.tripNumber || idx + 1,
              createdAt: row.createdAt || new Date().toLocaleString("ar-EG"),
            }));
            setTrips(mapped);
            localStorage.setItem("naylos_trips", JSON.stringify(mapped));
            toast.success("تم جلب الرحلات من Google Sheet (محليًا).");
          }
        } catch (err) {
          console.warn("خطأ في جلب البيانات من الشيت:", err);
        }
      })();
    }
  }, []);

  // نحفظ كل تغيير للـ trips في localStorage
  useEffect(() => {
    localStorage.setItem("naylos_trips", JSON.stringify(trips));
  }, [trips]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTripTypeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      tripType: value,
      restaurantName:
        value === "food and drink" || value === "drink" ? prev.restaurantName : [],
    }));
  };

  const toggleRestaurant = (rest) => {
    setFormData((prev) => ({
      ...prev,
      restaurantName: prev.restaurantName.includes(rest)
        ? prev.restaurantName.filter((r) => r !== rest)
        : [...prev.restaurantName, rest],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // التحقق من الحقول المطلوبة (نفس منطق الكود المحلي)
    const requiredFields = [
      "tripDate",
      "tripTime",
      "tripDuration",
      "numAttendees",
      "tripType",
      "vesselName",
      "tripManager",
    ];
    const missing = requiredFields.filter((f) => {
      const val = formData[f];
      return val === undefined || val === null || String(val).trim() === "";
    });
    if (missing.length > 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة", {
        position: "top-center",
        duration: 6000,
      });
      return;
    }

    if (!formData.isMall) {
      if (!formData.tripCost || Number(formData.tripCost) <= 0) {
        toast.error("⚠️ تكلفة الرحلة يجب أن تكون أكبر من صفر", {
          position: "top-center",
          duration: 6000,
        });
        return;
      }
    }

    if (
      (formData.tripType === "food and drink" || formData.tripType === "drink") &&
      (!formData.restaurantName || formData.restaurantName.length === 0)
    ) {
      toast.warning("يرجى اختيار مطعم واحد على الأقل", {
        position: "top-center",
        duration: 6000,
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.tripDate);
    if (selectedDate < today) {
      toast.error("لا يمكن تسجيل رحلة بتاريخ قديم", {
        position: "top-center",
        duration: 6000,
      });
      return;
    }

    // حساب رقم الرحلة بالنسبة لليوم - نستخدم trips المحلي (localStorage) لضمان الترقيم الصحيح
    const tripsSameDay = trips.filter((t) => t.tripDate === formData.tripDate);
    const tripNumber = tripsSameDay.length + 1;

    const tripCostFinal = formData.isMall ? 0 : Number(formData.tripCost) || 0;
    const extraCostFinal = Number(formData.extraCost) || 0;
    const totalCost = tripCostFinal + extraCostFinal;

    const newTrip = {
      id: Date.now(),
      ...formData,
      tripCost: tripCostFinal,
      extraCost: extraCostFinal,
      totalCost,
      tripNumber,
      createdAt: new Date().toLocaleString("ar-EG"),
    };

    // 1) سجل محليًا (النسخة الأساسية)
    setTrips((prev) => [...prev, newTrip]);

    // 2) إعادة تعيين الفورم (زي ما في كود local)
    setFormData({
      ...initialForm,
      tripDate: getTodayDate(),
      tripTime: getCurrentTime(),
    });

    toast.success("تم تسجيل الرحلة محليًا!", {
      position: "top-center",
      duration: 6000,
      icon: "♥",
    });

    // 3) جهز الـ payload المُرسل للشيت باستخدام أسماء الأعمدة الموجودة بالشيت
    const payload = {
      tripNumber: newTrip.tripNumber,
      tripDate: newTrip.tripDate,
      tripTime: newTrip.tripTime,
      tripDuration:
        newTrip.tripDuration ||
        `${newTrip.durationHours || "00"}:${newTrip.durationMinutes || "00"}`,
      participants: Number(newTrip.numAttendees || newTrip.participants || 0),
      tripCost: Number(newTrip.tripCost || 0),
      extraCost: Number(newTrip.extraCost || 0),
      extraService: newTrip.extraService || "",
      totalCost: Number(newTrip.totalCost || 0),
      tripType: newTrip.tripType || "",
      restaurant: Array.isArray(newTrip.restaurantName)
        ? newTrip.restaurantName.join(" ، ")
        : newTrip.restaurantName || "",
      boat: newTrip.vesselName || newTrip.boat || "أباظة",
      manager: newTrip.tripManager || newTrip.manager || "شركة أباظة",
      mall: newTrip.isMall ? "نعم" : "لا",
      notes: newTrip.additionalNotes || newTrip.notes || "",
      createdAt: newTrip.createdAt,
    };

    // 4) إرسال للشيت (لا يؤثر على التسجيل المحلي لو فشل)
    try {
      await axios.post(SHEET_API, payload, {
        headers: { "Content-Type": "application/json" },
      });
      toast.success("تم إرسال الرحلة بنجاح إلى Google Sheet ✅", {
        position: "top-center",
        duration: 6000,
      });
    } catch (err) {
      console.error("Error sending to sheet:", err);
      toast.error("حصل خطأ أثناء الإرسال إلى Google Sheet ❌", {
        position: "top-center",
        duration: 6000,
      });
      // ملاحظة: يمكنك لاحقًا عمل Retry من البيانات المحفوظة محليًا
    }
  };

  const exportToExcel = () => {
    if (trips.length === 0) {
      toast.error("لا توجد رحلات مسجلة للتصدير", {
        position: "top-center",
        duration: 6000,
      });
      return;
    }

    const worksheetData = trips.map((trip, idx) => ({
      "رقم الرحلة": trip.tripNumber || idx + 1,
      "تاريخ الرحلة": trip.tripDate,
      "وقت الرحلة": trip.tripTime,
      "مدة الرحلة": trip.tripDuration,
      "عدد المتواجدين": trip.numAttendees || trip.participants || "",
      "تكلفة الرحلة": trip.tripCost,
      "تكلفة الخدمات الإضافية": trip.extraCost,
      "نوع الخدمة الإضافية": trip.extraService || "-",
      "إجمالي التكلفة": trip.totalCost,
      "نوع الرحلة":
        trip.tripType === "nile"
          ? "رحلة نيلية"
          : trip.tripType === "drink"
          ? "مشروبات"
          : "طعام ومشروبات",
      "اسم المطعم":
        Array.isArray(trip.restaurantName) && trip.restaurantName.length > 0
          ? trip.restaurantName.join(" ، ")
          : trip.restaurantName || trip.restaurant || "-",
      "اسم المركب/الزودياك": trip.vesselName || trip.boat,
      "المسؤول عن الرحلة": trip.tripManager || trip.manager,
      "تابعة للمول": trip.isMall ? "نعم" : "لا",
      "ملاحظات إضافية": trip.additionalNotes || trip.notes || "-",
      "تاريخ التسجيل": trip.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "رحلات نايلوس");
    XLSX.writeFile(wb, `naylos_trips_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("تم تحضير ملف Excel ✅", { position: "top-center", duration: 4000 });
  };

  const formatDuration = (duration) => {
    if (!duration) return "-";
    const [h, m] = duration.split(":").map(Number);
    let result = [];
    if (h > 0) result.push(`${h} ${h === 1 ? "ساعة" : "ساعات"}`);
    if (m > 0) result.push(`${m} دقيقة`);
    return result.join(" و ") || "0 دقيقة";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-blue-900 flex items-center justify-center gap-3">
            <Ship className="h-10 w-10" /> استمارة تسجيل رحلات نيلية
          </h1>
          <p className="text-blue-700 text-lg">مشروع نايلوس</p>
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
            <MapPin className="h-4 w-4" /> نادي النيل لضباط الشرطة - شارع النيل - حي الدقي - الجيزة
          </div>
        </div>

        {/* Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-blue-900 flex items-center gap-2">
              <FileText className="h-6 w-6" /> تسجيل رحلة جديدة
            </CardTitle>
            <CardDescription>يرجى ملء جميع البيانات المطلوبة لتسجيل الرحلة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trip Date */}
                <div className="space-y-2">
                  <Label htmlFor="tripDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> تاريخ الرحلة *
                  </Label>
                  <Input
                    id="tripDate"
                    name="tripDate"
                    type="date"
                    value={formData.tripDate}
                    min={getTodayDate()}
                    onChange={handleInputChange}
                    className="text-right"
                  />
                </div>

                {/* Trip Number */}
                <div className="space-y-2">
                  <Label htmlFor="tripNumber" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" /> رقم الرحلة
                  </Label>
                  <Input
                    id="tripNumber"
                    type="text"
                    value={
                      formData.tripDate
                        ? trips.filter((t) => t.tripDate === formData.tripDate).length + 1
                        : ""
                    }
                    readOnly
                    className="text-right bg-gray-100"
                  />
                </div>

                {/* Trip Time */}
                <div className="space-y-2">
                  <Label htmlFor="tripTime" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> وقت الرحلة *
                  </Label>
                  <Input
                    id="tripTime"
                    name="tripTime"
                    type="time"
                    value={formData.tripTime}
                    onChange={handleInputChange}
                    className="text-right"
                  />
                </div>

                {/* Trip Duration */}
                <div className="space-y-2">
                  <Label htmlFor="tripDuration" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> مدة الرحلة *
                  </Label>
                  <div className="flex gap-3">
                    <select
                      className="border rounded-md p-2 text-right w-1/2"
                      value={formData.durationHours || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          durationHours: e.target.value,
                          tripDuration: `${e.target.value.padStart(2, "0")}:${(
                            prev.durationMinutes || "00"
                          ).padStart(2, "0")}`,
                        }))
                      }
                    >
                      <option value="">ساعات</option>
                      {[...Array(25).keys()].map((h) => (
                        <option key={h} value={String(h).padStart(2, "0")}>
                          {h} ساعة
                        </option>
                      ))}
                    </select>
                    <select
                      className="border rounded-md p-2 text-right w-1/2"
                      value={formData.durationMinutes || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          durationMinutes: e.target.value,
                          tripDuration: `${(prev.durationHours || "00").padStart(2, "0")}:${e.target.value.padStart(
                            2,
                            "0"
                          )}`,
                        }))
                      }
                    >
                      <option value="">دقايق</option>
                      {[...Array(60).keys()].map((m) => (
                        <option key={m + 1} value={String(m + 1).padStart(2, "0")}>
                          {m + 1} دقيقة
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Number of Attendees */}
                <div className="space-y-2">
                  <Label htmlFor="numAttendees" className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> عدد المتواجدين *
                  </Label>
                  <Input
                    id="numAttendees"
                    name="numAttendees"
                    type="number"
                    min="1"
                    value={formData.numAttendees}
                    onChange={handleInputChange}
                    className="text-right"
                  />
                </div>

                {/* Trip Cost */}
                <div className="space-y-2">
                  <Label htmlFor="tripCost" className="flex items-center gap-2">
                    💰 تكلفة الرحلة {formData.isMall ? "(غير مطلوبة)" : "*"}
                  </Label>
                  <Input
                    id="tripCost"
                    name="tripCost"
                    type="number"
                    min="1"
                    value={formData.tripCost}
                    onChange={handleInputChange}
                    disabled={formData.isMall}
                    className="text-right"
                  />
                </div>

                {/* Extra Services Cost */}
                <div className="space-y-2">
                  <Label htmlFor="extraCost" className="flex items-center gap-2">
                    💵 تكلفة الخدمات الإضافية
                  </Label>
                  <Input
                    id="extraCost"
                    name="extraCost"
                    type="number"
                    min="0"
                    value={formData.extraCost}
                    onChange={handleInputChange}
                    className="text-right"
                  />
                </div>

                {/* Extra Service Description */}
                <div className="space-y-2">
                  <Label htmlFor="extraService">🛠️ نوع الخدمة الإضافية</Label>
                  <Textarea
                    id="extraService"
                    name="extraService"
                    value={formData.extraService}
                    onChange={handleInputChange}
                    className="text-right"
                    rows={2}
                  />
                </div>

                {/* Vessel Name */}
                <div className="space-y-2">
                  <Label htmlFor="vesselName" className="flex items-center gap-2">
                    <Ship className="h-4 w-4" /> اسم المركب *
                  </Label>
                  <Input
                    id="vesselName"
                    name="vesselName"
                    type="text"
                    value={formData.vesselName}
                    readOnly
                    className="text-right bg-gray-100"
                  />
                </div>

                {/* Trip Manager */}
                <div className="space-y-2">
                  <Label htmlFor="tripManager" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> المسؤول *
                  </Label>
                  <Input
                    id="tripManager"
                    name="tripManager"
                    type="text"
                    value={formData.tripManager}
                    readOnly
                    className="text-right bg-gray-100"
                  />
                </div>
              </div>

              {/* Trip Type */}
              <div className="space-y-3">
                <Label className="text-base font-medium ">نوع الرحلة *</Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroup value={formData.tripType} onValueChange={handleTripTypeChange} className="flex">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="nile">رحلة نيلية فقط</Label>
                        <RadioGroupItem value="nile" id="nile" />
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroup value={formData.tripType} onValueChange={handleTripTypeChange} className="flex">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="food and drink">رحلة طعام ومشروبات</Label>
                        <RadioGroupItem value="food and drink" id="food and drink" />
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroup value={formData.tripType} onValueChange={handleTripTypeChange} className="flex">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="drink">رحلة مشروبات</Label>
                        <RadioGroupItem value="drink" id="drink" />
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* Restaurant Selection */}
              {(formData.tripType === "food and drink" || formData.tripType === "drink") && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base font-medium">
                    <MapPin className="h-4 w-4" /> اختر المطعم *
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {restaurantsList.map((rest) => (
                      <div key={rest} className="flex items-center gap-2">
                        <Checkbox
                          id={rest}
                          checked={formData.restaurantName.includes(rest)}
                          onCheckedChange={() => toggleRestaurant(rest)}
                        />
                        <Label htmlFor={rest}>{rest}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="additionalNotes">✏️ ملاحظات إضافية</Label>
                <Textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  className="text-right"
                  rows={3}
                />
              </div>

              {/* Mall Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isMall"
                  name="isMall"
                  checked={formData.isMall}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      isMall: checked,
                      tripCost: checked ? "" : prev.tripCost,
                    }))
                  }
                />
                <Label htmlFor="isMall">رحلة مجانية تابعة للمول</Label>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full">
                ✅ تسجيل الرحلة
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Trips List */}
        {trips.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-blue-900">📋 الرحلات المسجلة</CardTitle>
                <CardDescription>عدد الرحلات: {trips.length}</CardDescription>
              </div>
              <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
                ⬇️ تصدير Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trips.map((trip) => (
                  <Card key={trip.id} className="border shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-bold text-lg text-blue-800 flex items-center gap-2">
                        <Hash className="h-4 w-4" /> الرحلة رقم {trip.tripNumber}
                      </h3>
                      <p>📅 التاريخ: {trip.tripDate}</p>
                      <p>⏰ الوقت: {trip.tripTime}</p>
                      <p>⌛ المدة: {formatDuration(trip.tripDuration)}</p>
                      <p>👥 عدد الحضور: {trip.numAttendees}</p>
                      <p>🚤 المركب: {trip.vesselName}</p>
                      <p>👤 المسؤول: {trip.tripManager}</p>
                      <p>
                        🎯 النوع:{" "}
                        {trip.tripType === "nile"
                          ? "رحلة نيلية"
                          : trip.tripType === "drink"
                          ? "مشروبات"
                          : "طعام ومشروبات"}
                      </p>
                      {trip.restaurantName?.length > 0 && (
                        <p>🍽️ المطعم: {trip.restaurantName.join(" ، ")}</p>
                      )}
                      <p>💰 تكلفة الرحلة: {trip.tripCost} جنيه</p>
                      <p>💵 تكلفة الخدمات الإضافية: {trip.extraCost} جنيه</p>
                      {trip.extraService && <p>🛠️ الخدمة الإضافية: {trip.extraService}</p>}
                      <p className="font-bold text-green-700">
                        💯 التكلفة الكاملة: {trip.totalCost} جنيه
                      </p>
                      <p>🛒 تابعة للمول: {trip.isMall ? "نعم" : "لا"}</p>
                      {trip.additionalNotes && <p>✏️ ملاحظات: {trip.additionalNotes}</p>}
                      <p className="text-xs text-gray-500">📌 تم التسجيل: {trip.createdAt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;
