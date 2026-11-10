import { NextResponse } from "next/server";
import {
  getRolesAndPermissionsFromSqlite,
  toggleRolePermissionInSqlite,
  updateStaffInSqlite,
  createStaffInSqlite,
  deleteStaffInSqlite,
} from "@/lib/sqlite";

export const dynamic = "force-dynamic";

export async function GET() {
  const rbacData = getRolesAndPermissionsFromSqlite();
  return NextResponse.json({
    success: true,
    data: rbacData,
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. Toggle or update permission for a role in SQLite
    if (action === "TOGGLE_ROLE_PERMISSION") {
      const { roleId, permissionCode } = body;

      const result = toggleRolePermissionInSqlite(roleId, permissionCode);
      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 }
        );
      }

      const rbacData = getRolesAndPermissionsFromSqlite();
      const updatedRole = rbacData.roles.find((r) => r.roleId === roleId);

      return NextResponse.json({
        success: true,
        message: result.message,
        data: updatedRole,
      });
    }

    // 2. Update staff user details (FullName, Role, PIN, Status, Phone, Email, Password) in SQLite
    if (action === "UPDATE_STAFF") {
      const { staffId, fullName, role, pin, isActive, phone, email, password } = body;

      const success = updateStaffInSqlite(staffId, { fullName, role, pin, isActive, phone, email, password });
      if (!success) {
        return NextResponse.json(
          { success: false, message: "Lỗi cập nhật nhân viên trong SQLite" },
          { status: 500 }
        );
      }

      const rbacData = getRolesAndPermissionsFromSqlite();
      const updatedStaff = rbacData.staff.find((s) => s.id === staffId);

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật thông tin nhân viên thành công!`,
        data: updatedStaff,
      });
    }

    // 3. Delete staff member from SQLite
    if (action === "DELETE_STAFF") {
      const { staffId } = body;
      if (!staffId) {
        return NextResponse.json({ success: false, message: "Thiếu mã tài khoản nhân viên." }, { status: 400 });
      }

      const result = deleteStaffInSqlite(staffId);
      if (!result.success) {
        return NextResponse.json({ success: false, message: result.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: result.message,
      });
    }

    // 4. Create new staff member in SQLite
    if (action === "CREATE_STAFF") {
      const { username, fullName, role, phone, email, pin, password } = body;

      if (!username || !fullName || !role) {
        return NextResponse.json(
          { success: false, message: "Vui lòng điền đầy đủ tên đăng nhập, họ tên và vai trò." },
          { status: 400 }
        );
      }

      const rbacData = getRolesAndPermissionsFromSqlite();
      if (rbacData.staff.some((s) => s.username.toLowerCase() === username.toLowerCase())) {
        return NextResponse.json(
          { success: false, message: "Tên đăng nhập này đã tồn tại trong CSDL SQLite." },
          { status: 400 }
        );
      }

      const success = createStaffInSqlite({
        username,
        fullName,
        role,
        phone,
        email,
        pin,
        password,
      });

      if (!success) {
        return NextResponse.json(
          { success: false, message: "Lỗi tạo tài khoản nhân viên trong SQLite" },
          { status: 500 }
        );
      }

      const updatedRbac = getRolesAndPermissionsFromSqlite();
      const newStaff = updatedRbac.staff.find((s) => s.username.toLowerCase() === username.toLowerCase());

      return NextResponse.json({
        success: true,
        message: `Đã tạo tài khoản nhân viên "${fullName}" vào SQLite thành công!`,
        data: newStaff,
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi cập nhật phân quyền" },
      { status: 500 }
    );
  }
}
