"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Coffee,
  Clock,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Settings,
  Power,
  Flame,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  LogOut,
  UserCheck,
  Shield,
  Key,
  Users,
  Check,
  X,
  Plus,
  Lock,
  Edit,
  Tag,
  Building,
  Sparkles,
  Trash2,
  Ban,
  Save,
  Database,
  Mail,
  Send,
  Eye,
  EyeOff,
  ExternalLink,
  Sliders,
  Layers,
} from "lucide-react";
import { formatVND } from "@/lib/utils";
import {
  Product,
  ProductVariant,
  ProductOption,
  ProductOptionValue,
  Category,
  BusinessSettings,
  PermissionDefinition,
  RolePermissionConfig,
  StaffAccount,
} from "@/types";
import OperatingAndVietQrSettings from "@/components/admin/OperatingAndVietQrSettings";
import AdminManagementHeader from "@/components/admin/AdminManagementHeader";
import DatabaseManager from "@/components/admin/DatabaseManager";
import PromotionManager from "@/components/admin/PromotionManager";
import OrderHistoryManager from "@/components/admin/OrderHistoryManager";
import DashboardOverviewManager from "@/components/admin/DashboardOverviewManager";

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "MENU" | "RBAC" | "SETTINGS" | "DATABASE" | "PROMOTIONS" | "ORDERS">("DASHBOARD");

  // Core Data
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  // Product Edit & Create Modal State
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isCreateProductMode, setIsCreateProductMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<{
    name: string;
    description: string;
    imageUrl: string;
    categoryId: number;
    basePrice: number;
    salePrice: number | null;
    isAvailable: boolean;
    isFeatured: boolean;
    prepTimeMinutes: number;
    tags: string[];
    variants: Array<{ id: number; sizeName: string; extraPrice: number; isDefault: boolean }>;
  }>({
    name: "",
    description: "",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
    categoryId: 1,
    basePrice: 30000,
    salePrice: null,
    isAvailable: true,
    isFeatured: false,
    prepTimeMinutes: 5,
    tags: ["NEW"],
    variants: [
      { id: 1, sizeName: "Ly", extraPrice: 0, isDefault: true },
      { id: 2, sizeName: "100ml", extraPrice: 8000, isDefault: false },
      { id: 3, sizeName: "250ml", extraPrice: 35000, isDefault: false },
    ],
  });

  // Menu Sub-Tabs & Customization Options State
  const [menuSubTab, setMenuSubTab] = useState<"PRODUCTS" | "TOPPINGS" | "OPTIONS">("PRODUCTS");
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [optionModalTarget, setOptionModalTarget] = useState<{
    mode: "CREATE" | "EDIT";
    optionId: number;
    optionTitle: string;
    valueId?: number;
    name: string;
    extraPrice: number;
    isDefault: boolean;
  }>({
    mode: "CREATE",
    optionId: 3,
    optionTitle: "Topping",
    name: "",
    extraPrice: 0,
    isDefault: false,
  });

  // RBAC Data
  const [permissionDefs, setPermissionDefs] = useState<PermissionDefinition[]>([]);
  const [roleConfigs, setRoleConfigs] = useState<RolePermissionConfig[]>([]);
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [isUpdatingRbac, setIsUpdatingRbac] = useState(false);

  // Staff Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffFullName, setNewStaffFullName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"BARISTA" | "CASHIER" | "STORE_MANAGER" | "SUPER_ADMIN">("BARISTA");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPin, setNewStaffPin] = useState("1234");
  const [newStaffPassword, setNewStaffPassword] = useState("");

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [editStaffFullName, setEditStaffFullName] = useState("");
  const [editStaffRole, setEditStaffRole] = useState<"BARISTA" | "CASHIER" | "STORE_MANAGER" | "SUPER_ADMIN">("BARISTA");
  const [editStaffPhone, setEditStaffPhone] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffPin, setEditStaffPin] = useState("");
  const [editStaffPassword, setEditStaffPassword] = useState("");

  // Email test & SMTP config states (for .env)
  const [testEmailTarget, setTestEmailTarget] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const [smtpUserConfig, setSmtpUserConfig] = useState("");
  const [smtpPassConfig, setSmtpPassConfig] = useState("");
  const [smtpFromConfig, setSmtpFromConfig] = useState("Cà Xòi Coffee & Tea ☕");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [isSavingEmailConfig, setIsSavingEmailConfig] = useState(false);
  const [emailConfigMsg, setEmailConfigMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [isEmailConfigured, setIsEmailConfigured] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, menuRes, authRes, rolesRes, emailConfigRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/menu"),
        fetch("/api/auth/me"),
        fetch("/api/admin/roles"),
        fetch("/api/admin/email-config"),
      ]);
      const statsData = await statsRes.json();
      const menuData = await menuRes.json();
      const authData = await authRes.json();
      const rolesData = await rolesRes.json();
      const emailConfigData = await emailConfigRes.json().catch(() => ({}));

      if (!authData.success) {
        router.push("/admin/login?redirect=/admin");
        return;
      }
      setCurrentUser(authData.user);
      if (authData.user.role !== "SUPER_ADMIN" && authData.user.role !== "STORE_MANAGER") {
        router.push("/kds");
        return;
      }
      if (statsData.success) {
        setStats(statsData.data);
        setSettings(statsData.data.storeSettings);
      }
      if (menuData.success) {
        setProducts(menuData.data.products);
        if (menuData.data.options) {
          setOptions(menuData.data.options);
        }
        if (menuData.data.categories) {
          setCategories(menuData.data.categories);
        }
      }
      if (rolesData.success) {
        setPermissionDefs(rolesData.data.definitions);
        setRoleConfigs(rolesData.data.roles);
        setStaffList(rolesData.data.staff);
      }
      if (emailConfigData.success && emailConfigData.data) {
        setSmtpUserConfig(emailConfigData.data.smtpUser || "");
        setSmtpPassConfig(emailConfigData.data.smtpPass || "");
        setSmtpFromConfig(emailConfigData.data.smtpFrom || "Cà Xòi Coffee & Tea ☕");
        setIsEmailConfigured(emailConfigData.data.isConfigured || false);
        if (emailConfigData.data.smtpUser) {
          setTestEmailTarget(emailConfigData.data.smtpUser);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab")?.toUpperCase();
      if (tab === "DATABASE" || tab === "BACKUP" || tab === "CSDL") {
        setActiveTab("DATABASE");
      } else if (tab && ["DASHBOARD", "MENU", "RBAC", "SETTINGS", "PROMOTIONS", "ORDERS"].includes(tab)) {
        setActiveTab(tab as any);
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  // Helper thông báo đồng bộ realtime sang trang khách hàng
  const notifyMenuUpdated = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("caxoi_menu_updated_at", Date.now().toString());
    }
  };

  // Quick 1-click availability toggle
  const handleToggleProduct = async (productId: string) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleProductId: productId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message);
        notifyMenuUpdated();
        fetchData();
        setTimeout(() => setActionMsg(""), 3500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Edit Modal for a specific product
  const handleOpenEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setIsCreateProductMode(false);

    // Đảm bảo luôn có kích cỡ chuẩn "Ly" và các size chai phụ thu
    let currentVariants = product.variants ? [...product.variants] : [];
    if (!currentVariants.some((v) => v.sizeName.trim().toLowerCase() === "ly")) {
      currentVariants.unshift({
        id: 1,
        productId: product.id,
        sizeName: "Ly",
        extraPrice: 0,
        isDefault: true,
      });
    }

    setProductForm({
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl || "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
      categoryId: product.categoryId || 1,
      basePrice: product.basePrice,
      salePrice: product.salePrice ?? null,
      isAvailable: product.isAvailable,
      isFeatured: product.isFeatured || false,
      prepTimeMinutes: product.prepTimeMinutes || 5,
      tags: [...product.tags],
      variants: currentVariants.map((v, i) => ({
        id: v.id || i + 1,
        sizeName: v.sizeName,
        extraPrice: v.extraPrice,
        isDefault: v.isDefault,
      })),
    });
    setIsEditProductOpen(true);
  };

  // Open Create Modal for new product
  const handleOpenCreateProduct = () => {
    setEditingProductId(null);
    setIsCreateProductMode(true);
    setProductForm({
      name: "",
      description: "",
      imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
      categoryId: 1,
      basePrice: 20000,
      salePrice: null,
      isAvailable: true,
      isFeatured: false,
      prepTimeMinutes: 4,
      tags: ["NEW"],
      variants: [
        { id: 1, sizeName: "Ly", extraPrice: 0, isDefault: true },
        { id: 2, sizeName: "100ml", extraPrice: 8000, isDefault: false },
        { id: 3, sizeName: "250ml", extraPrice: 35000, isDefault: false },
      ],
    });
    setIsEditProductOpen(true);
  };

  // Reset menu back to standard Cà Xòi 5-item menu
  const handleResetMenu = async () => {
    if (!confirm("Khôi phục toàn bộ Thực đơn 5 món & 3 quy cách chuẩn Quán Cà Xòi (Ly, 100ml, 250ml)?")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET_CA_XOI_MENU" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message);
        notifyMenuUpdated();
        fetchData();
        setTimeout(() => setActionMsg(""), 3500);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi khôi phục menu Cà Xòi.");
    }
  };

  // Variant management in Modal
  const handleAddVariant = () => {
    const nextId = productForm.variants.length + 1;
    setProductForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { id: nextId, sizeName: `Size mới (${nextId})`, extraPrice: 5000, isDefault: false },
      ],
    }));
  };

  const handleUpdateVariant = (index: number, field: string, value: any) => {
    setProductForm((prev) => {
      const updated = [...prev.variants];
      if (field === "isDefault" && value === true) {
        // Set all others to false
        updated.forEach((v, i) => {
          v.isDefault = i === index;
        });
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, variants: updated };
    });
  };

  const handleRemoveVariant = (index: number) => {
    if (productForm.variants.length <= 1) {
      alert("Món phải có ít nhất 1 kích cỡ.");
      return;
    }
    setProductForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  // Save product updates (name, price, sizes, status)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      alert("Vui lòng nhập tên món.");
      return;
    }
    if (productForm.basePrice <= 0) {
      alert("Giá bán cơ bản phải lớn hơn 0.");
      return;
    }

    try {
      if (isCreateProductMode) {
        const res = await fetch("/api/admin/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productForm),
        });
        const data = await res.json();
        if (data.success) {
          setActionMsg(data.message);
          notifyMenuUpdated();
          setIsEditProductOpen(false);
          fetchData();
          setTimeout(() => setActionMsg(""), 3500);
        } else {
          alert(data.message);
        }
      } else if (editingProductId) {
        const res = await fetch(`/api/admin/menu/${editingProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productForm),
        });
        const data = await res.json();
        if (data.success) {
          setActionMsg(data.message);
          notifyMenuUpdated();
          setIsEditProductOpen(false);
          fetchData();
          setTimeout(() => setActionMsg(""), 3500);
        } else {
          alert(data.message);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu thông tin món.");
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    if (!editingProductId) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa món "${productForm.name}" khỏi thực đơn quán?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/menu/${editingProductId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message);
        notifyMenuUpdated();
        setIsEditProductOpen(false);
        fetchData();
        setTimeout(() => setActionMsg(""), 3500);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa món khỏi thực đơn.");
    }
  };

  // ==========================================
  // OPTIONS & TOPPING HANDLERS
  // ==========================================
  const handleOpenAddOptionValue = (optionId: number, optionTitle: string) => {
    setOptionModalTarget({
      mode: "CREATE",
      optionId,
      optionTitle,
      name: "",
      extraPrice: 0,
      isDefault: false,
    });
    setIsOptionModalOpen(true);
  };

  const handleOpenEditOptionValue = (optionId: number, optionTitle: string, val: ProductOptionValue) => {
    setOptionModalTarget({
      mode: "EDIT",
      optionId,
      optionTitle,
      valueId: val.id,
      name: val.name,
      extraPrice: val.extraPrice,
      isDefault: val.isDefault,
    });
    setIsOptionModalOpen(true);
  };

  const handleSaveOptionValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optionModalTarget.name.trim()) {
      alert("Vui lòng nhập tên tùy chọn.");
      return;
    }

    try {
      if (optionModalTarget.mode === "CREATE") {
        const res = await fetch("/api/admin/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            optionId: optionModalTarget.optionId,
            name: optionModalTarget.name.trim(),
            extraPrice: Number(optionModalTarget.extraPrice) || 0,
            isDefault: Boolean(optionModalTarget.isDefault),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setActionMsg(data.message);
          setIsOptionModalOpen(false);
          notifyMenuUpdated();
          if (data.data) setOptions(data.data);
          else fetchData();
          setTimeout(() => setActionMsg(""), 3500);
        } else {
          alert(data.message);
        }
      } else if (optionModalTarget.valueId) {
        const res = await fetch("/api/admin/options", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: optionModalTarget.valueId,
            name: optionModalTarget.name.trim(),
            extraPrice: Number(optionModalTarget.extraPrice) || 0,
            isDefault: Boolean(optionModalTarget.isDefault),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setActionMsg(data.message);
          setIsOptionModalOpen(false);
          notifyMenuUpdated();
          if (data.data) setOptions(data.data);
          else fetchData();
          setTimeout(() => setActionMsg(""), 3500);
        } else {
          alert(data.message);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu tùy chọn.");
    }
  };

  const handleSetDefaultOptionValue = async (valId: number) => {
    try {
      const res = await fetch("/api/admin/options", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: valId,
          isDefault: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg("Đã cập nhật lựa chọn mặc định!");
        notifyMenuUpdated();
        if (data.data) setOptions(data.data);
        else fetchData();
        setTimeout(() => setActionMsg(""), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOptionValue = async (valId: number, valName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${valName}" khỏi danh sách?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/options?id=${valId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message);
        notifyMenuUpdated();
        if (data.data) setOptions(data.data);
        else fetchData();
        setTimeout(() => setActionMsg(""), 3500);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa tùy chọn.");
    }
  };

  const handleUpdateStoreStatus = async (newStatus: "OPEN" | "CLOSED" | "PAUSED") => {
    try {
      const msg =
        newStatus === "OPEN"
          ? "Quán đang mở cửa phục vụ bình thường - Giao trong 15-25 phút"
          : newStatus === "PAUSED"
          ? "Quán đang quá tải đơn giờ cao điểm - Tạm dừng nhận đơn trực tuyến 15 phút"
          : "Quán đã đóng cửa - Hẹn gặp lại quý khách vào ngày mai";

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeStatus: newStatus,
          storeStatusMessage: msg,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`Đã cập nhật trạng thái quán: ${newStatus}`);
        fetchData();
        setTimeout(() => setActionMsg(""), 3500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle permission in RBAC Matrix
  const handleTogglePermission = async (roleId: string, permissionCode: string) => {
    if (roleId === "SUPER_ADMIN") {
      setActionMsg("Không thể thu hồi quyền hạn của Chủ Quán (Super Admin)!");
      setTimeout(() => setActionMsg(""), 3000);
      return;
    }

    setIsUpdatingRbac(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_ROLE_PERMISSION",
          roleId,
          permissionCode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message);
        setRoleConfigs((prev) =>
          prev.map((role) => {
            if (role.roleId === roleId) {
              const has = role.permissions.includes(permissionCode);
              return {
                ...role,
                permissions: has
                  ? role.permissions.filter((p) => p !== permissionCode)
                  : [...role.permissions, permissionCode],
              };
            }
            return role;
          })
        );
        setTimeout(() => setActionMsg(""), 3500);
      } else {
        setActionMsg(data.message || "Lỗi cập nhật quyền.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingRbac(false);
    }
  };

  // Update staff role or PIN
  const handleUpdateStaff = async (staffId: string, updates: Partial<StaffAccount>) => {
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_STAFF",
          staffId,
          ...updates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message);
        notifyMenuUpdated();
        fetchData();
        setTimeout(() => setActionMsg(""), 3500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open edit staff modal
  const handleOpenEditStaff = (staff: StaffAccount) => {
    setEditingStaff(staff);
    setEditStaffFullName(staff.fullName);
    setEditStaffRole(staff.role);
    setEditStaffPhone(staff.phone || "");
    setEditStaffEmail(staff.email || "");
    setEditStaffPin(staff.pin || "");
    setEditStaffPassword("");
  };

  // Save staff edits
  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_STAFF",
          staffId: editingStaff.id,
          fullName: editStaffFullName,
          role: editStaffRole,
          phone: editStaffPhone,
          email: editStaffEmail.trim() || undefined,
          pin: editStaffPin,
          password: editStaffPassword || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message);
        setEditingStaff(null);
        fetchData();
        setTimeout(() => setActionMsg(""), 3500);
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi cập nhật nhân viên.");
    }
  };

  // Delete staff
  const handleDeleteStaff = async (staff: StaffAccount) => {
    if (staff.id === currentUser?.id) {
      alert("Bạn không thể tự xóa tài khoản của chính mình khi đang đăng nhập!");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${staff.fullName}" (@${staff.username})?`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_STAFF",
          staffId: staff.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message);
        fetchData();
        setTimeout(() => setActionMsg(""), 3500);
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi xóa nhân viên.");
    }
  };

  // Create new staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_STAFF",
          username: newStaffUsername,
          fullName: newStaffFullName,
          role: newStaffRole,
          phone: newStaffPhone,
          email: newStaffEmail.trim() || undefined,
          pin: newStaffPin,
          password: newStaffPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message);
        setIsAddStaffOpen(false);
        setNewStaffUsername("");
        setNewStaffFullName("");
        setNewStaffPhone("");
        setNewStaffEmail("");
        setNewStaffPin("1234");
        setNewStaffPassword("");
        fetchData();
        setTimeout(() => setActionMsg(""), 3500);
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Test sending notification email
  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: testEmailTarget.trim() || undefined }),
      });
      const data = await res.json();
      setTestEmailResult({ success: data.success, message: data.message });
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message || "Lỗi kiểm tra email." });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Save SMTP credentials directly to .env
  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEmailConfig(true);
    setEmailConfigMsg(null);
    try {
      const res = await fetch("/api/admin/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpUser: smtpUserConfig,
          smtpPass: smtpPassConfig,
          smtpFrom: smtpFromConfig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailConfigMsg({ success: true, message: data.message });
        setIsEmailConfigured(true);
        if (!testEmailTarget) {
          setTestEmailTarget(smtpUserConfig.trim());
        }
        setActionMsg("Đã cập nhật cấu hình Gmail vào file .env thành công!");
        setTimeout(() => setActionMsg(""), 3500);
      } else {
        setEmailConfigMsg({ success: false, message: data.message });
      }
    } catch (err: any) {
      setEmailConfigMsg({ success: false, message: err.message || "Lỗi lưu cấu hình email." });
    } finally {
      setIsSavingEmailConfig(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-caramel animate-spin mx-auto" />
        <p className="text-xs font-semibold text-coffee-600">Đang tải dữ liệu quản trị...</p>
      </div>
    );
  }

  // Group permission definitions by category
  const categoriesMap: Record<string, { label: string; items: PermissionDefinition[] }> = {
    ORDERS: { label: "📦 Đơn hàng & Pha chế", items: [] },
    MENU: { label: "☕ Thực đơn & Bảng giá", items: [] },
    PROMOTIONS: { label: "🏷️ Khuyến mãi & Voucher", items: [] },
    FINANCE: { label: "💰 Tài chính & Báo cáo", items: [] },
    SYSTEM: { label: "⚙️ Vận hành & Hệ thống", items: [] },
  };

  permissionDefs.forEach((p) => {
    if (categoriesMap[p.category]) {
      categoriesMap[p.category].items.push(p);
    }
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* 1. DEDICATED ADMIN MANAGEMENT HEADER */}
      <AdminManagementHeader
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        productCount={products.length}
      />

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-5">
        {/* Subheader: Store Operation Emergency Toggles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-coffee-100 shadow-sm">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                settings?.storeStatus === "OPEN"
                  ? "bg-emerald-500 animate-pulse"
                  : settings?.storeStatus === "PAUSED"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-stone-400"
              }`}
            />
            <span className="text-xs font-bold text-coffee-900">
              Trạng thái quán:{" "}
              {settings?.storeStatus === "OPEN"
                ? "Đang mở cửa nhận đơn"
                : settings?.storeStatus === "PAUSED"
                ? "Tạm dừng nhận đơn (Cao điểm)"
                : "Quán đang đóng cửa"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {settings?.storeStatus === "OPEN" ? (
              <button
                type="button"
                onClick={() => handleUpdateStoreStatus("PAUSED")}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Tạm dừng nhận đơn cao điểm</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUpdateStoreStatus("OPEN")}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Mở lại nhận đơn</span>
              </button>
            )}
          </div>
        </div>

        {actionMsg && (
        <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-3 rounded-2xl border border-emerald-200 animate-fade-in flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}



      {/* ======================================================================= */}
      {/* TAB 2: QUẢN LÝ THỰC ĐƠN, TOPPING & TÙY CHỌN */}
      {/* ======================================================================= */}
      {activeTab === "MENU" && (() => {
        const sugarOption = options.find((o) => o.id === 1 || o.name.toLowerCase().includes("ngọt") || o.name.toLowerCase().includes("đường")) || options[0];
        const iceOption = options.find((o) => o.id === 2 || o.name.toLowerCase().includes("đá")) || options[1];
        const toppingOption = options.find((o) => o.id === 3 || o.name.toLowerCase().includes("topping")) || options[2];
        const toppingsList = toppingOption?.values || [];
        const sugarList = sugarOption?.values || [];
        const iceList = iceOption?.values || [];

        return (
          <div className="bg-white rounded-3xl p-5 border border-coffee-100 shadow-sm space-y-5 animate-fade-in">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-coffee-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-coffee-900">
                  Quản lý Thực đơn, Topping & Tùy chọn món
                </h2>
                <p className="text-xs text-coffee-500">
                  Toàn quyền chỉnh sửa món, định giá các kích cỡ size, bảng giá topping kèm và cấu hình độ ngọt/đá.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetMenu}
                  className="bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                  title="Khôi phục nguyên bản 5 món theo bảng menu Cà Xòi"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-pink-600" />
                  <span>🐾 Nạp Menu Cà Xòi chuẩn (5 món)</span>
                </button>
                {menuSubTab === "PRODUCTS" && (
                  <button
                    type="button"
                    onClick={handleOpenCreateProduct}
                    className="bg-caramel hover:bg-caramel-dark text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm món mới</span>
                  </button>
                )}
                {menuSubTab === "TOPPINGS" && toppingOption && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddOptionValue(toppingOption.id, "Topping & Kem Béo")}
                    className="bg-caramel hover:bg-caramel-dark text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Topping mới</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tabs Selector */}
            <div className="flex flex-wrap items-center gap-2 border-b border-coffee-100 pb-3">
              <button
                type="button"
                onClick={() => setMenuSubTab("PRODUCTS")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  menuSubTab === "PRODUCTS"
                    ? "bg-caramel text-white shadow-sm"
                    : "bg-coffee-50 hover:bg-coffee-100 text-coffee-700 border border-coffee-200"
                }`}
              >
                <Coffee className="w-4 h-4" />
                <span>☕ 1. Món & Kích Cỡ Size ({products.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMenuSubTab("TOPPINGS")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  menuSubTab === "TOPPINGS"
                    ? "bg-caramel text-white shadow-sm"
                    : "bg-coffee-50 hover:bg-coffee-100 text-coffee-700 border border-coffee-200"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>🍮 2. Bảng Giá Topping & Kem Béo ({toppingsList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMenuSubTab("OPTIONS")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  menuSubTab === "OPTIONS"
                    ? "bg-caramel text-white shadow-sm"
                    : "bg-coffee-50 hover:bg-coffee-100 text-coffee-700 border border-coffee-200"
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>🧊 3. Tùy Chọn Độ Ngọt & Đá</span>
              </button>
            </div>

            {/* SUB-TAB 1: PRODUCTS & SIZES */}
            {menuSubTab === "PRODUCTS" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-coffee-800">
                  <thead className="bg-coffee-50 text-coffee-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-xl">Sản phẩm</th>
                      <th className="py-2.5 px-3">Danh mục</th>
                      <th className="py-2.5 px-3">Giá bán</th>
                      <th className="py-2.5 px-3">Kích cỡ & Phụ thu</th>
                      <th className="py-2.5 px-3">Trạng thái kho</th>
                      <th className="py-2.5 px-3 rounded-r-xl text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coffee-100">
                    {products.map((p) => {
                      const catName = categories.find((c) => c.id === p.categoryId)?.name || (p.categoryId === 2 ? "Kem béo" : "Cà phê");
                      return (
                        <tr key={p.id} className="hover:bg-coffee-50/50 transition-colors">
                          {/* 1. Image + Name & Badges */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-coffee-100 shrink-0 border border-coffee-200">
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80";
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-coffee-400">
                                    <Coffee className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-sm text-coffee-900">{p.name}</span>
                                  {p.isFeatured && (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                      Nổi bật
                                    </span>
                                  )}
                                  {p.tags.includes("BEST_SELLER") && (
                                    <span className="bg-orange-100 text-orange-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                      Best Seller
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-coffee-500 line-clamp-1 mt-0.5">
                                  {p.description}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Category */}
                          <td className="py-3 px-3">
                            <span className="text-[11px] bg-coffee-100/70 text-coffee-700 px-2 py-1 rounded-md font-medium">
                              {catName}
                            </span>
                          </td>

                          {/* 3. Price */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-sm text-coffee-900">
                              {formatVND(p.salePrice ?? p.basePrice)}
                            </div>
                            {p.salePrice && (
                              <span className="text-[10px] text-coffee-400 line-through">
                                Gốc: {formatVND(p.basePrice)}
                              </span>
                            )}
                          </td>

                          {/* 4. Sizes / Variants */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {p.variants.map((v) => (
                                <span
                                  key={v.id}
                                  className="inline-flex items-center gap-1 bg-coffee-50 text-coffee-700 px-2 py-0.5 rounded border border-coffee-200 text-[11px]"
                                >
                                  <span className="font-semibold">{v.sizeName}</span>
                                  {v.extraPrice > 0 ? (
                                    <span className="text-caramel font-bold">
                                      +{formatVND(v.extraPrice)}
                                    </span>
                                  ) : (
                                    <span className="text-coffee-400 text-[10px]">Chuẩn</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* 5. Status */}
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleProduct(p.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shadow-sm ${
                                p.isAvailable
                                  ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                                  : "bg-red-100 hover:bg-red-200 text-red-800"
                              }`}
                              title="Bấm để đổi trạng thái còn hàng / hết hàng tức thì"
                            >
                              {p.isAvailable ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Còn hàng</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="w-3 h-3 text-red-500" />
                                  <span>Tạm hết món</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* 6. Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(p)}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-coffee-800 transition-colors flex items-center gap-1"
                              >
                                <Edit className="w-3.5 h-3.5 text-caramel" />
                                <span>Sửa món</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleProduct(p.id)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                                  p.isAvailable
                                    ? "bg-white text-coffee-600 border-coffee-200 hover:bg-coffee-100"
                                    : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm"
                                }`}
                              >
                                {p.isAvailable ? "Tạm ngưng" : "Bật bán lại"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUB-TAB 2: TOPPINGS & KEM BÉO */}
            {menuSubTab === "TOPPINGS" && (
              <div className="space-y-4">
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-coffee-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-caramel" />
                      <span>Danh Mục Topping & Thêm Kem Béo</span>
                    </h3>
                    <p className="text-xs text-coffee-600">
                      Toàn quyền chỉnh sửa giá bán phụ thu, tên gọi hoặc bổ sung topping mới hiển thị trực tiếp cho khách hàng.
                    </p>
                  </div>
                  {toppingOption && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddOptionValue(toppingOption.id, "Topping & Kem Béo")}
                      className="bg-caramel hover:bg-caramel-dark text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-all flex items-center gap-1.5 active:scale-95 shrink-0 self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Topping Mới</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-coffee-800">
                    <thead className="bg-coffee-50 text-coffee-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 rounded-l-xl">STT</th>
                        <th className="py-2.5 px-3">Tên Topping / Kem béo</th>
                        <th className="py-2.5 px-3">Giá bán phụ thu</th>
                        <th className="py-2.5 px-3">Hình thức chọn</th>
                        <th className="py-2.5 px-3 rounded-r-xl text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-100">
                      {toppingsList.map((val, idx) => (
                        <tr key={val.id} className="hover:bg-coffee-50/50 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-coffee-400">
                            #{idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-sm text-coffee-900">{val.name}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-sm text-caramel bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                              +{formatVND(val.extraPrice)}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                              Chọn nhiều tùy ý (Multiple)
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditOptionValue(val.optionId, "Topping & Kem Béo", val)}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-coffee-800 transition-colors flex items-center gap-1"
                              >
                                <Edit className="w-3.5 h-3.5 text-caramel" />
                                <span>Sửa giá & tên</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOptionValue(val.id, val.name)}
                                className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors flex items-center gap-1"
                                title="Xóa topping này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: ĐỘ NGỌT & ĐÁ */}
            {menuSubTab === "OPTIONS" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Cột 1: ĐỘ NGỌT */}
                  <div className="bg-coffee-50/40 rounded-2xl p-4 border border-coffee-200 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-coffee-200">
                      <div>
                        <h3 className="font-bold text-coffee-900 text-sm flex items-center gap-1.5">
                          <span>🍯</span>
                          <span>Độ Ngọt (Bắt buộc chọn 1)</span>
                        </h3>
                        <p className="text-[11px] text-coffee-500">
                          Tỷ lệ ngọt của món theo chuẩn pha chế
                        </p>
                      </div>
                      {sugarOption && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddOptionValue(sugarOption.id, "Độ Ngọt")}
                          className="bg-coffee-800 hover:bg-coffee-900 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                        >
                          <Plus className="w-3 h-3 text-amber-300" />
                          <span>Thêm mức</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {sugarList.map((val) => (
                        <div
                          key={val.id}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-coffee-100 hover:border-coffee-200 shadow-xs transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="defaultSugarOption"
                              checked={val.isDefault}
                              onChange={() => handleSetDefaultOptionValue(val.id)}
                              className="text-caramel focus:ring-caramel cursor-pointer"
                              title="Bấm để đặt làm độ ngọt mặc định"
                            />
                            <span className="font-bold text-xs text-coffee-800">{val.name}</span>
                            {val.isDefault && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                                Mặc định
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditOptionValue(val.optionId, "Độ Ngọt", val)}
                              className="p-1.5 text-coffee-400 hover:text-caramel hover:bg-coffee-50 rounded-lg transition-colors"
                              title="Chỉnh sửa tên độ ngọt"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOptionValue(val.id, val.name)}
                              className="p-1.5 text-coffee-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa mức ngọt này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cột 2: ĐÁ */}
                  <div className="bg-coffee-50/40 rounded-2xl p-4 border border-coffee-200 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-coffee-200">
                      <div>
                        <h3 className="font-bold text-coffee-900 text-sm flex items-center gap-1.5">
                          <span>❄️</span>
                          <span>Đá (Bắt buộc chọn 1)</span>
                        </h3>
                        <p className="text-[11px] text-coffee-500">
                          Tỷ lệ đá hoặc đóng túi đá riêng khi ship
                        </p>
                      </div>
                      {iceOption && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddOptionValue(iceOption.id, "Đá")}
                          className="bg-coffee-800 hover:bg-coffee-900 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                        >
                          <Plus className="w-3 h-3 text-amber-300" />
                          <span>Thêm mức</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {iceList.map((val) => (
                        <div
                          key={val.id}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-coffee-100 hover:border-coffee-200 shadow-xs transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="defaultIceOption"
                              checked={val.isDefault}
                              onChange={() => handleSetDefaultOptionValue(val.id)}
                              className="text-caramel focus:ring-caramel cursor-pointer"
                              title="Bấm để đặt làm mức đá mặc định"
                            />
                            <span className="font-bold text-xs text-coffee-800">{val.name}</span>
                            {val.isDefault && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                                Mặc định
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditOptionValue(val.optionId, "Đá", val)}
                              className="p-1.5 text-coffee-400 hover:text-caramel hover:bg-coffee-50 rounded-lg transition-colors"
                              title="Chỉnh sửa tên mức đá"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOptionValue(val.id, val.name)}
                              className="p-1.5 text-coffee-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa mức đá này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ======================================================================= */}
      {/* TAB 1: DOANH THU & TỔNG QUAN */}
      {/* ======================================================================= */}
      {activeTab === "DASHBOARD" && (
        <DashboardOverviewManager
          initialStats={stats}
          settings={settings}
          onNavigateToOrders={() => setActiveTab("ORDERS")}
          onNavigateToMenu={() => setActiveTab("MENU")}
        />
      )}

      {/* ======================================================================= */}
      {/* TAB 3: PHÂN QUYỀN TRUY CẬP (RBAC) & QUẢN LÝ NHÂN VIÊN */}
      {/* ======================================================================= */}
      {activeTab === "RBAC" && (
        <div className="space-y-6 animate-fade-in">
          {/* INTRO HERO */}
          <div className="bg-gradient-to-r from-coffee-900 to-coffee-800 rounded-3xl p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-caramel/20 border border-caramel/40 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-amber-300">
                <Shield className="w-3.5 h-3.5" /> Quản Trị Phân Quyền Truy Cập (RBAC)
              </div>
              <h2 className="text-lg font-bold mt-1">
                Ma Trận Cấp Phép & Tài Khoản Nhân Viên
              </h2>
              <p className="text-xs text-coffee-300 mt-0.5">
                Tích chọn để cấp hoặc thu hồi từng quyền hạn cụ thể cho từng vai trò trong hệ thống.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddStaffOpen(true)}
              className="bg-caramel hover:bg-caramel-dark text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm nhân viên mới</span>
            </button>
          </div>

          {/* PERMISSION MATRIX TABLE */}
          <div className="bg-white rounded-3xl p-5 border border-coffee-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-coffee-900">
                  Ma Trận Phân Quyền Chi Tiết (Permission Matrix)
                </h3>
                <p className="text-xs text-coffee-500">
                  Bấm vào ô checkbox để cấp quyền hoặc thu hồi ngay lập tức.
                </p>
              </div>
              {isUpdatingRbac && (
                <span className="text-xs text-caramel font-bold flex items-center gap-1 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang cập nhật quyền...
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-coffee-200 bg-coffee-50 text-coffee-800">
                    <th className="py-3 px-3 rounded-l-xl font-bold">Chức năng / Quyền hạn</th>
                    <th className="py-3 px-3 text-center font-bold">
                      <span className="block text-coffee-900">Chủ quán</span>
                      <span className="text-[10px] text-coffee-500 font-normal">SUPER_ADMIN</span>
                    </th>
                    <th className="py-3 px-3 text-center font-bold">
                      <span className="block text-coffee-900">Cửa hàng trưởng</span>
                      <span className="text-[10px] text-coffee-500 font-normal">STORE_MANAGER</span>
                    </th>
                    <th className="py-3 px-3 text-center font-bold">
                      <span className="block text-coffee-900">Thu ngân</span>
                      <span className="text-[10px] text-coffee-500 font-normal">CASHIER</span>
                    </th>
                    <th className="py-3 px-3 text-center rounded-r-xl font-bold">
                      <span className="block text-coffee-900">Pha chế (KDS)</span>
                      <span className="text-[10px] text-coffee-500 font-normal">BARISTA</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-100">
                  {Object.entries(categoriesMap).map(([catKey, cat]) => (
                    <>
                      {/* Category Header Row */}
                      <tr key={catKey} className="bg-amber-50/50">
                        <td colSpan={5} className="py-2 px-3 font-bold text-coffee-800 text-xs">
                          {cat.label}
                        </td>
                      </tr>

                      {/* Permission Rows */}
                      {cat.items.map((perm) => (
                        <tr key={perm.code} className="hover:bg-coffee-50/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-coffee-900 block">{perm.name}</span>
                            <span className="text-[11px] text-coffee-500 font-mono">
                              {perm.code} • {perm.description}
                            </span>
                          </td>

                          {/* Columns for each role */}
                          {roleConfigs.map((role) => {
                            const isGranted = role.permissions.includes(perm.code);
                            const isSuperAdmin = role.roleId === "SUPER_ADMIN";

                            return (
                              <td key={role.roleId} className="py-2.5 px-3 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isGranted}
                                    disabled={isSuperAdmin}
                                    onChange={() => handleTogglePermission(role.roleId, perm.code)}
                                    className={`w-4 h-4 rounded text-caramel focus:ring-caramel/40 cursor-pointer ${
                                      isSuperAdmin ? "opacity-70 cursor-not-allowed" : ""
                                    }`}
                                  />
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ACTIVE GMAIL & PERMISSION SUMMARY CARD (DYNAMICALLY READ FROM SQLITE STAFFLIST) */}
          {(() => {
            const activeStaffWithEmail = staffList.filter(
              (s) => s.isActive && s.email && s.email.trim().length > 0
            );
            const groupedByEmail = activeStaffWithEmail.reduce<Record<string, StaffAccount[]>>(
              (acc, staff) => {
                const emailKey = staff.email!.trim().toLowerCase();
                if (!acc[emailKey]) acc[emailKey] = [];
                acc[emailKey].push(staff);
                return acc;
              },
              {}
            );
            const emailEntries = Object.entries(groupedByEmail);

            return (
              <div className="bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 rounded-3xl p-5 border border-amber-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-coffee-900 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-caramel" />
                      <span>Danh Sách Gmail Đang Hoạt Động & Phân Quyền Nhận Thông Báo</span>
                    </h3>
                    <p className="text-xs text-coffee-600 mt-0.5">
                      Tổng hợp các địa chỉ Gmail đang kích hoạt trong CSDL để nhận thông báo đơn hàng tự động theo vai trò.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {emailEntries.length > 0 && isEmailConfigured ? (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Đang Nhận Đơn Tự Động ({emailEntries.length} email)</span>
                      </span>
                    ) : (
                      <span className="bg-stone-100 text-stone-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-stone-200">
                        <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                        <span>Chưa có Gmail kích hoạt</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* List of active Gmail groups */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {emailEntries.length > 0 ? (
                    <div className="space-y-3">
                      {emailEntries.map(([emailAddr, members]) => (
                        <div key={emailAddr} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-coffee-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-caramel">
                                <Mail className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-sm font-mono text-coffee-900">{emailAddr}</div>
                                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  <span>Đã gán cho {members.length} tài khoản nhân sự</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            {members.map((m) => (
                              <div
                                key={m.id}
                                className="p-2.5 bg-coffee-50/60 rounded-xl border border-coffee-100 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-coffee-900">{m.fullName}</span>
                                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">
                                    {m.role}
                                  </span>
                                  {m.pin && (
                                    <span className="text-[10px] font-mono bg-white text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                      PIN: {m.pin}
                                    </span>
                                  )}
                                </div>
                                <span className="text-emerald-600 font-bold text-[10px] shrink-0 bg-emerald-50 px-2 py-0.5 rounded">
                                  Nhận Mail Đơn
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-6 border border-dashed border-coffee-200 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-coffee-50 text-coffee-400 flex items-center justify-center">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-sm text-coffee-800">Chưa có địa chỉ Gmail nào được gán</div>
                      <p className="text-xs text-coffee-500 max-w-sm">
                        Tất cả dữ liệu Gmail cá nhân đã được xóa sạch. Bạn có thể bấm nút <strong>Sửa</strong> ở bảng nhân viên bên dưới và cấu hình SMTP khi cần sử dụng.
                      </p>
                    </div>
                  )}

                  {/* Box 2: Thông tin cấu hình kỹ thuật & Luồng gửi tự động */}
                  <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-coffee-100 pb-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-coffee-900">Quy Trình Gửi Mail Thông Báo Tự Động</div>
                          <div className="text-[10px] text-coffee-500">Chuẩn bảo mật SSL/TLS qua cổng Google SMTP 465</div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-coffee-700">
                        <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                          <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>1. Khách đặt đơn thành công</span>
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            Hệ thống tự động kích hoạt tiến trình gửi email ngầm bất đồng bộ, không làm trễ tốc độ phản hồi của khách hàng.
                          </p>
                        </div>

                        <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60">
                          <div className="font-bold text-coffee-900 flex items-center gap-1.5 mb-1">
                            <Send className="w-3.5 h-3.5 text-caramel" />
                            <span>2. Gửi thư đồng thời tới các Gmail kích hoạt</span>
                          </div>
                          <p className="text-[11px] text-coffee-700">
                            Chủ quán &amp; Barista cùng nhận 1 email đầy đủ: Mã đơn, Khách hàng, SĐT bấm gọi ngay, Địa chỉ, Danh sách đồ uống (Độ ngọt, Đá, Topping, Ghi chú in tem ly).
                          </p>
                        </div>

                        <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/60">
                          <div className="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                            <Key className="w-3.5 h-3.5 text-blue-600" />
                            <span>3. Nút bấm thao tác nhanh ngay trong email</span>
                          </div>
                          <p className="text-[11px] text-blue-800">
                            Email có 2 nút bấm tiện ích: <strong>[☕ Mở KDS Pha Chế]</strong> và <strong>[📋 Quản Trị Đơn Hàng]</strong> để mở thẳng hệ thống chỉ với 1 chạm trên điện thoại.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-coffee-100 flex items-center justify-between text-[11px] text-coffee-500">
                      <span>💡 Muốn thêm hoặc đổi Gmail nhận tin: Bấm nút <strong>Sửa</strong> ở bảng nhân viên bên dưới.</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* STAFF ACCOUNTS LIST */}
          <div className="bg-white rounded-3xl p-5 border border-coffee-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-coffee-900">
                  Danh Sách Nhân Viên, Gmail Nhận Đơn & Mã PIN Quầy Bar
                </h3>
                <p className="text-xs text-coffee-500">
                  Cấu hình vai trò, Gmail nhận thông báo đơn hàng và mã PIN mở khóa màn hình KDS cho nhân viên pha chế.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(true)}
                className="bg-caramel hover:bg-caramel-dark text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm nhân viên mới</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-coffee-800">
                <thead className="bg-coffee-50 text-coffee-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-xl">Họ và tên / Username</th>
                    <th className="py-2.5 px-3">Vai trò</th>
                    <th className="py-2.5 px-3">Số điện thoại</th>
                    <th className="py-2.5 px-3">Gmail Nhận Đơn</th>
                    <th className="py-2.5 px-3">Mã PIN KDS</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3 rounded-r-xl text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-100">
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-coffee-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-coffee-900 block">{staff.fullName}</span>
                        <span className="text-[11px] text-coffee-500 font-mono">@{staff.username}</span>
                      </td>

                      <td className="py-3 px-3">
                        <select
                          value={staff.role}
                          disabled={currentUser?.role !== "SUPER_ADMIN" && staff.role === "SUPER_ADMIN"}
                          onChange={(e) =>
                            handleUpdateStaff(staff.id, { role: e.target.value as any })
                          }
                          className="text-xs font-semibold px-2 py-1 rounded-lg border border-coffee-200 bg-white focus:outline-none focus:ring-1 focus:ring-caramel disabled:bg-coffee-50 disabled:opacity-60"
                        >
                          <option value="SUPER_ADMIN">SUPER_ADMIN (Chủ quán)</option>
                          <option value="STORE_MANAGER">STORE_MANAGER (Quản lý)</option>
                          <option value="CASHIER">CASHIER (Thu ngân)</option>
                          <option value="BARISTA">BARISTA (Pha chế)</option>
                        </select>
                      </td>

                      <td className="py-3 px-3 font-mono text-coffee-600">
                        {staff.phone || "---"}
                      </td>

                      <td className="py-3 px-3">
                        {staff.email ? (
                          <div className="flex items-center gap-1.5 text-coffee-800">
                            <Mail className="w-3.5 h-3.5 text-caramel shrink-0" />
                            <span className="font-mono text-xs font-semibold text-coffee-800 truncate max-w-[200px]" title={staff.email}>
                              {staff.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-coffee-400 text-[11px] italic">Chưa cài đặt</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {staff.role === "BARISTA" || staff.role === "CASHIER" ? (
                          <div className="flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-caramel" />
                            <span className="font-mono font-bold text-sm bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {staff.pin || "Chưa cấp"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-coffee-400">Dùng Mật khẩu</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            staff.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {staff.isActive ? "Đang hoạt động" : "Đã khóa"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút Khóa / Mở khóa */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStaff(staff.id, { isActive: !staff.isActive })
                            }
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                              staff.isActive
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                            }`}
                            title={staff.isActive ? "Tạm khóa tài khoản" : "Mở khóa tài khoản"}
                          >
                            {staff.isActive ? "Khóa" : "Mở khóa"}
                          </button>

                          {/* Nút Chỉnh sửa tài khoản */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(staff)}
                            className="p-1 text-coffee-600 hover:text-caramel hover:bg-amber-50 rounded-lg border border-coffee-200 transition-colors"
                            title="Chỉnh sửa thông tin / Đổi mật khẩu"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Xóa tài khoản */}
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staff)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                            title="Xóa vĩnh viễn tài khoản"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* EMAIL NOTIFICATION STATUS, CONFIG FORM (FOR .ENV) & TESTING */}
          <div className="bg-gradient-to-br from-amber-50/70 to-coffee-50/50 rounded-3xl p-6 border border-amber-200/70 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-coffee-200/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-caramel shrink-0 shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-coffee-900 flex items-center gap-2">
                    <span>Cấu Hình Gmail Gửi Thông Báo (Tự động cập nhật file .env)</span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isEmailConfigured
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {isEmailConfigured ? "🟢 Đang kích hoạt" : "🟡 Chưa kích hoạt"}
                    </span>
                  </h3>
                  <p className="text-xs text-coffee-600 mt-0.5">
                    Hệ thống dùng tài khoản này để gửi email chi tiết từng ly (đường, đá, topping, ghi chú) về cho Chủ quán & Barista ngay khi có đơn mới.
                  </p>
                </div>
              </div>
            </div>

            {/* FORM ĐĂNG KÝ / CẬP NHẬT CẤU HÌNH MAIL CHO FILE .ENV */}
            <form onSubmit={handleSaveEmailConfig} className="bg-white p-5 rounded-2xl border border-coffee-200/70 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-coffee-100 pb-2">
                <span className="font-bold text-coffee-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-caramel" />
                  <span>Thông Tin Tài Khoản Google Gmail (.env)</span>
                </span>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-caramel hover:text-caramel-dark font-semibold underline"
                >
                  <span>Lấy mật khẩu ứng dụng Google 16 ký tự</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SMTP_USER */}
                <div>
                  <label className="block font-bold text-coffee-700 mb-1">
                    Gmail gửi thư (SMTP_USER) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-coffee-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="VD: email-quan@gmail.com"
                      value={smtpUserConfig}
                      onChange={(e) => setSmtpUserConfig(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 bg-coffee-50/30 font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-coffee-500 mt-1">
                    Địa chỉ Gmail dùng để phát thư tự động.
                  </p>
                </div>

                {/* SMTP_PASS */}
                <div>
                  <label className="block font-bold text-coffee-700 mb-1">
                    Mật khẩu ứng dụng 16 ký tự (SMTP_PASS) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-coffee-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showSmtpPass ? "text" : "password"}
                      required
                      placeholder="VD: xxxx xxxx xxxx xxxx"
                      value={smtpPassConfig}
                      onChange={(e) => setSmtpPassConfig(e.target.value)}
                      className="w-full text-xs pl-9 pr-9 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 bg-coffee-50/30 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-700"
                    >
                      {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-coffee-500 mt-1">
                    Tạo tại Google Account &gt; Bảo mật &gt; Xác minh 2 bước &gt; Mật khẩu ứng dụng.
                  </p>
                </div>

                {/* SMTP_FROM */}
                <div className="md:col-span-2">
                  <label className="block font-bold text-coffee-700 mb-1">
                    Tên thương hiệu hiển thị khi gửi thư (SMTP_FROM)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Cà Xòi Coffee & Tea ☕"
                    value={smtpFromConfig}
                    onChange={(e) => setSmtpFromConfig(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 bg-coffee-50/30"
                  />
                </div>
              </div>

              {emailConfigMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    emailConfigMsg.success
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {emailConfigMsg.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{emailConfigMsg.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSavingEmailConfig}
                  className="bg-caramel hover:bg-caramel-dark text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingEmailConfig ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu vào file .env...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu Cấu Hình Vào File .env</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* FORM GỬI THỬ NGHIỆM */}
            <div className="bg-white/80 p-5 rounded-2xl border border-coffee-200/70 shadow-sm space-y-3">
              <div className="text-[11px] font-bold text-coffee-800 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-caramel" />
                <span>Kiểm Tra Kết Nối & Gửi Thư Thử Nghiệm</span>
              </div>

              <form onSubmit={handleTestEmail} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-coffee-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="Nhập địa chỉ Gmail để gửi thử nghiệm (VD: your-email@gmail.com)"
                    value={testEmailTarget}
                    onChange={(e) => setTestEmailTarget(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTestingEmail}
                  className="bg-coffee-800 hover:bg-coffee-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {isTestingEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi thử...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi Thử Nghiệm</span>
                    </>
                  )}
                </button>
              </form>

              {testEmailResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    testEmailResult.success
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {testEmailResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{testEmailResult.message}</span>
                </div>
              )}
            </div>

            <div className="bg-white/90 p-3.5 rounded-2xl border border-coffee-100 text-[11px] text-coffee-600 space-y-1">
              <p>
                <strong>💡 Lưu ý quan trọng:</strong> Khi bạn lưu ở form trên, hệ thống sẽ <strong>tự động cập nhật trực tiếp vào file <code>.env</code></strong> và nạp lại cấu hình tức thì mà không cần khởi động lại máy chủ!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 4: VẬN HÀNH & CẤU HÌNH NGÂN HÀNG */}
      {/* ======================================================================= */}
      {activeTab === "SETTINGS" && settings && (
        <div className="animate-fade-in">
          <OperatingAndVietQrSettings
            initialSettings={settings}
            onSettingsUpdated={(updated) => setSettings(updated)}
            onShowMessage={(msg) => {
              setActionMsg(msg);
              setTimeout(() => setActionMsg(""), 3500);
            }}
          />
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 5: QUẢN TRỊ CƠ SỞ DỮ LIỆU PHPMYADMIN / MYSQL */}
      {/* ======================================================================= */}
      {activeTab === "DATABASE" && (
        <div className="animate-fade-in">
          <DatabaseManager />
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 6: QUẢN TRỊ KHUYẾN MÃI & VOUCHER */}
      {/* ======================================================================= */}
      {activeTab === "PROMOTIONS" && (
        <div className="animate-fade-in">
          <PromotionManager
            currentUser={currentUser}
            onShowMessage={(msg) => {
              setActionMsg(msg);
              setTimeout(() => setActionMsg(""), 3500);
            }}
          />
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 7: QUẢN LÝ LỊCH SỬ ĐƠN HÀNG & TRẠNG THÁI VẬN CHUYỂN */}
      {/* ======================================================================= */}
      {activeTab === "ORDERS" && (
        <div className="animate-fade-in">
          <OrderHistoryManager currentUser={currentUser} />
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: CHỈNH SỬA MÓN (TÊN, GIÁ, KÍCH CỠ & TRẠNG THÁI) */}
      {/* ======================================================================= */}
      {isEditProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-coffee-100 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
              <div>
                <h3 className="font-bold text-coffee-900 text-base flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-caramel" />
                  <span>{isCreateProductMode ? "Thêm Món Mới Vào Thực Đơn" : `Chỉnh Sửa Món: ${productForm.name}`}</span>
                </h3>
                <p className="text-xs text-coffee-500">
                  Cập nhật tên, giá bán cơ bản, các kích cỡ (size) và trạng thái kinh doanh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProductOpen(false)}
                className="text-coffee-400 hover:text-coffee-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* 1. Tên món & Mô tả */}
              <div className="space-y-2">
                <div>
                  <label className="block font-bold text-coffee-800 mb-1">
                    Tên món đồ uống / bánh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cà Phê Muối Kem Béo"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  />
                </div>

                <div>
                  <label className="block font-bold text-coffee-800 mb-1">
                    Mô tả ngắn thành phần / hương vị
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Cà phê phin Robusta Đắk Lắk kết hợp lớp kem mặn béo ngậy..."
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  />
                </div>

                {/* Danh mục & Thời gian pha chế */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-coffee-800 mb-1">
                      Nhóm danh mục <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={productForm.categoryId}
                      onChange={(e) =>
                        setProductForm({ ...productForm, categoryId: Number(e.target.value) })
                      }
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-coffee-200 bg-white focus:outline-none focus:ring-2 focus:ring-caramel/40"
                    >
                      {categories.length > 0 ? (
                        categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value={1}>Cà phê truyền thống & Chai rót</option>
                          <option value={2}>Dòng kem trứng muối & kem muối Huế</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-coffee-800 mb-1">
                      Thời gian pha chế (phút)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={productForm.prepTimeMinutes}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          prepTimeMinutes: Number(e.target.value) || 4,
                        })
                      }
                      className="w-full font-mono text-xs px-3 py-2.5 rounded-xl border border-coffee-200 bg-white focus:outline-none focus:ring-2 focus:ring-caramel/40"
                    />
                  </div>
                </div>

                {/* Link hình ảnh món */}
                <div>
                  <label className="block font-bold text-coffee-800 mb-1">
                    Link hình ảnh món (URL)
                  </label>
                  <div className="flex gap-2.5 items-center">
                    <div className="w-12 h-12 rounded-xl border border-coffee-200 overflow-hidden shrink-0 bg-coffee-50 flex items-center justify-center">
                      {productForm.imageUrl ? (
                        <img
                          src={productForm.imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80";
                          }}
                        />
                      ) : (
                        <Coffee className="w-5 h-5 text-coffee-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={productForm.imageUrl}
                        onChange={(e) =>
                          setProductForm({ ...productForm, imageUrl: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Giá bán cơ bản & Giá khuyến mãi */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-coffee-50/70 rounded-2xl border border-coffee-200">
                <div>
                  <label className="block font-bold text-coffee-800 mb-1">
                    Giá bán gốc (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={productForm.basePrice}
                    onChange={(e) =>
                      setProductForm({ ...productForm, basePrice: Number(e.target.value) })
                    }
                    className="w-full font-mono font-bold text-sm px-3 py-2 rounded-xl border border-coffee-200 bg-white focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  />
                </div>

                <div>
                  <label className="block font-bold text-coffee-800 mb-1">
                    Giá khuyến mãi (VNĐ - Tùy chọn)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="Để trống nếu không giảm"
                    value={productForm.salePrice ?? ""}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        salePrice: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-coffee-200 bg-white focus:outline-none focus:ring-2 focus:ring-caramel/40 text-caramel font-bold"
                  />
                </div>
              </div>

              {/* 3. Cập nhật Trạng thái kinh doanh */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                <label className="block font-bold text-coffee-800">
                  Cập nhật trạng thái kinh doanh:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, isAvailable: true })}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      productForm.isAvailable
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-coffee-600 border-coffee-200"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Còn hàng (Mở bán)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, isAvailable: false })}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      !productForm.isAvailable
                        ? "bg-red-600 text-white border-red-600 shadow-sm"
                        : "bg-white text-coffee-600 border-coffee-200"
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Tạm hết món (Ngừng bán)</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
                  <span className="font-semibold text-coffee-700">Món nổi bật trang chủ (Featured):</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.isFeatured}
                      onChange={(e) =>
                        setProductForm({ ...productForm, isFeatured: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-coffee-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-coffee-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-caramel"></div>
                  </label>
                </div>
              </div>

              {/* 4. Quản lý Kích cỡ Size & Phụ thu */}
              <div className="space-y-2 border border-coffee-200 rounded-2xl p-3 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-coffee-800">
                      Cấu hình Kích cỡ Size & Phụ thu
                    </label>
                    <span className="text-[10px] text-coffee-500">
                      Chỉnh sửa tên size, giá phụ thu so với giá gốc, hoặc thêm kích cỡ mới
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-[11px] font-bold text-caramel hover:text-caramel-dark bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm Size</span>
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  {productForm.variants.map((v, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-coffee-50 rounded-xl border border-coffee-200"
                    >
                      {/* Size Name */}
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          value={v.sizeName}
                          onChange={(e) =>
                            handleUpdateVariant(idx, "sizeName", e.target.value)
                          }
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-coffee-200 bg-white focus:outline-none focus:ring-1 focus:ring-caramel"
                          placeholder="Tên size (VD: M - 500ml)"
                        />
                      </div>

                      {/* Extra Price */}
                      <div className="w-28 flex items-center gap-1">
                        <span className="text-[10px] text-coffee-500 font-bold">+</span>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={v.extraPrice}
                          onChange={(e) =>
                            handleUpdateVariant(idx, "extraPrice", Number(e.target.value))
                          }
                          className="w-full text-xs font-mono font-bold px-2 py-1.5 rounded-lg border border-coffee-200 bg-white focus:outline-none focus:ring-1 focus:ring-caramel text-right"
                          placeholder="Phụ thu (đ)"
                        />
                      </div>

                      {/* Default Radio */}
                      <label
                        className="flex items-center gap-1 text-[10px] text-coffee-600 cursor-pointer shrink-0"
                        title="Chọn kích cỡ mặc định khi khách mở món"
                      >
                        <input
                          type="radio"
                          name="defaultVariant"
                          checked={v.isDefault}
                          onChange={() => handleUpdateVariant(idx, "isDefault", true)}
                          className="text-caramel focus:ring-caramel"
                        />
                        <span>Mặc định</span>
                      </label>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        disabled={productForm.variants.length <= 1}
                        className="text-coffee-400 hover:text-red-500 p-1 disabled:opacity-20"
                        title="Xóa kích cỡ này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-coffee-100 flex items-center justify-between gap-2">
                {!isCreateProductMode && editingProductId ? (
                  <button
                    type="button"
                    onClick={handleDeleteProduct}
                    className="px-3.5 py-2 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa món này</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditProductOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-600 hover:bg-coffee-50 font-semibold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="bg-coffee-800 hover:bg-coffee-900 text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Save className="w-4 h-4 text-amber-300" />
                    <span>{isCreateProductMode ? "Thêm món vào menu" : "Lưu thay đổi món"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: THÊM / CHỈNH SỬA TÙY CHỌN (TOPPING, MỨC ĐƯỜNG, MỨC ĐÁ) */}
      {/* ======================================================================= */}
      {isOptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-coffee-100 flex flex-col">
            <div className="flex items-center justify-between border-b border-coffee-100 pb-3">
              <div>
                <h3 className="font-bold text-coffee-900 text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-caramel" />
                  <span>
                    {optionModalTarget.mode === "CREATE"
                      ? `Thêm ${optionModalTarget.optionTitle} Mới`
                      : `Chỉnh Sửa: ${optionModalTarget.optionTitle}`}
                  </span>
                </h3>
                <p className="text-xs text-coffee-500">
                  Cập nhật tên hiển thị, giá phụ thu và tùy chọn mặc định
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOptionModalOpen(false)}
                className="text-coffee-400 hover:text-coffee-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOptionValue} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-coffee-800 mb-1">
                  Tên tùy chọn / Topping <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    optionModalTarget.optionId === 3
                      ? "VD: Thêm lớp Kem Trứng Muối béo ngậy"
                      : "VD: 70% Đường hoặc Ít đá"
                  }
                  value={optionModalTarget.name}
                  onChange={(e) =>
                    setOptionModalTarget({ ...optionModalTarget, name: e.target.value })
                  }
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                />
              </div>

              <div>
                <label className="block font-bold text-coffee-800 mb-1">
                  Giá phụ thu thêm (VNĐ)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={optionModalTarget.extraPrice}
                  onChange={(e) =>
                    setOptionModalTarget({
                      ...optionModalTarget,
                      extraPrice: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full font-mono font-bold text-sm px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 text-caramel"
                />
                <p className="text-[10px] text-coffee-400 mt-1">
                  {optionModalTarget.optionId === 3
                    ? "Giá phụ thu khi khách chọn thêm topping này (VD: 8000, 10000)"
                    : "Độ ngọt / đá thông thường là 0đ"}
                </p>
              </div>

              {optionModalTarget.optionId !== 3 && (
                <div className="flex items-center gap-2 pt-2 border-t border-coffee-100">
                  <input
                    type="checkbox"
                    id="isDefaultOptVal"
                    checked={optionModalTarget.isDefault}
                    onChange={(e) =>
                      setOptionModalTarget({
                        ...optionModalTarget,
                        isDefault: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-caramel rounded focus:ring-caramel cursor-pointer"
                  />
                  <label htmlFor="isDefaultOptVal" className="font-semibold text-coffee-700 cursor-pointer">
                    Đặt làm lựa chọn mặc định khi khách mở món
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-coffee-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOptionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-600 hover:bg-coffee-50 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="bg-coffee-800 hover:bg-coffee-900 text-white font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>Lưu tùy chọn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM NHÂN VIÊN MỚI */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-coffee-100">
            <div className="flex items-center justify-between border-b border-coffee-100 pb-2">
              <h3 className="font-bold text-coffee-900 text-base">Tạo Tài Khoản Nhân Viên Mới</h3>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="text-coffee-400 hover:text-coffee-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-coffee-700 mb-1">
                  Họ và tên nhân viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn Pha Chế"
                  value={newStaffFullName}
                  onChange={(e) => setNewStaffFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                />
              </div>

              <div>
                <label className="block font-bold text-coffee-700 mb-1">
                  Tên đăng nhập <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: barista2"
                  value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-coffee-700 mb-1">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-coffee-200 bg-white focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Chủ quán)</option>
                    <option value="STORE_MANAGER">STORE_MANAGER (Quản lý)</option>
                    <option value="CASHIER">CASHIER (Thu ngân)</option>
                    <option value="BARISTA">BARISTA (Pha chế)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-coffee-700 mb-1">Mã PIN KDS (Pha chế/Thu ngân)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="VD: 5588"
                    value={newStaffPin}
                    onChange={(e) => setNewStaffPin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-coffee-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="VD: 0912345678"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  />
                </div>

                <div>
                  <label className="block font-bold text-coffee-700 mb-1">Mật khẩu đăng nhập</label>
                  <input
                    type="text"
                    placeholder="Mặc định: Caxoi@123"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-coffee-700 mb-1">
                  Gmail nhận thông báo đơn hàng
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-coffee-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="VD: nhanvien@gmail.com"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  />
                </div>
                <p className="text-[10px] text-coffee-500 mt-1">
                  💡 Tự động nhận email công thức pha chế ngay khi có khách đặt đơn.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-xl border border-coffee-200 text-coffee-600 hover:bg-coffee-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-coffee-800 hover:bg-coffee-900 text-white font-bold px-4 py-2 rounded-xl shadow"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-coffee-100">
            <div className="flex items-center justify-between border-b border-coffee-100 pb-2">
              <div>
                <h3 className="font-bold text-coffee-900 text-base">Chỉnh Sửa Tài Khoản</h3>
                <span className="text-[11px] text-coffee-500 font-mono">@{editingStaff.username}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-coffee-400 hover:text-coffee-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-coffee-700 mb-1">
                  Họ và tên nhân viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={editStaffFullName}
                  onChange={(e) => setEditStaffFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-coffee-700 mb-1">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editStaffRole}
                    onChange={(e) => setEditStaffRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-coffee-200 bg-white focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Chủ quán)</option>
                    <option value="STORE_MANAGER">STORE_MANAGER (Quản lý)</option>
                    <option value="CASHIER">CASHIER (Thu ngân)</option>
                    <option value="BARISTA">BARISTA (Pha chế)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-coffee-700 mb-1">Mã PIN KDS (4 số)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="VD: 8823"
                    value={editStaffPin}
                    onChange={(e) => setEditStaffPin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-coffee-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="VD: 0905112233"
                  value={editStaffPhone}
                  onChange={(e) => setEditStaffPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                />
              </div>

              <div>
                <label className="block font-bold text-coffee-700 mb-1">
                  Gmail nhận thông báo đơn hàng
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-coffee-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="VD: quanly@gmail.com"
                    value={editStaffEmail}
                    onChange={(e) => setEditStaffEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40"
                  />
                </div>
                <p className="text-[10px] text-coffee-500 mt-1">
                  💡 Nhận email tự động chứa công thức từng ly (đường, đá, topping, ghi chú) ngay khi có khách đặt đơn.
                </p>
              </div>

              <div>
                <label className="block font-bold text-coffee-700 mb-1">
                  Mật khẩu mới (Bỏ trống nếu không muốn đổi)
                </label>
                <input
                  type="text"
                  placeholder="Nhập mật khẩu mới..."
                  value={editStaffPassword}
                  onChange={(e) => setEditStaffPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-caramel/40 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-coffee-100">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = editingStaff;
                    setEditingStaff(null);
                    handleDeleteStaff(toDelete);
                  }}
                  className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa tài khoản</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="px-4 py-2 rounded-xl border border-coffee-200 text-coffee-600 hover:bg-coffee-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="bg-caramel hover:bg-caramel-dark text-white font-bold px-4 py-2 rounded-xl shadow"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
