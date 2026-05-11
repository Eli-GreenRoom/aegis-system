"use client";

import type { PermissionKey, PermissionMap } from "@/lib/permissions";

interface PermissionGateProps {
  permissions: PermissionMap;
  require: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  permissions,
  require: key,
  children,
  fallback = null,
}: PermissionGateProps) {
  if (permissions[key]) return <>{children}</>;
  return <>{fallback}</>;
}
