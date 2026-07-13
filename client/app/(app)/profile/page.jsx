'use client';

import EmployeeProfileView from '@/components/EmployeeProfileView';
import { useAuth } from '@/components/AuthProvider';
import { Skeleton } from '@/components/ui';

// "My Profile" — the logged-in user's own profile, same layout as /employees/[id].
export default function MyProfilePage() {
  const { user, ready } = useAuth();
  if (!ready || !user) return <Skeleton className="h-96" />;
  return <EmployeeProfileView employeeId={user.employee_id} />;
}
